// Netlify Function: per-tenant CONTACT ENRICHMENT capture — what a phone pass actually produces
// (Rick, 2026-08-03 feedback: "how will we track phone call notes and fill in the enrichment so
// that it uploads to HubSpot?").
//
// WHY THIS IS A STORE AND NOT A HUBSPOT WRITE. A phone pass produces facts the moment they are
// spoken, and HubSpot is the CRM of record — so capture lands here first, unconditionally, and
// promotion to HubSpot is a separate, deliberate step. This store is the capture buffer, not a
// dead end.
//
// CORRECTED 2026-09-25 — this comment previously said "There is no write scope anywhere in this
// codebase" and that an outcome "CANNOT go straight back to HubSpot today." Both were true when
// written and became false on 2026-08-16, when netlify/functions/crm-push.js shipped. That
// function IS the live write path: it requires `crm.objects.contacts.write` on the private app,
// dry-runs by default, accepts only CLEARED rows (email AND buyer name), and resolves companies
// domain-first with an unambiguous-name fallback. Reached from pushToHubspot() in
// src/lib/campaigns.js and the PushDialog in campaign-detail.jsx.
//
// So there are now TWO exits from this store, and the CSV is the fallback, not the only door:
//   1. LIVE PUSH — crm-push.js, dry-run then commit. Preferred.
//   2. CSV — enrichmentCsv() in src/lib/campaigns.js, HubSpot-import shaped. Use when the write
//      scope is missing or a human wants to eyeball the batch in a spreadsheet first.
// If you are about to tell Rick to export a CSV by hand, check the push path first.
//
// Distinct from crm-outreach.js on purpose: that store is the OUTREACH PIPELINE overlay
// ({status, note} per company, and its sanitizer drops anything else). Enrichment captures
// different facts — the buyer name and email that were MISSING, plus the call outcome — so it
// gets its own shape rather than bending the outreach schema around a second job.
//
// GET  ?tenant=<id>          → { entries, byCampaign, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }   → { ok, updatedAt }                    (house/client-admin passcode)
//
//   byCampaign = { [campaignId]: { [companyId]: rec } }  ← the authoritative store, 2026-09-26.
//     One row per company PER CAMPAIGN. Rows with no campaignId live under "_shared".
//     See the "Campaign scoping" block below for why this exists and what it fixed.
//   entries    = { [companyId]: rec }                    ← the flat latest-wins view, derived.
//     Unchanged meaning and unchanged contract: exactly what every existing reader already uses.
//     Still written on every save. Do NOT add new readers of this — use byCampaign.
//
//   rec = { buyer, title, email, phone, instagram, outcome, note, calledAt,
//           contactRole, relationship, territory[],   ← people-spine, 2026-09-26. STAGED ONLY:
//             HubSpot owns these; crm-push promotes them. Validated against the shared
//             vocabularies in src/lib/people-fields.js, so an invalid value is dropped here
//             rather than failing a batch push later.
//                               campaignId, street, city, state, zip, addressVerifiedAt,
//                               addressVerdict, notes[] } }
//   note   = the LATEST call note (unchanged contract — every existing reader still uses this).
//   notes[] = the call-note HISTORY, { at, text, campaignId?, outcome? }, appended SERVER-SIDE
//             and capped at the newest 25. Clients do not send it; see the block below.
//   street/city/state/zip (2026-09-21, docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md): what a
//   rep captures/corrects in the call console, same relationship to HubSpot's read-only
//   address/city/state/zip as buyer/email are to HubSpot's owner/ownerEmail. addressVerifiedAt +
//   addressVerdict record the last address-verify.js result (confirmed/corrected/unconfirmed).

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";
// One definition of the people-spine vocabularies, shared with the UI and crm-push. Retyping
// these is what produced four drifted option strings on 2026-09-25. See src/lib/people-fields.js.
import { RELATIONSHIP, CONTACT_ROLE, TERRITORY } from "../../src/lib/people-fields.js";

import { withMonitoring } from "./_sentry.js";
const MAX_BYTES = 600_000;
// The outcome of one call attempt. "cleared" closes the gap by capturing the missing details;
// "not-a-prospect" closes it by disqualifying the company. Both stop the row being called again
// (isResolved in campaigns.js), but only "cleared" is exported to HubSpot.
const OUTCOMES = ["not-called", "cleared", "left-message", "no-answer", "callback", "bad-number", "do-not-contact", "not-a-prospect"];
const VERDICTS = ["confirmed", "corrected", "unconfirmed"];
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

