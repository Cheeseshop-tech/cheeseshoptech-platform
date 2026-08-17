// Netlify Function: serve a tenant's LIVE inventory at runtime (no app rebuild).
// Reads the latest inventory JSON from Netlify Blobs (written by inventory-publish.js,
// which the weekly sync calls). If Blobs is empty/unavailable, returns {inventory:null}
// so the front end falls back to the bundled snapshot in src/data/<tenant>/inventory.json.
//
// Front end uses this when VITE_PRICING_BACKEND=function (see src/lib/pricing.js).
// Read side needs NO secret — it only returns inventory/stock for the app to display.
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

  // Any valid passcode tier (2026-07-16, wiring-audit P0 #1) — live stock used to be readable
  // from a bare URL with zero auth. Guard sits AFTER the OPTIONS branch so preflight still works.
  const readAuth = requireReadAuth(event, tenant, context);
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  if (!tenant) return json(400, { error: "Missing tenant" });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("inventory");
    const raw = await store.get(tenant); // string or null
    if (!raw) return json(200, { inventory: null, source: "none" }); // -> client uses bundled fallback
    const rec = JSON.parse(raw); // { inventory, updatedAt }
    return json(200, { inventory: rec.inventory ?? rec, source: "blobs", updatedAt: rec.updatedAt || null });
  } catch (err) {
    // Blobs not provisioned / transient error: degrade gracefully to bundled fallback.
    return json(200, { inventory: null, source: "error", error: String(err && err.message || err) });
  }
};

export const handler = withMonitoring("inventory", rawHandler);
