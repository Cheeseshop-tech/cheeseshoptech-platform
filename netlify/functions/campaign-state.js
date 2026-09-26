// Netlify Function: per-tenant CAMPAIGN STATE — the mutable half of the campaigns tab
// (lifecycle status + launch-readiness checklist ticks + results, per campaign).
//
// Same split as the CRM tab, for the same reason (crm-outreach.js header note): the READ-ONLY
// half lives elsewhere and the platform owns the overlay. Here the split is:
//   · Campaign DEFINITIONS (name, goal, strategy link, content links, audience) — seeded in
//     src/lib/campaigns.js, versioned with the code, pointing OUT at the client project folder's
//     brief/runbook so there is one source of truth for strategy (Rick, 2026-08-03).
//   · Campaign STATE (status, which checklist items are done, custom/hidden items, results) —
//     THIS store. Netlify Blobs, keyed by tenant. Not localStorage: the whole point is that
//     Rick's launch-readiness ticks are shared and survive any browser, exactly as the outreach
//     console's status/notes do.
//
// GET  ?tenant=<id>                → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }         → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [campaignId]: { status, items, custom, hidden, fields, results, comments, documents,
//                                closedAt, updatedAt } }
//   — comments = a shared, campaign-level running-update log (separate from the per-checklist-
//   item notes in `items`); closedAt = set once, the moment a campaign's status first becomes
//   "complete" (see [[cst-campaign-management]] / Rick's 2026-09-21 ask for open/closed status,
//   comments, and a past-campaigns review record).
//   — documents (2026-09-21, docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md): special-offer sheets
//   and other reference files uploaded to a campaign — the file itself lives in Cloudinary (same
//   signed path/store the Media Hub uses, see media-upload-sign.js), this just holds the
//   pointer + display metadata, same relationship `comments` has to its entries. Each document
//   also carries its own approvalStatus (pending/approved/rejected) and comment thread as of
//   2026-09-22 — a deliberate reversal of the original "no approval workflow" call, see the
//   addendum at the bottom of that spec doc.
//   — the FULL document each save (last-writer-wins; same trade-off as crm-outreach.js /
//   items-save.js, and fine at this team size).
//
// No per-client code — tenant is data.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";
// The shared territory vocabulary — the same list the call console, crm-push and crm-hubspot use.
import { TERRITORY } from "../../src/lib/people-fields.js";
import { ALL_STEP_IDS } from "../../src/lib/lifecycles.js";
const MAX_BYTES = 400_000;
// Mirrors LIFECYCLE in src/lib/campaigns.js. Kept as a literal (not imported) because Netlify
// functions bundle separately from the Vite app — same reason crm-outreach.js re-lists STAGES.
// Every step of every lifecycle (src/lib/lifecycles.js). Was a literal copy of the generic five
// until 2026-09-26 — which would have silently DROPPED "setup"/"connect"/"execute" on save, and
// a distributor campaign would have reverted to its previous status without a word.
const STATUSES = ALL_STEP_IDS;
// Results counters the UI tracks. Anything else in a posted results object is dropped.
const RESULT_KEYS = ["sends", "opens", "clicks", "replies", "meetings", "won", "submissions"];
const MAX_CUSTOM_ITEMS = 40; // a checklist longer than this is a runbook, not a launch gate
const MAX_COMMENTS = 50; // a running per-campaign update log, not a chat transcript
// Per-campaign discovered fields (2026-09-26). Capped low on purpose: a campaign that needs more
// than a dozen extra questions per prospect is not discovering details, it is building a survey,
// and the answer there is a real schema rather than more bolt-ons.
const MAX_FIELDS = 12;
const MAX_FIELD_OPTIONS = 12;
const FIELD_TYPES = ["text", "select", "check"];
const MAX_DOCUMENTS = 30; // reference material for one campaign, not a document archive
const MAX_DOC_COMMENTS = 40; // per-document review thread — same order of magnitude as MAX_COMMENTS
const DOC_APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const MAX_REPS = 300; // a distributor's whole contact book, generously capped
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

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 1e9) : 0;
};