// ---- People-spine fields (2026-09-26) ------------------------------------------------------
// contactRole / territory / relationship are DURABLE FACTS about a person or an account, so
// HubSpot owns them (docs/PEOPLE_DATA_OWNERSHIP.md: "HubSpot is the organizer"). They are
// captured here for the same reason buyer and email are — the fact exists the moment it is
// spoken, and promotion to HubSpot is a separate deliberate step via crm-push.
//
// This store is therefore a STAGING BUFFER for these three, never their home. That is the one
// rule the ownership doc turns on: "an app store is either a staging buffer that promotes to
// HubSpot, or it is CST process state. Nothing else owns a fact about a person or an account."
//
// Values are validated against the shared vocabularies rather than free text. A value HubSpot
// would reject is dropped HERE, where the rep can see the picker did nothing, rather than
// surviving until a batch push fails with a less legible error.
//
// Rick, 2026-09-26, on why these are pickers rather than a bulk backfill: "why not just have the
// clickable option in a dropdown so we select as we enrich the contact and relationship." Setting
// contact_role on ~100 distributor contacts by inference would have been guessing dressed as
// data — the same error guardrail 2 forbids for relationship.
const pickOne = (v, allowed) => (allowed.includes(v) ? v : "");
const pickMany = (v, allowed) =>
  (Array.isArray(v) ? v.filter((x) => allowed.includes(x)) : []).slice(0, allowed.length);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ---- Call-note history (2026-09-25) --------------------------------------------------------
// `note` used to be a single string per company, and a POST replaces the whole document — so the
// second call to the same buyer SILENTLY OVERWROTE the first. Every push to HubSpot creates a new
// note object, which meant HubSpot accumulated a call history while this app, the place the call
// was actually taken, kept only the latest line. Rick, 2026-09-25: "I want to keep notes made in
// the app for reference."
//
// `notes[]` is now the history and the SERVER owns the append. The client keeps sending `note`
// exactly as before and needs no change: if the text differs from the newest entry already on
// file, the server appends. That placement is deliberate — a client that holds a stale copy of
// the array cannot truncate the history by sending it back, which is the failure mode of doing
// this in the browser.
//
// `note` is retained as "the latest note" so enrichmentCsv(), the crm-push rows, and every
// existing reader keep working untouched. This is the expand half of expand → migrate → contract;
// nothing reads `notes[]` yet except the two surfaces added alongside this.
const MAX_NOTES = 25;
const NOTE_MAX = 1000;

// ---- Campaign scoping (2026-09-26) ---------------------------------------------------------
// THE BUG THIS FIXES. `entries` is keyed by companyId ALONE. `campaignId` was written onto the
// row as a tag, never as part of the key — so when a second campaign enriched a company the first
// campaign had already worked, it overwrote that campaign's buyer, title, email, phone, address
// and outcome. One slot per company, tenant-wide. The Fall Tasting pass and a spring pass could
// not both hold a record of the same account.
//
// Rick, 2026-09-26: "leave room for the development and discovery of details per campaign."
// There was no room: there was one row.
//
// `byCampaign` is the campaign-scoped store: { [campaignId]: { [companyId]: rec } }. Rows with no
// campaignId land under SHARED_SCOPE, which is a real bucket and not a discard — a row captured
// outside any campaign is still a fact somebody wrote down.
//
// EXPAND PHASE. Both shapes are written on every save and `entries` keeps its exact former
// meaning — the flat, latest-wins view every current reader already uses (enrichmentCsv, the
// crm-push rows, campaigns-page, the CRM account card). Nothing is migrated off it in this pass
// and nothing downstream changes. The contract phase — readers moving to `byCampaign` and
// `entries` becoming derived-only — is a separate deploy, after this one is proven in production.
//
// Backfill is LAZY and IDEMPOTENT: seedScopes() promotes any legacy `entries` row that has no
// counterpart in `byCampaign` into its own campaign's bucket, using the campaignId already on the
// row. It runs on every write, costs nothing once complete, and needs no migration script or
// downtime. A row already present under its scope is never overwritten by the legacy copy.
const SHARED_SCOPE = "_shared";

/** Which campaign bucket a row belongs to. Rows with no valid campaignId are shared, not dropped.
 *  Exported for tests only — not part of the HTTP contract. */
export function scopeOf(rec) {
  return ID_RE.test(rec?.campaignId || "") ? rec.campaignId : SHARED_SCOPE;
}

