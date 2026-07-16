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
// For the email-activity feed additionally: sales-email-read (degrades to an empty feed
// without it — check the JSON's activityNote field when the card doesn't show).
const CHANNEL_PROPERTY = "channel";

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";

const HUBSPOT_SEARCH = "https://api.hubapi.com/crm/v3/objects/companies/search";
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // safety cap — up to 1000 companies; raise if the tenant grows past that

export const handler = async (event) => {
  // Any valid passcode tier (2026-07-16, wiring-audit P0 #1) — this returns the tenant's full
  // company/contact/email-activity data; a bare URL used to get all of it with zero auth.
  const readAuth = requireReadAuth(event, event.queryStringParameters?.tenant || "");
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return json(500, { error: "HUBSPOT_TOKEN not configured" });

  try {
    const [companies, contactsTotal, emailActivity] = await Promise.all([
      fetchAllCompanies(token),
      fetchContactsTotal(token),
      // Never let the activity feed break the core CRM payload — degrade to empty.
      fetchEmailActivity(token).catch((e) => ({ activity: [], activityNote: `email fetch failed: ${e?.message || e}` })),
    ]);

    return json(200, {
      contacts: contactsTotal,
      companies,
      // Pipeline/orders/invoices not wired yet — see SCOPE NOTE above. Leave empty so the
      // dashboard hides those cards (command-center.jsx guards on array length) rather
      // than showing misleading all-zero rows.
      pipeline: [],
      orders: [],
      invoices: [],
      // LIVE (2026-07-06): recent sales-email engagements (sends / replies / bounces) — the
      // Asiago Touch 1 feed. Needs private-app scope `sales-email-read`; without it this
      // degrades to [] and the card hides itself (activityNote says why — check via curl).
      activity: emailActivity.activity,
      ...(emailActivity.activityNote ? { activityNote: emailActivity.activityNote } : {}),
    });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

// ---- Email activity (sales-email engagements) ---------------------------------------------
// 3 requests total: search recent email objects → batch-read their contact associations →
// batch-read those contacts' names. Maps to the dashboard activity shape {who, what, when}.
const EMAIL_LIMIT = 20;

async function fetchEmailActivity(token) {
  const headers = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

  // 1) Most recent email engagements.
  const search = await fetch("https://api.hubapi.com/crm/v3/objects/emails/search", {
    method: "POST",
    headers,
    body: JSON.stringify({
      limit: EMAIL_LIMIT,
      sorts: [{ propertyName: "hs_timestamp", direction: "DESCENDING" }],
      properties: ["hs_timestamp", "hs_email_subject", "hs_email_direction", "hs_email_status"],
    }),
  });
  if (search.status === 403) {
    // Private app is missing the sales-email-read scope — not an error, just not enabled yet.
    return { activity: [], activityNote: "HubSpot token lacks sales-email-read scope" };
  }
  if (!search.ok) throw new Error(`HubSpot emails search ${search.status}`);
  const emails = (await search.json()).results || [];
  if (!emails.length) return { activity: [] };

  // 2) Email → contact associations (one batch call); 3) contact names (one batch call).
  // Both are enrichment — the feed still works if either fails.
  const contactIdByEmail = {};
  const contactNames = {};
  try {
    const assocRes = await fetch("https://api.hubapi.com/crm/v4/associations/emails/contacts/batch/read", {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: emails.map((e) => ({ id: e.id })) }),
    });
    if (assocRes.ok) {
      for (const a of ((await assocRes.json()).results || [])) {
        const cid = a.to?.[0]?.toObjectId;
        if (cid != null && a.from?.id) contactIdByEmail[a.from.id] = String(cid);
      }
      const ids = [...new Set(Object.values(contactIdByEmail))];
      if (ids.length) {
        const cRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/read", {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: ids.map((id) => ({ id })),
            properties: ["firstname", "lastname", "email", "company"],
          }),
        });
        if (cRes.ok) {
          for (const c of ((await cRes.json()).results || [])) {
            const p = c.properties || {};
            const name = [p.firstname, p.lastname].filter(Boolean).join(" ") || p.email || "";
            contactNames[c.id] = p.company ? `${name} — ${p.company}` : name;
          }
        }
      }
    }
  } catch { /* enrichment only */ }

  const activity = emails.map((e) => {
    const p = e.properties || {};
    const subject = p.hs_email_subject || "(no subject)";
    const incoming = (p.hs_email_direction || "").includes("INCOMING");
    const bounced = (p.hs_email_status || "") === "BOUNCED";
    const verb = bounced ? "Bounced" : incoming ? "Reply" : "Sent";
    return {
      who: contactNames[contactIdByEmail[e.id]] || (incoming ? "Inbound email" : "Outbound email"),
      what: `${verb}: ${subject}`,
      when: relTime(p.hs_timestamp),
    };
  });
  return { activity };
}

// "2h ago" style relative time — matches the mock's `when` strings the card was styled around.
function relTime(ts) {
  const t = ts ? new Date(ts).getTime() : NaN;
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

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
