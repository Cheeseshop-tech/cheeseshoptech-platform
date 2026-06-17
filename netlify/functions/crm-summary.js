// Netlify Function: read-only HubSpot CRM summary (direct, via the Service Key).
// Uses HUBSPOT_TOKEN as a Bearer token SERVER-SIDE only — never reaches the browser. READ-ONLY:
// hits the CRM search endpoint to return total counts of contacts / companies / deals. This is the
// "direct HubSpot" path (separate from the Make-webhook proxy in crm.js, which stays for the future
// Make seam). Surfaced by the Integration-health panel's "HubSpot CRM (read-only)" Test row.
// Service-key scopes required: crm.objects.{contacts,companies,deals}.read.
// Additive + read-only — cannot modify any CRM data. See docs/INTEGRATION_WIRING_BRIEF.md.

const OBJECTS = ["contacts", "companies", "deals"];

export const handler = async () => {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return json(500, { ok: false, error: "HUBSPOT_TOKEN not configured" });

  const counts = {};
  const errors = {};
  for (const obj of OBJECTS) {
    try {
      const res = await fetch(`https://api.hubapi.com/crm/v3/objects/${obj}/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ limit: 1 }), // we only need `total`, not the records
      });
      if (!res.ok) { errors[obj] = res.status; counts[obj] = null; continue; }
      const data = await res.json();
      counts[obj] = typeof data.total === "number" ? data.total : (data.results?.length ?? null);
    } catch (e) {
      errors[obj] = String(e?.message || e);
      counts[obj] = null;
    }
  }

  const ok = OBJECTS.some((o) => typeof counts[o] === "number");
  return json(ok ? 200 : 502, { ok, counts, errors });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=60" },
    body: JSON.stringify(body),
  };
}