/** Promote legacy flat `entries` into `byCampaign` without clobbering anything already scoped.
 *  Idempotent: a second run over an already-seeded document changes nothing.
 *  Exported for tests only — not part of the HTTP contract. */
export function seedScopes(entries, byCampaign) {
  const out = {};
  for (const [scope, rows] of Object.entries(byCampaign || {})) {
    if (!rows || typeof rows !== "object") continue;
    out[scope] = { ...rows };
  }
  for (const [companyId, rec] of Object.entries(entries || {})) {
    if (!rec || typeof rec !== "object") continue;
    const scope = scopeOf(rec);
    if (!out[scope]) out[scope] = {};
    // Already scoped — the scoped copy is authoritative, the flat one is a shadow of some save.
    if (out[scope][companyId]) continue;
    out[scope][companyId] = rec;
  }
  return out;
}

/** The flat, latest-wins view. Preserves `entries` exactly as every current reader expects it:
 *  one row per company, most recently written scope winning. Ordering is by each row's calledAt so
 *  the winner is the genuinely newest capture rather than whichever scope happened to enumerate
 *  last. Exported for tests only — not part of the HTTP contract. */
export function flattenScopes(byCampaign) {
  const newest = {};
  for (const rows of Object.values(byCampaign || {})) {
    for (const [companyId, rec] of Object.entries(rows || {})) {
      const prev = newest[companyId];
      if (!prev || String(rec?.calledAt || "") >= String(prev?.calledAt || "")) {
        newest[companyId] = rec;
      }
    }
  }
  return newest;
}

/** Prior history for a company, seeding legacy single-string notes as entry #1.
 *  Exported for tests only — not part of the HTTP contract. */
export function priorNotes(prev) {
  if (!prev) return [];
  if (Array.isArray(prev.notes)) {
    return prev.notes
      .filter((n) => n && typeof n === "object" && typeof n.text === "string" && n.text.trim())
      .map((n) => ({
        at: str(n.at, 40) || str(prev.calledAt, 40) || "",
        text: str(n.text, NOTE_MAX),
        ...(ID_RE.test(n.campaignId || "") ? { campaignId: n.campaignId } : {}),
        ...(OUTCOMES.includes(n.outcome) ? { outcome: n.outcome } : {}),
      }))
      .slice(-MAX_NOTES);
  }
  // Legacy shape: one string, no history. Promote it so the first line of the log isn't lost.
  const legacy = str(prev.note, NOTE_MAX);
  if (!legacy) return [];
  return [{
    at: str(prev.calledAt, 40) || "",
    text: legacy,
    ...(ID_RE.test(prev.campaignId || "") ? { campaignId: prev.campaignId } : {}),
    ...(OUTCOMES.includes(prev.outcome) ? { outcome: prev.outcome } : {}),
  }];
}

/** Append `text` to the history only when it actually says something new.
 *  Exported for tests only — not part of the HTTP contract. */
