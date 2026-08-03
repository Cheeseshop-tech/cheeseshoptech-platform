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
//   entries = { [campaignId]: { status, items, custom, hidden, results, updatedAt } }
//   — the FULL document each save (last-writer-wins; same trade-off as crm-outreach.js /
//   items-save.js, and fine at this team size).
//
// No per-client code — tenant is data.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

const MAX_BYTES = 400_000;
// Mirrors LIFECYCLE in src/lib/campaigns.js. Kept as a literal (not imported) because Netlify
// functions bundle separately from the Vite app — same reason crm-outreach.js re-lists STAGES.
const STATUSES = ["draft", "building", "ready", "launched", "complete"];
// Results counters the UI tracks. Anything else in a posted results object is dropped.
const RESULT_KEYS = ["sends", "opens", "clicks", "replies", "meetings", "won", "submissions"];
const MAX_CUSTOM_ITEMS = 40; // a checklist longer than this is a runbook, not a launch gate
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

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant);
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
  const writeAuth = requireWriteAuth(event, tenant);
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

    const results = {};
    for (const k of RESULT_KEYS) if (e.results && e.results[k] != null) results[k] = int(e.results[k]);

    if (!status && !Object.keys(items).length && !custom.length && !hidden.length && !Object.keys(results).length) {
      continue; // nothing worth storing for this campaign
    }
    clean[id] = {
      ...(status ? { status } : {}),
      ...(Object.keys(items).length ? { items } : {}),
      ...(custom.length ? { custom } : {}),
      ...(hidden.length ? { hidden } : {}),
      ...(Object.keys(results).length ? { results } : {}),
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
