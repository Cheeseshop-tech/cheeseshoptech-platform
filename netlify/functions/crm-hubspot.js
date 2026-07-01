// Netlify Function: real HubSpot CRM data for the Opportunity Engine (Slice 2, scoped).
// Uses HUBSPOT_TOKEN as a Bearer token SERVER-SIDE only — never reaches the browser. READ-ONLY.
//
// SCOPE NOTE (2026-07-01): HubSpot has 0 deal records for this tenant today, so this function
// does NOT attempt to populate pipeline/orders/invoices — those stay on mock (see crm.js MOCK)
// until deal-stage tracking actually exists in HubSpot. What this DOES wire live: the account
// list (companies + their Channel property) that feeds rankOpportunities() via accountsFromCrm()
// in lib/opportunities.js — i.e. real accounts × market signals × brand voice, for real.
//
// Company property "channel" — INTERNAL NAME ASSUMED, NOT YET CONFIRMED. HubSpot auto-generates
// internal names (usually lowercase, spaces→underscores) from the property label "Channel" shown
// in Settings > Properties > Company properties. If this returns channel:null for every company,
// open that property in HubSpot and check its internal name, then fix CHANNEL_PROPERTY below.
// Service-key scopes required: crm.objects.companies.read, crm.objects.contacts.read.
const CHANNEL_PROPERTY = "channel";

const HUBSPOT_SEARCH = "https://api.hubapi.com/crm/v3/objects/companies/search";
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // safety cap — up to 1000 companies; raise if the tenant grows past that

export const handler = async () => {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return json(500, { error: "HUBSPOT_TOKEN not configured" });

  try {
    const [companies, contactsTotal] = await Promise.all([
      fetchAllCompanies(token),
      fetchContactsTotal(token),
    ]);

    return json(200, {
      contacts: contactsTotal,
      companies,
      // Not wired yet — see SCOPE NOTE above. Leave empty so the dashboard hides those
      // cards (command-center.jsx guards Pipeline/Recent-activity on array length) rather
      // than showing misleading all-zero rows.
      pipeline: [],
      orders: [],
      invoices: [],
      activity: [],
    });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

async function fetchAllCompanies(token) {
  const out = [];
  let after;
  for (let page = 0; page < MAX_PAGES; page++) {
    const body = {
      limit: PAGE_SIZE,
      properties: ["name", CHANNEL_PROPERTY],
      ...(after ? { after } : {}),
    };
    const res = await fetch(HUBSPOT_SEARCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HubSpot companies search ${res.status}`);
    const data = await res.json();
    for (const r of data.results || []) {
      out.push({
        id: r.id,
        name: r.properties?.name || "(no name)",
        channel: r.properties?.[CHANNEL_PROPERTY] || null,
      });
    }
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}

async function fetchContactsTotal(token) {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ limit: 1 }),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data.total === "number" ? data.total : 0;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=120" },
    body: JSON.stringify(body),
  };
}
