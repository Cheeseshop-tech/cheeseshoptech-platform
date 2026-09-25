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
// GET  ?tenant=<id>          → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }   → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [companyId]: { buyer, title, email, phone, instagram, outcome, note, calledAt,
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

import { withMonitoring } from "./_sentry.js";
const MAX_BYTES = 600_000;
// The outcome of one call attempt. "cleared" closes the gap by capturing the missing details;
// "not-a-prospect" closes it by disqualifying the company. Both stop the row being called again
// (isResolved in campaigns.js), but only "cleared" is exported to HubSpot.
const OUTCOMES = ["not-called", "cleared", "left-message", "no-answer", "callback", "bad-number", "do-not-contact", "not-a-prospect"];
const VERDICTS = ["confirmed", "corrected", "unconfirmed"];
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

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
      if (!raw) return json(200, { entries: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: rec.entries || {}, updatedAt: rec.updatedAt || null });
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
  try {
    connectLambda(event);
    const prevRaw = await getStore("campaign-enrichment").get(tenant);
    if (prevRaw) prevEntries = JSON.parse(prevRaw).entries || {};
  } catch { /* no prior document, or unreadable — treat as empty */ }

  const clean = {};
  for (const [companyId, e] of Object.entries(entries)) {
    // HubSpot company record ids are numeric; keep the check as loose as crm-outreach.js's.
    if (!/^[0-9]+$/.test(companyId) || !e || typeof e !== "object") continue;
    const outcome = OUTCOMES.includes(e.outcome) ? e.outcome : "";
    const verdict = VERDICTS.includes(e.addressVerdict) ? e.addressVerdict : "";
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
      ...(ID_RE.test(e.campaignId || "") ? { campaignId: e.campaignId } : {}),
      ...(verdict ? { addressVerdict: verdict, addressVerifiedAt: str(e.addressVerifiedAt, 40) || new Date().toISOString() } : {}),
    };
    // Nothing captured = nothing stored, so an accidental focus/blur never writes a row.
    // A row that carries ONLY prior note history is still nothing new — history alone never
    // resurrects a row the client has emptied.
    if (!rec.buyer && !rec.email && !rec.note && !rec.outcome && !rec.phone && !rec.title && !rec.instagram
        && !rec.street && !rec.city && !rec.state && !rec.zip) continue;
    const calledAt = str(e.calledAt, 40) || new Date().toISOString();
    const notes = appendNote(priorNotes(prevEntries[companyId]), rec.note, {
      at: calledAt,
      campaignId: rec.campaignId,
      outcome: rec.outcome,
    });
    clean[companyId] = { ...rec, calledAt, ...(notes.length ? { notes } : {}) };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Enrichment document too large" });

  try {
    connectLambda(event);
    await getStore("campaign-enrichment").set(tenant, payload);
    await logWrite(event, { fn: "campaign-enrichment", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("campaign-enrichment", rawHandler);