// ---- One rep on a campaign's roster --------------------------------------------------------
//
// Extracted 2026-09-26 when the rep card gained two fields, so the sanitizer is testable on its
// own (scripts/test-rep-card.mjs). The two new fields sit on opposite sides of the ownership line,
// and the difference is the whole point:
//
//   territory[]    — a DURABLE FACT about the rep. HubSpot Contact.territory owns it. The roster
//                    only STAGES it, validated against the shared vocabulary so a value HubSpot
//                    would reject never gets this far. crm-push promotes it. This is the "staging
//                    buffer that promotes to HubSpot" half of the one rule in
//                    docs/PEOPLE_DATA_OWNERSHIP.md.
//
//   keyAccounts[]  — CAMPAIGN PROCESS STATE. Which accounts THIS campaign is working through this
//                    rep. Rick, 2026-09-26: specific to the campaign — a different campaign with
//                    the same rep picks its own set. Never promoted; HubSpot never sees it.
//
// Key accounts are PICKED, never computed. There is no revenue, order or deal data anywhere in
// this codebase to rank by, and the one ranking that exists — email engagement — was shown the
// same morning to be actively misleading (docs/CUSTOMER_GAP_2026-09-26.md: three paying customers
// had zero engagement). Rick's phrase was "selecting their key customers." That is the design.
const MAX_KEY_ACCOUNTS = 10;
const COMPANY_ID_RE = /^[0-9]{1,20}$/; // HubSpot company ids are numeric

