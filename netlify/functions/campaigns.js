// Netlify Function: fetch a tenant's CAMPAIGNS via a Make scenario webhook (server-side, like the
// CRM connector — zero new infra). Activates when MAKE_CAMPAIGNS_WEBHOOK_URL is set; the front end
// uses it when VITE_CAMPAIGNS_BACKEND=make. Make must return the campaign array shape in
// src/lib/campaigns.js (id, name, status, channels, start/end, goal, assets, kpis).
//
// AUTH FIX (2026-08-21, found while wiring the Integration health panel's live Test button): this
// had NO auth guard at all -- same gap as store.js (see that file's header for the full
// rationale). Harmless today since MAKE_CAMPAIGNS_WEBHOOK_URL isn't configured yet, but would
// otherwise be a live, completely open read the moment it is. Same guard/pattern as every other
// tenant-scoped read function.

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";
import { withMonitoring } from "./_sentry.js";

const rawHandler = async (event, context) => {
  const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/g, "");

  const readAuth = requireReadAuth(event, tenant, context);
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  const webhook = process.env.MAKE_CAMPAIGNS_WEBHOOK_URL;
  if (!webhook) return json(500, { error: "MAKE_CAMPAIGNS_WEBHOOK_URL not configured" });

  if (!tenant) return json(400, { error: "Missing tenant" });

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenant }),
    });
    if (!res.ok) return json(res.status, { error: `Make ${res.status}` });
    return json(200, await res.json());
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=120" },
    body: JSON.stringify(body),
  };
}

export const handler = withMonitoring("campaigns", rawHandler);
