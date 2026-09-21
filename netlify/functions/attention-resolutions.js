// Netlify Function: manual resolutions for "Priority — response needed" items that get closed out
// somewhere the Gmail-driven automation can't see — a phone call, a hallway conversation — so the
// live card can be cleared by hand, with a note, and looked back on later (Rick, 2026-09-21:
// "some things get resolved in phone calls... include a resolved and notes button... keep a log").
//
// Two things live in one Blobs record per tenant, same store-per-tenant shape as
// campaign-rep-calls.js:
//   resolved: { [itemId]: { notes, method, resolvedAt, resolvedBy } } — suppresses that item id
//     from the live card (see src/lib/attention.js). Naturally aged out once the next Monday
//     publish drops that id from the underlying attention.json array — this is a suppress-list,
//     not something that needs its own cleanup job.
//   log: [ { id, action, who, what, urgency, notes, method, resolvedAt, resolvedBy } ] —
//     append-only, newest first, capped — the "look back and see it was resolved on a call"
//     history Rick asked for. Survives even after the id above ages out of `resolved`.
//
// GET  ?tenant=<id>                                            → { resolved, log, updatedAt }
//   (any read-tier passcode/session — same tier as attention-list.js)
// POST { tenant, action:"resolve", id, who, what, urgency, notes, method }  → resolve one item
// POST { tenant, action:"reopen", id }                                     → undo a resolve
//   (admin/client-admin passcode or Identity session — same tier as every other write here)
import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";

const STORE = "attention-resolutions";
const MAX_LOG = 200; // rolling window, mirrors _write-log.js's MAX_ENTRIES reasoning
const METHODS = ["phone", "email", "in-person", "other"];

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

// Best-effort human name for the log — prefer a real signed-in identity over a bare role label.
function actorName(context, role) {
  const identityUser = context?.clientContext?.user || null;
  if (identityUser?.user_metadata?.full_name) return identityUser.user_metadata.full_name;
  if (identityUser?.email) return identityUser.email;
  return role === "admin" ? "CST admin" : "Portal admin";
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
      const raw = await getStore(STORE).get(tenant);
      if (!raw) return json(200, { resolved: {}, log: [], updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { resolved: rec.resolved || {}, log: rec.log || [], updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Degrade gracefully — a broken read here should never hide the live card, only its log.
      return json(200, { resolved: {}, log: [], updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "attention-resolutions", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const id = str(body.id, 80);
  if (!id) return json(400, { error: "Missing id" });
  const action = body.action === "reopen" ? "reopen" : "resolve";

  try {
    connectLambda(event);
    const store = getStore(STORE);
    const raw = await store.get(tenant);
    const rec = raw ? JSON.parse(raw) : {};
    rec.resolved = rec.resolved && typeof rec.resolved === "object" ? rec.resolved : {};
    rec.log = Array.isArray(rec.log) ? rec.log : [];

    const resolvedBy = actorName(context, writeAuth.role);
    const now = new Date().toISOString();

    if (action === "reopen") {
      delete rec.resolved[id];
      rec.log.unshift({ id, action: "reopen", resolvedBy, at: now });
    } else {
      const method = METHODS.includes(body.method) ? body.method : "other";
      const notes = str(body.notes, 1000);
      const entry = { notes, method, resolvedAt: now, resolvedBy };
      rec.resolved[id] = entry;
      rec.log.unshift({
        id,
        action: "resolve",
        who: str(body.who, 120),
        what: str(body.what, 300),
        urgency: str(body.urgency, 20),
        ...entry,
      });
    }
    while (rec.log.length > MAX_LOG) rec.log.pop();

    await store.set(tenant, JSON.stringify({ resolved: rec.resolved, log: rec.log, updatedAt: now }));
    await logWrite(event, { fn: "attention-resolutions", ok: true, tenant, role: writeAuth.role, action, id });
    return json(200, { ok: true, updatedAt: now, resolved: rec.resolved, log: rec.log });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("attention-resolutions", rawHandler);
