// Netlify Function: shared QUOTES-ISSUED log per tenant — the central store that turns
// per-browser quote generation into one shared record (one mind / one body), closing the last
// "not captured yet" row in docs/QUOTING_TOOL_PRINCIPLES.md §9. Stored in Netlify Blobs
// (store "quotes", key = tenant). Exact same shape and guarantees as history.js.
//   GET  /.netlify/functions/quotes?tenant=<id>   -> { records: [...] }
//   POST /.netlify/functions/quotes  { tenant, records:[...] }  -> append (deduped by id)
// One record per SKU LINE on a printed quote, so the store is queryable per customer+SKU the
// way movement history is per SKU+period — that lookup is what auto-fills a Price Change
// Notification's "Previous $/lb". Append-only, validated + capped; guarded by the shared
// passcode tiers (any tier may read AND write — reps issue quotes), and every write logs itself.
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
const MAX_BATCH = 500;   // records per POST (one quote = one record per SKU line)
const MAX_STORED = 5000; // rolling cap per tenant

const PURPOSES = new Set(["new_customer", "price_change", "promo"]);
// How the quoted price was derived: the class-of-trade preset, a manual markup on cost, or a
// manual gross-profit margin. Stored per line so a logged price can be explained after the fact.
const PRICE_MODES = new Set(["tier", "markup", "margin"]);
const str = (v, n) => String(v == null ? "" : v).slice(0, n);

function sanitize(r) {
  if (!r || typeof r.skuCode !== "string") return null;
  // unitPrice may legitimately be absent (an unpriced line never prints, but be defensive) —
  // store null rather than 0 so a reader never mistakes "no price on file" for free cheese.
  const price = Number(r.unitPrice);
  return {
    id: str(r.id || Date.now() + "-" + Math.random().toString(36).slice(2, 8), 40),
    tenant: str(r.tenant, 40),
    at: str(r.at, 30),
    purpose: PURPOSES.has(r.purpose) ? r.purpose : "new_customer",
    quoteId: str(r.quoteId, 40),
    customer: str(r.customer, 80),
    skuCode: str(r.skuCode, 20),
    unitPrice: Number.isFinite(price) ? price : null,
    unit: r.unit === "case" ? "case" : "lb",
    tierId: str(r.tierId, 40),
    priceMode: PRICE_MODES.has(r.priceMode) ? r.priceMode : "tier",
    pricePct: Number.isFinite(Number(r.pricePct)) ? Number(r.pricePct) : null,
    validUntil: str(r.validUntil, 10),
    effectiveDate: str(r.effectiveDate, 10),
    promoStart: str(r.promoStart, 10),
    promoEnd: str(r.promoEnd, 10),
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  // Any valid passcode tier, reads and writes alike — reps on the base client tier both issue
  // quotes and need the prior-price lookup. Guard sits AFTER the OPTIONS branch so preflight
  // still works. POST additionally logs itself per the STANDING RULE in docs/BUILD_LOG.md
  // (every write endpoint logs itself).
  const readAuth = requireReadAuth(
    event,
    cleanTenant(event.queryStringParameters?.tenant) ||
      (() => { try { return cleanTenant(JSON.parse(event.body || "{}").tenant); } catch { return ""; } })()
  );
  if (!readAuth.ok) {
    if (event.httpMethod === "POST") await logWrite(event, { fn: "quotes", ok: false, status: readAuth.status });
    return jsonUnauthorized(readAuth);
  }

  try {
    connectLambda(event);
    const store = getStore("quotes");

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
        fn: "quotes", ok: true, role: readAuth.role,
        action: `issue quote ${incoming[0].quoteId || "—"} (${incoming[0].purpose}) · ${incoming.length} line(s) · ${incoming[0].customer || "—"}`,
        tenant,
      });
      return json(200, { ok: true, added: incoming.length, total: merged.length });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: "quotes store error", detail: String((err && err.message) || err) });
  }
};
