// Netlify Function: serve a tenant's LIVE market news at runtime (no app rebuild).
// Reads the latest news array from Netlify Blobs (written by market-news-publish.js, which the
// overnight research routine calls). If Blobs is empty/unavailable, returns {news:null} so the
// front end falls back to the bundled sample in src/data/<tenant>/market-news.json.
//
// Front end uses this when VITE_MARKETNEWS_BACKEND=function (see src/lib/market-news.js).
// Mirrors inventory.js exactly — same Blobs-or-fallback contract, same read guard.
// Read side needs NO secret beyond the portal auth — it only returns trade headlines to display.
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

  // Same read tier as live inventory (wiring-audit P0 #1): any valid session/passcode may read.
  const readAuth = requireReadAuth(event, tenant, context);
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  if (!tenant) return json(400, { error: "Missing tenant" });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("market-news");
    const raw = await store.get(tenant); // string or null
    if (!raw) return json(200, { news: null, source: "none" }); // -> client uses bundled sample
    const rec = JSON.parse(raw); // { news, updatedAt }
    return json(200, {
      news: Array.isArray(rec.news) ? rec.news : rec,
      source: "blobs",
      updatedAt: rec.updatedAt || null,
    });
  } catch (err) {
    // Blobs not provisioned / transient error: degrade gracefully to the bundled sample.
    return json(200, { news: null, source: "error", error: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("market-news", rawHandler);
