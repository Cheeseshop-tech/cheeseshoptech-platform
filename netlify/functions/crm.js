// Netlify Function: fetch a tenant's CRM dataset for the dashboard.
// Proxies a Make scenario webhook server-side so CRM tokens / the webhook URL never reach the
// browser. Activates when MAKE_WEBHOOK_URL is set in Netlify (see .env.example).
// Front end uses this when VITE_CRM_BACKEND=make. Make must return the shape in docs/CRM_CONNECTOR.md.

export const handler = async (event) => {
  const webhook = process.env.MAKE_WEBHOOK_URL;
  if (!webhook) return json(500, { error: "MAKE_WEBHOOK_URL not configured" });

  const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/g, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenant }),
    });
    if (!res.ok) return json(res.status, { error: `Make ${res.status}` });
    const data = await res.json();
    return json(200, data);
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
