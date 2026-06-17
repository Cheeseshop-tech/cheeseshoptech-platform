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
  let recentContacts = [];
  for (const obj of OBJECTS) {
    try {
      // Contacts: pull the 10 newest WITH fields (powers the CRM page list). Companies/deals: count only.
      const body = obj === "contacts"
        ? { limit: 10, sorts: [{ propertyName: "createdate", direction: "DESCENDING" }], properties: ["firstname", "lastname", "email", "company", "createdate"] }
        : { limit: 1 };
      const res = await fetch(`https://api.hubapi.com/crm/v3/objects/${obj}/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { errors[obj] = res.status; counts[obj] = null; continue; }
      const data = await res.json();
      counts[obj] = typeof data.total === "number" ? data.total : (data.results?.length ?? null);
      if (obj === "contacts" && Array.isArray(data.results)) {
        recentContacts = data.results.map((r) => ({
          id: r.id,
          name: [r.properties?.firstname, r.properties?.lastname].filter(Boolean).join(" ") || r.properties?.email || "(no name)",
          email: r.properties?.email || "",
          company: r.properties?.company || "",
          created: r.properties?.createdate || r.createdAt || "",
        }));
      }
    } catch (e) {
      errors[obj] = String(e?.message || e);
      counts[obj] = null;
    }
  }

  const ok = OBJECTS.some((o) => typeof counts[o] === "number");
  return json(ok ? 200 : 502, { ok, counts, recentContacts, errors });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=60" },
    body: JSON.stringify(body),
  };
}