export function cleanRosterRep(r) {
  const territory = Array.isArray(r?.territory)
    ? [...new Set(r.territory.filter((t) => TERRITORY.includes(t)))]
    : [];
  const keyAccounts = Array.isArray(r?.keyAccounts)
    ? [...new Set(r.keyAccounts.map((id) => String(id ?? "").trim()).filter((id) => COMPANY_ID_RE.test(id)))]
      .slice(0, MAX_KEY_ACCOUNTS)
    : [];
  return {
    ...(str(r?.name, 160) ? { name: str(r.name, 160) } : {}),
    ...(str(r?.phone, 40) ? { phone: str(r.phone, 40) } : {}),
    ...(str(r?.jobtitle, 120) ? { jobtitle: str(r.jobtitle, 120) } : {}),
    addedAt: str(r?.addedAt, 40) || new Date().toISOString(),
    // Absent until the rep is actually emailed — this is the fact the ✉ progress dot reads, so it
    // must never be set speculatively.
    ...(str(r?.emailedAt, 40) ? { emailedAt: str(r.emailedAt, 40) } : {}),
    ...(r?.dropped === true ? { dropped: true } : {}),
    // Omitted when empty so an untouched picker never writes `[]` — and so crm-push can tell
    // "never set" from "deliberately cleared" if that distinction is ever needed.
    ...(territory.length ? { territory } : {}),
    ...(keyAccounts.length ? { keyAccounts } : {}),
  };
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
      const raw = await getStore("campaign-state").get(tenant);
      if (!raw) return json(200, { entries: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: rec.entries || {}, updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Blobs unprovisioned/transient: degrade to empty — the dashboard still renders the
      // seeded definitions read-only rather than erroring out. Same choice as crm-outreach.js.
      return json(200, { entries: {}, updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  // Writes are house/client-admin only — same tiers as every other write endpoint (Rick
  // confirmed 2026-08-03: campaign ticks get the identical gate the CRM console has).
  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "campaign-state", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }

  // Sanitize: known fields only, valid status, bounded strings/arrays.
  const clean = {};
  for (const [id, e] of Object.entries(entries)) {
    if (!ID_RE.test(id) || !e || typeof e !== "object") continue;

    const status = STATUSES.includes(e.status) ? e.status : null;

    // items: { [itemId]: {done, doneAt, note} } — the checklist ticks.
    const items = {};
    for (const [itemId, it] of Object.entries(e.items || {})) {
      if (!ID_RE.test(itemId) || !it || typeof it !== "object") continue;
      const done = it.done === true;
      const note = str(it.note, 500);
      if (!done && !note) continue; // an untouched item is absence, not a stored false
      items[itemId] = { done, ...(note ? { note } : {}), doneAt: str(it.doneAt, 40) || new Date().toISOString() };
    }

    // custom: checklist items Rick added on top of the type template.
    const custom = (Array.isArray(e.custom) ? e.custom : []).slice(0, MAX_CUSTOM_ITEMS)
      .filter((c) => c && typeof c === "object" && ID_RE.test(c.id || ""))
      .map((c) => ({
        id: c.id,
        label: str(c.label, 160) || c.id,
        group: str(c.group, 40) || "Custom",
        required: c.required === true,
      }));

    // hidden: template item ids removed from this campaign.
    const hidden = (Array.isArray(e.hidden) ? e.hidden : []).slice(0, MAX_CUSTOM_ITEMS)
      .filter((h) => ID_RE.test(String(h || "")));

    // ---- fields: what THIS campaign asks about each prospect (2026-09-26) -------------------
    //
    // Rick, 2026-09-26: "let's create the system and leave room for the development and discovery
    // of details per campaign, we can improve as we go."
    //
    // The standard enrichment form asks the same questions of every prospect in every campaign —
    // buyer, title, email, phone, address. But a campaign discovers its own questions while it
    // runs: a DOP push wants to know if they already carry a PDO line; a shelf-tag program wants
    // to know who prints the tags. Before this, there was nowhere to put that. The enrichment
    // store has a hard allow-list, so an unrecognised field was not rejected — it was SILENTLY
    // DROPPED, which is the worst of both.
    //
    // Definitions live HERE, in campaign STATE, not in src/lib/campaigns.js, and deliberately so.
    // The architectural split (CLAUDE.md, 2026-08-03) is that campaign *definitions* are seeded in
    // code and versioned with it, while campaign *state* is per-campaign and editable at runtime.
    // A question discovered on call number nine is state by that definition — it is exactly the
    // same shape of thing as `custom` checklist items above, and it is stored the same way.
    //
    // THE BOUNDARY THAT MATTERS: these are CST process state. They are NEVER promoted to HubSpot
    // automatically. If a discovered detail turns out to be durable and universal, it graduates
    // deliberately into a real HubSpot property — that promotion is a decision someone makes, not
    // a side effect. Without that gate this becomes the sixth overlay store the ownership map
    // exists to prevent (docs/PEOPLE_DATA_OWNERSHIP.md, guardrail 1).
    const fields = (Array.isArray(e.fields) ? e.fields : []).slice(0, MAX_FIELDS)
      .filter((f) => f && typeof f === "object" && ID_RE.test(f.id || ""))
      .map((f) => {
        const type = FIELD_TYPES.includes(f.type) ? f.type : "text";
        // Options only mean anything for a select; carrying them on a text field would be a lie
        // about the shape of the data.
        const options = type === "select"
          ? (Array.isArray(f.options) ? f.options : [])
            .map((o) => str(o, 60)).filter(Boolean).slice(0, MAX_FIELD_OPTIONS)
          : [];
        return {
          id: f.id,
          label: str(f.label, 120) || f.id,
          type,
          ...(options.length ? { options } : {}),
          ...(str(f.hint, 160) ? { hint: str(f.hint, 160) } : {}),
          addedAt: str(f.addedAt, 40) || new Date().toISOString(),
        };
      })
      // A select with no options can never be answered — drop it rather than render a dead control.
      .filter((f) => f.type !== "select" || f.options?.length);

    // comments: the campaign-level update log (separate from per-checklist-item notes above).
    // `kind: "wrapup"` marks the note captured when a campaign is closed out — the headline of
    // its entry in the Past Campaigns archive (see mergeCampaign()/campaigns.js).
    const comments = (Array.isArray(e.comments) ? e.comments : []).slice(0, MAX_COMMENTS)
      .filter((cm) => cm && typeof cm === "object" && ID_RE.test(cm.id || ""))
      .map((cm) => ({
        id: cm.id,
        text: str(cm.text, 800),
        author: str(cm.author, 120) || "Team",
        at: str(cm.at, 40) || new Date().toISOString(),
        kind: cm.kind === "wrapup" ? "wrapup" : "update",
      }))
      .filter((cm) => cm.text);

    // documents: files uploaded to Cloudinary from inside the campaign (uploadDocument() in
    // cloudinary.js) — this store only ever holds the resulting pointer, never the file bytes.
    // approvalStatus/approvedBy/approvedAt + a per-document `comments` thread added 2026-09-22
    // (Rick, reversing the 2026-09-21 "no approval workflow" call — see the addendum in
    // docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md) so a document can be reviewed and discussed
    // without downloading it first, via the new full-size viewer opened from its pill.
    const documents = (Array.isArray(e.documents) ? e.documents : []).slice(0, MAX_DOCUMENTS)
      .filter((d) => d && typeof d === "object" && ID_RE.test(d.id || "") && /^https:\/\/res\.cloudinary\.com\//.test(d.url || ""))
      .map((d) => {
        const docComments = (Array.isArray(d.comments) ? d.comments : []).slice(0, MAX_DOC_COMMENTS)
          .filter((cm) => cm && typeof cm === "object" && ID_RE.test(cm.id || ""))
          .map((cm) => ({
            id: cm.id,
            text: str(cm.text, 800),
            author: str(cm.author, 120) || "Team",
            at: str(cm.at, 40) || new Date().toISOString(),
          }))
          .filter((cm) => cm.text);
        const approvalStatus = DOC_APPROVAL_STATUSES.includes(d.approvalStatus) ? d.approvalStatus : "pending";
        return {
          id: d.id,
          name: str(d.name, 160) || "Untitled document",
          url: d.url, // already validated above — a Cloudinary delivery URL, never arbitrary input
          publicId: str(d.publicId, 300),
          format: str(d.format, 20),
          bytes: int(d.bytes),
          uploadedBy: str(d.uploadedBy, 120) || "Team",
          uploadedAt: str(d.uploadedAt, 40) || new Date().toISOString(),
          approvalStatus,
          ...(approvalStatus !== "pending" ? {
            approvedBy: str(d.approvedBy, 120) || "Team",
            approvedAt: str(d.approvedAt, 40) || new Date().toISOString(),
          } : {}),
          ...(docComments.length ? { comments: docComments } : {}),
        };
      });

    // closedAt: set once, when a campaign is marked complete — the sort key for the archive
    // (distinct from `updatedAt`, which keeps moving on any later edit to a closed campaign).
    const closedAt = str(e.closedAt, 40);

    // repVisits (2026-09-21, Rick: "identify areas and prospect and reps... Ill select the reps
    // and regions and the system CST should populate the fields") — reps pulled LIVE from a
    // HubSpot company, `source` is free text (not a fixed id) since more distributors are coming
    // ("in the near future we will wire other distributors and their reps to the campaign
    // engine"), not just Ace Endico.
    //
    // TWO-TIER model (revised same day, Rick: "so two steps territory selection the key account
    // selection... often reps will have some accounts scattered even in other reps territories
    // so the first two steps build the broad shape state town borough then account will also
    // have a drop down to select responsable rep assignment"):
    //   Tier 1 (UI-only, not stored as a rule) — check state/city boxes, "lock in" BULK-WRITES
    //   accountAssignments for whatever matched at that moment. It's a fast way to populate
    //   Tier 2, not a standing filter, because a stored geometric rule can't represent a rep's
    //   scattered accounts inside another rep's territory.
    //   Tier 2 (the actual source of truth) — accountAssignments: {companyId: repEmail}, keyed
    //   by the HubSpot company's stable id so it survives any later territory redefinition.
    //   Always wins; there's nothing else to reconcile it against.
    // `reps` (legacy shape from the first version, states/cities per rep) is still accepted
    // read/write so nothing already saved is silently dropped, but the app no longer writes new
    // data into it — accountAssignments is what mergeCampaign()/deriveAccountAssignmentFilter()
    // (src/lib/campaigns.js) now read to auto-populate Target Prospects.
    const repVisitsSource = str(e.repVisits?.source, 160);
    const repVisitsReps = (Array.isArray(e.repVisits?.reps) ? e.repVisits.reps : []).slice(0, MAX_REPS)
      .filter((rp) => rp && typeof rp === "object" && str(rp.email, 200))
      .map((rp) => ({
        email: str(rp.email, 200).toLowerCase(),
        name: str(rp.name, 160),
        phone: str(rp.phone, 40),
        jobtitle: str(rp.jobtitle, 120),
        states: (Array.isArray(rp.states) ? rp.states : []).slice(0, 60)
          .map((s) => str(s, 4).toUpperCase()).filter(Boolean),
        cities: Object.fromEntries(
          Object.entries(rp.cities && typeof rp.cities === "object" && !Array.isArray(rp.cities) ? rp.cities : {})
            .slice(0, 60)
            .map(([st, list]) => [
              str(st, 4).toUpperCase(),
              (Array.isArray(list) ? list : []).slice(0, 60).map((v) => str(v, 80).toLowerCase()).filter(Boolean),
            ])
            .filter(([, list]) => list.length),
        ),
      }));
    // accountAssignments: plain object, company id -> ARRAY of rep emails (2026-09-22, Rick:
    // "leave the flexability to assign the same terrritory to multiple reps since there are a
    // few opperating in the same or crossover areas in the same city or town or state" -- one
    // account can now legitimately belong to several reps at once). Still accepts a bare string
    // per company (the pre-2026-09-22 shape) and upgrades it to a one-element array in place,
    // so nothing saved before this change needs a separate migration. Bounded generously (a
    // distributor's whole reachable book, not just one campaign's worth) and every value
    // validated as looking like an email rather than trusted blindly.
    const MAX_ACCOUNT_ASSIGNMENTS = 5000;
    const MAX_REPS_PER_ACCOUNT = 25;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rawAssignments = e.repVisits?.accountAssignments;
    const repVisitsAccountAssignments = Object.fromEntries(
      Object.entries(rawAssignments && typeof rawAssignments === "object" && !Array.isArray(rawAssignments) ? rawAssignments : {})
        .slice(0, MAX_ACCOUNT_ASSIGNMENTS)
        .map(([companyId, val]) => {
          const emails = [...new Set(
            (Array.isArray(val) ? val : [val])
              .map((v) => str(v, 200).toLowerCase())
              .filter((v) => EMAIL_RE.test(v))
          )].slice(0, MAX_REPS_PER_ACCOUNT);
          return [str(companyId, 40), emails];
        })
        .filter(([companyId, emails]) => companyId && emails.length)
    );
    const repVisits = (repVisitsSource || repVisitsReps.length || Object.keys(repVisitsAccountAssignments).length)
      ? {
          ...(repVisitsSource ? { source: repVisitsSource } : {}),
          ...(repVisitsReps.length ? { reps: repVisitsReps } : {}),
          ...(Object.keys(repVisitsAccountAssignments).length ? { accountAssignments: repVisitsAccountAssignments } : {}),
        }
      : null;

    // repRoster (2026-09-22, REP_TERRITORY_ASSIGNMENTS_SPEC Revision 4 + ADR-002) — WHO this
    // campaign is working. Stored per campaign because that is a campaign decision.
    //
    // CHANGED 2026-09-26 — this comment previously said a rep's territories are "tenant-wide and
    // live in campaign-rep-calls / territory-book." Superseded by Rick's decision that day
    // (docs/DISTRIBUTOR_CAMPAIGN_PHASES_2026-09-26.md): a rep's territory is a durable fact and
    // HubSpot `Contact.territory` owns it. The roster STAGES it (`territory[]`) and crm-push
    // promotes it. territory-book held zero records and is being retired; the free-text territory
    // on campaign-rep-calls is superseded by the picker. See cleanRosterRep() below.
    //
    // This exists because the panel previously held five different "which reps" selections and
    // only the account-assignment map survived a reload — so a rep was in the campaign only once
    // they had a territory, which is backwards. "Pick twelve reps and email them" was not
    // representable at all. The roster makes it a fact that persists.
    const MAX_ROSTER = 200;
    const rosterSource = str(e.repRoster?.source, 160);
    const rosterReps = Object.fromEntries(
      Object.entries(e.repRoster?.reps && typeof e.repRoster.reps === "object" && !Array.isArray(e.repRoster.reps) ? e.repRoster.reps : {})
        .slice(0, MAX_ROSTER)
        .map(([email, r]) => [String(email || "").trim().toLowerCase(), r])
        .filter(([email, r]) => EMAIL_RE.test(email) && r && typeof r === "object")
        .map(([email, r]) => [email, cleanRosterRep(r)])
    );
    const repRoster = (rosterSource || Object.keys(rosterReps).length)
      ? {
          ...(rosterSource ? { source: rosterSource } : {}),
          ...(Object.keys(rosterReps).length ? { reps: rosterReps } : {}),
        }
      : null;

    const results = {};
    for (const k of RESULT_KEYS) if (e.results && e.results[k] != null) results[k] = int(e.results[k]);

    if (!status && !Object.keys(items).length && !custom.length && !hidden.length
        && !Object.keys(results).length && !comments.length && !documents.length && !closedAt
        && !repVisits && !repRoster && !fields.length) {
      continue; // nothing worth storing for this campaign
    }
    clean[id] = {
      ...(status ? { status } : {}),
      ...(Object.keys(items).length ? { items } : {}),
      ...(custom.length ? { custom } : {}),
      ...(hidden.length ? { hidden } : {}),
      ...(fields.length ? { fields } : {}),
      ...(Object.keys(results).length ? { results } : {}),
      ...(comments.length ? { comments } : {}),
      ...(documents.length ? { documents } : {}),
      ...(closedAt ? { closedAt } : {}),
      ...(repVisits ? { repVisits } : {}),
      ...(repRoster ? { repRoster } : {}),
      updatedAt: str(e.updatedAt, 40) || new Date().toISOString(),
    };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Campaign state document too large" });

  try {
    connectLambda(event);
    await getStore("campaign-state").set(tenant, payload);
    await logWrite(event, { fn: "campaign-state", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("campaign-state", rawHandler);
