// Netlify Function: serve a tenant's LIVE "Priority — response needed" attention items at
// runtime (no app rebuild). Reads the latest items array from Netlify Blobs (written by
// attention-publish.js, which scripts/publish-attention.mjs calls from the Gmail-driven
// priority-response automation). If Blobs is empty/unavailable, returns {items:null} so the
// front end falls back to the bundled sample in src/data/<tenant>/attention.json.
//
// Front end uses this when VITE_ATTENTION_BACKEND=function (see src/lib/attention.js).
// Mirrors market-news.js exactly — same Blobs-or-fallback contract, same read guard.
import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";

import { withMonitoring } from "./_sentry.js";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode",
};
const json = (status, body, extra = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...extra },
  body: JSON.stringify(body),
});

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");

  // Same read tier as live inventory/market-news: any valid session/passcode may read.
  const readAuth = requireReadAuth(event, tenant, context);
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  if (!tenant) return json(400, { error: "Missing tenant" });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("attention");
    const raw = await store.get(tenant); // string or null
    if (!raw) return json(200, { items: null, source: "none" }); // -> client uses bundled sample
    const rec = JSON.parse(raw); // { items, updatedAt }
    return json(200, {
      items: Array.isArray(rec.items) ? rec.items : rec,
      source: "blobs",
      updatedAt: rec.updatedAt || null,
    });
  } catch (err) {
    // Blobs not provisioned / transient error: degrade gracefully to the bundled sample.
    return json(200, { items: null, source: "error", error: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("attention-list", rawHandler);
