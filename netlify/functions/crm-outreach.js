// Netlify Function: per-tenant CRM outreach state (pipeline status + notes per company).
// The server-side replacement for the campaign-CRM artifact's localStorage (Prospecting
// Phase 10): status/notes must survive the browser and be shared across the team, but they
// CANNOT live in HubSpot — the private app is deliberately read-only (crm-hubspot.js scope
// note). So they live in Netlify Blobs, keyed by tenant — same pattern as inventory.js.
//
// GET  ?tenant=<id>                 → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }          → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [companyId]: { status, note, updatedAt } } — the FULL document each save
//   (last-writer-wins; fine at this team size, same trade-off as items-save.js).
//
// HubSpot stays the CRM of record for accounts/contacts; this store is the thin outreach
// overlay the platform owns. No per-client code — tenant is data.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";
const MAX_BYTES = 400_000; // plenty for thousands of {status,note} rows; guards runaway payloads
const STAGES = ["New", "Emailed", "Replied", "Meeting", "Won", "Lost", "Not a fit"];

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

const rawHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("crm-outreach").get(tenant);
      if (!raw) return json(200, { entries: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: rec.entries || {}, updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Blobs unprovisioned/transient: degrade to empty — the console still renders read-only.
      return json(200, { entries: {}, updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  // Writes are house/client-admin only — same tiers as every other write endpoint.
  const writeAuth = requireWriteAuth(event, tenant);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "crm-outreach", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }
  // Sanitize: keep only known fields, valid stages, bounded note length.
  const clean = {};
  for (const [id, e] of Object.entries(entries)) {
    if (!/^[0-9]+$/.test(id) || !e || typeof e !== "object") continue;
    const status = STAGES.includes(e.status) ? e.status : null;
    const note = typeof e.note === "string" ? e.note.slice(0, 500) : "";
    if (!status && !note) continue; // nothing worth storing
    clean[id] = { ...(status ? { status } : {}), ...(note ? { note } : {}), updatedAt: e.updatedAt || new Date().toISOString() };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Outreach document too large" });

  try {
    connectLambda(event);
    await getStore("crm-outreach").set(tenant, payload);
    await logWrite(event, { fn: "crm-outreach", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("crm-outreach", rawHandler);
