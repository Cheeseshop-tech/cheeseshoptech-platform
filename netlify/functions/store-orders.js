// Netlify Function: fetch a tenant's web orders from the Shopify Admin API (read_orders scope).
// Uses the Admin token (distinct from the Storefront token used for products in store.js).
// Activates when SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_TOKEN are set; the front end uses it via
// fetchStoreOrders() when VITE_STORE_BACKEND=shopify. Maps to the portal order shape (src/lib/store.js).
//
// AUTH FIX (2026-09-03, cst-hardening-plan.md app-wide guard audit): this had NO auth guard at
// all, unlike its sibling store.js (products) which got the same gap closed 2026-08-21. Worse
// than store.js's case -- this returns real customer names + order totals, not just product
// data -- and was harmless only because Shopify isn't configured for any live tenant yet. Same
// guard/pattern as store.js: single storefront, not per-tenant today, so the tenant arg is
// optional (blank = any signed-in role may read).

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";

const API_VERSION = "2024-10";

import { withMonitoring } from "./_sentry.js";

const rawHandler = async (event, context) => {
  const tenant = (event?.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
  const readAuth = requireReadAuth(event, tenant, context);
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!domain || !token) {
    return json(500, { error: "SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_TOKEN not configured" });
  }

  try {
    const res = await fetch(
      `https://${domain}/admin/api/${API_VERSION}/orders.json?status=any&limit=50`,
      { headers: { "X-Shopify-Access-Token": token, "content-type": "application/json" } },
    );
    if (!res.ok) return json(res.status, { error: `Shopify ${res.status}` });
    const body = await res.json();

    const orders = (body.orders || []).map((o) => ({
      id: o.name || `#${o.order_number}`,
      customer: [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ") || o.email || "Guest",
      total: Number(o.total_price || 0),
      status: orderStatus(o),
      date: (o.created_at || "").slice(0, 10),
    }));
    return json(200, { orders });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function orderStatus(o) {
  if (o.cancelled_at || o.financial_status === "refunded") return "Refunded";
  if (o.fulfillment_status === "fulfilled") return "Fulfilled";
  if (o.financial_status === "paid") return "Paid";
  return "Open";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=120" },
    body: JSON.stringify(body),
  };
}

export const handler = withMonitoring("store-orders", rawHandler);