export function appendNote(history, text, { at, campaignId, outcome }) {
  if (!text) return history;
  const last = history[history.length - 1];
  if (last && last.text === text) return history; // re-save of an unchanged row, not a new call
  return history.concat([{
    at: at || new Date().toISOString(),
    text,
    ...(ID_RE.test(campaignId || "") ? { campaignId } : {}),
    ...(OUTCOMES.includes(outcome) ? { outcome } : {}),
  }]).slice(-MAX_NOTES);
}

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant, context);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("campaign-enrichment").get(tenant);
      if (!raw) return json(200, { entries: {}, byCampaign: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      // Both shapes are returned. `entries` is unchanged for every existing reader; `byCampaign`
      // is additive, so a client that does not know about it is unaffected.
      return json(200, {
        entries: rec.entries || {},
        byCampaign: rec.byCampaign || {},
        updatedAt: rec.updatedAt || null,
      });
    } catch (err) {
      return json(200, { entries: {}, updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "campaign-enrichment", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }

  // Read the CURRENT document before writing. Required for note history: the POST replaces the
  // whole document, so without this read the server has no memory to append to. A read failure is
  // not fatal — we fall back to an empty prior, which costs history for this one save rather than
  // failing a call capture the rep just made.
  let prevEntries = {};
  let prevByCampaign = {};
  try {
    connectLambda(event);
    const prevRaw = await getStore("campaign-enrichment").get(tenant);
    if (prevRaw) {
      const prevDoc = JSON.parse(prevRaw);
      prevEntries = prevDoc.entries || {};
      prevByCampaign = prevDoc.byCampaign || {};
    }
  } catch { /* no prior document, or unreadable — treat as empty */ }

  // Lazy backfill: promote any legacy flat row that has no scoped counterpart yet. Idempotent, so
  // it is a no-op once every row has been through one save. See the seedScopes comment above.
  const scopes = seedScopes(prevEntries, prevByCampaign);

  // Rows the client just sent, grouped by the campaign they belong to. A save REPLACES the scopes
  // it touches and leaves every other scope untouched — that is the whole fix. Replacing rather
  // than merging within a touched scope preserves the existing delete semantics: a row the client
  // has dropped from its map stays dropped, and history alone never resurrects it.
  const incoming = {};
  for (const [companyId, e] of Object.entries(entries)) {
    // HubSpot company record ids are numeric; keep the check as loose as crm-outreach.js's.
    if (!/^[0-9]+$/.test(companyId) || !e || typeof e !== "object") continue;
    const outcome = OUTCOMES.includes(e.outcome) ? e.outcome : "";
    const verdict = VERDICTS.includes(e.addressVerdict) ? e.addressVerdict : "";
    const contactRole = pickOne(e.contactRole, CONTACT_ROLE);
    const relationship = pickOne(e.relationship, RELATIONSHIP);
    const territory = pickMany(e.territory, TERRITORY);
    const rec = {
      buyer: str(e.buyer, 120),
      title: str(e.title, 120),
      email: str(e.email, 160),
      phone: str(e.phone, 40),
      instagram: str(e.instagram, 120),
      note: str(e.note, 1000),
      street: str(e.street, 200),
      city: str(e.city, 100),
      state: str(e.state, 40),
      zip: str(e.zip, 20),
      ...(outcome && outcome !== "not-called" ? { outcome } : {}),
      // Staged for promotion to HubSpot by crm-push. Omitted when unset so an untouched picker
      // never writes an empty string over a value HubSpot already holds.
      ...(contactRole ? { contactRole } : {}),
      ...(relationship ? { relationship } : {}),
      ...(territory.length ? { territory } : {}),
      ...(ID_RE.test(e.campaignId || "") ? { campaignId: e.campaignId } : {}),
      ...(verdict ? { addressVerdict: verdict, addressVerifiedAt: str(e.addressVerifiedAt, 40) || new Date().toISOString() } : {}),
    };
    // Nothing captured = nothing stored, so an accidental focus/blur never writes a row.
    // A row that carries ONLY prior note history is still nothing new — history alone never
    // resurrects a row the client has emptied.
    if (!rec.buyer && !rec.email && !rec.note && !rec.outcome && !rec.phone && !rec.title && !rec.instagram
        && !rec.street && !rec.city && !rec.state && !rec.zip
        // Without these three, setting ONLY a role/territory/relationship — with no other edit —
        // would be silently discarded as an empty row. That is a real capture: "this person is a
        // Rep" is the whole fact sometimes.
        && !rec.contactRole && !rec.relationship && !rec.territory?.length) continue;
    const calledAt = str(e.calledAt, 40) || new Date().toISOString();
    const scope = scopeOf(rec);
    // History comes from THIS campaign's prior row. Falling back to the flat row keeps the log
    // intact for any company that has not been through a scoped save yet.
    const prior = scopes[scope]?.[companyId] || prevEntries[companyId];
    const notes = appendNote(priorNotes(prior), rec.note, {
      at: calledAt,
      campaignId: rec.campaignId,
      outcome: rec.outcome,
    });
    if (!incoming[scope]) incoming[scope] = {};
    incoming[scope][companyId] = { ...rec, calledAt, ...(notes.length ? { notes } : {}) };
  }

  // Replace touched scopes; leave the rest exactly as they were.
  const nextByCampaign = { ...scopes };
  for (const [scope, rows] of Object.entries(incoming)) nextByCampaign[scope] = rows;

  // `entries` stays the flat latest-wins view — unchanged contract for every current reader.
  const clean = flattenScopes(nextByCampaign);

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, byCampaign: nextByCampaign, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Enrichment document too large" });

  try {
    connectLambda(event);
    await getStore("campaign-enrichment").set(tenant, payload);
    await logWrite(event, {
      fn: "campaign-enrichment", ok: true, tenant, role: writeAuth.role,
      count: Object.keys(clean).length, scopes: Object.keys(nextByCampaign).length,
    });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("campaign-enrichment", rawHandler);
