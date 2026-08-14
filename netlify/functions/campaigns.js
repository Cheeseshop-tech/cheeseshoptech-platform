// Netlify Function: fetch a tenant's CAMPAIGNS via a Make scenario webhook (server-side, like the
// CRM connector — zero new infra). Activates when MAKE_CAMPAIGNS_WEBHOOK_URL is set; the front end
// uses it when VITE_CAMPAIGNS_BACKEND=make. Make must return the campaign array shape in
// src/lib/campaigns.js (id, name, status, channels, start/end, goal, assets, kpis).

import { withMonitoring } from "./_sentry.js";

const rawHandler = async (event) => {
  const webhook = process.env.MAKE_CAMPAIGNS_WEBHOOK_URL;
  if (!webhook) return json(500, { error: "MAKE_CAMPAIGNS_WEBHOOK_URL not configured" });

  const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/g, "");
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
