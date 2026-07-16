// Netlify Function: shared MOVEMENT history (sold / missed cases) per tenant — the central store
// that turns per-browser captures into one shared record (one mind / one body) so forecasting has
// real, accruing history. Stored in Netlify Blobs (store "history", key = tenant).
//   GET  /.netlify/functions/history?tenant=<id>   -> { records: [...] }
//   POST /.netlify/functions/history  { tenant, records:[...] }  -> append (deduped by id)
// Pilot-grade: append-only, validated + capped; the app is passcode-gated. Harden with per-user
// auth when that lands. The read side is non-secret (it only returns the team's own movement data).
import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

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
const cleanTenant = (t) => String(t || "").replace(/[^a-z0-9-]/gi, "");
const MAX_BATCH = 500;   // records per POST
const MAX_STORED = 5000; // rolling cap per tenant

function sanitize(r) {
  if (!r || typeof r.skuCode !== "string") return null;
  return {
    id: String(r.id || Date.now() + "-" + Math.random().toString(36).slice(2, 8)),
    period: String(r.period || "").slice(0, 7),
    skuCode: String(r.skuCode).slice(0, 20),
    customer: String(r.customer || "").slice(0, 80),
    soldCases: Number(r.soldCases) || 0,
    missedCases: Number(r.missedCases) || 0,
    at: String(r.at || "").slice(0, 30),
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  // Any valid passcode tier (2026-07-16, wiring-audit P0 #1) — reps on the base client tier
  // record sales from the Proforma tab, so reads AND writes here accept all three tiers. The
  // old code comment assumed "the app is passcode-gated," but nothing verified that server-side:
  // a bare URL could read the whole movement ledger or POST fake sales records. Guard sits
  // AFTER the OPTIONS branch so preflight still works. POST additionally logs itself per the
  // STANDING RULE in docs/BUILD_LOG.md (every write endpoint logs itself).
  const readAuth = requireReadAuth(
    event,
    cleanTenant(event.queryStringParameters?.tenant) ||
      (() => { try { return cleanTenant(JSON.parse(event.body || "{}").tenant); } catch { return ""; } })()
  );
  if (!readAuth.ok) {
    if (event.httpMethod === "POST") await logWrite(event, { fn: "history", ok: false, status: readAuth.status });
    return jsonUnauthorized(readAuth);
  }

  try {
    connectLambda(event);
    const store = getStore("history");

    if (event.httpMethod === "GET") {
      const tenant = cleanTenant(event.queryStringParameters?.tenant);
      if (!tenant) return json(400, { error: "Missing tenant" });
      const raw = await store.get(tenant);
      return json(200, { records: raw ? JSON.parse(raw) : [] });
    }

    if (event.httpMethod === "POST") {
      let body;
      try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }
      const tenant = cleanTenant(body.tenant);
      if (!tenant) return json(400, { error: "Missing tenant" });
      const incoming = Array.isArray(body.records) ? body.records.slice(0, MAX_BATCH).map(sanitize).filter(Boolean) : [];
      if (!incoming.length) return json(400, { error: "No valid records" });
      const raw = await store.get(tenant);
      const existing = raw ? JSON.parse(raw) : [];
      const seen = new Set(existing.map((r) => r.id));
      const merged = existing.concat(incoming.filter((r) => !seen.has(r.id))).slice(-MAX_STORED);
      await store.set(tenant, JSON.stringify(merged));
      await logWrite(event, {
        fn: "history", ok: true, role: readAuth.role,
        action: `append ${incoming.length} movement record(s)`, tenant,
      });
      return json(200, { ok: true, added: incoming.length, total: merged.length });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: "history store error", detail: String((err && err.message) || err) });
  }
};
