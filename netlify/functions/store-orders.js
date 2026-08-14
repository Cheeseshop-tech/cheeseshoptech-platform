// Netlify Function: fetch a tenant's web orders from the Shopify Admin API (read_orders scope).
// Uses the Admin token (distinct from the Storefront token used for products in store.js).
// Activates when SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_TOKEN are set; the front end uses it via
// fetchStoreOrders() when VITE_STORE_BACKEND=shopify. Maps to the portal order shape (src/lib/store.js).

const API_VERSION = "2024-10";

import { withMonitoring } from "./_sentry.js";

const rawHandler = async () => {
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
