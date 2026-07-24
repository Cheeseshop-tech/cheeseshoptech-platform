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
    // HubSpot caps CRM *search* endpoints at ~4 req/s per token. The companies + contacts
    // sweeps are up to 10 paginated searches EACH — run them SEQUENTIALLY (≈2-3 req/s) so a
    // parallel burst can't 429 the whole payload into zeros. Email activity (3 non-search-heavy
    // calls) still runs alongside. hsSearch() below adds a 429/5xx backoff retry on every page.
    const emailActivityP = fetchEmailActivity(token).catch((e) => ({ activity: [], activityNote: `email fetch failed: ${e?.message || e}` }));
    const companies = await fetchAllCompanies(token);
    const contactsRes = await fetchAllContacts(token);
    const emailActivity = await emailActivityP;
    const contactsTotal = contactsRes.total;
    // Join a PRIMARY CONTACT onto each company. Two keys, tried in order:
    //   1. Normalized company name — the 2026-07-22 import stored each contact's company as
    //      free text (no HubSpot association records), so the name is the honest first key.
    //   2. Email domain ↔ company website domain — the 2026-07-24 audit found 268 companies
    //      whose contacts carry emails at the company's own domain but with blank/mismatched
    //      company text; the name join alone left all of them showing "no email".
    // Prefer a contact WITH an email; on the domain key, prefer a NAMED contact.
    const byCompany = {};
    for (const p of contactsRes.people) {
      const key = norm(p.company);
      if (!key) continue;
      if (!byCompany[key] || (!byCompany[key].email && p.email)) byCompany[key] = p;
    }
    // Freemail domains carry no company signal — never join on them.
    const FREEMAIL = new Set(["gmail.com","yahoo.com","hotmail.com","aol.com","outlook.com","icloud.com","me.com","msn.com","live.com","comcast.net","verizon.net","sbcglobal.net","att.net","earthlink.net","protonmail.com","ymail.com"]);
    const byEmailDomain = {};
    for (const p of contactsRes.people) {
      const dom = String(p.email || "").split("@")[1]?.toLowerCase();
      if (!dom || FREEMAIL.has(dom)) continue;
      const cur = byEmailDomain[dom];
      if (!cur || (!cur.name && p.name)) byEmailDomain[dom] = p;
    }
    for (const c of companies) {
      const cdom = String(c.domain || "").toLowerCase().replace(/^www\./, "");
      const p = byCompany[norm(c.name)] || (cdom ? byEmailDomain[cdom] : null);
      if (p) { c.owner = p.name || null; c.ownerEmail = p.email || null; c.ownerPhone = p.phone || null; }
      else { c.owner = null; c.ownerEmail = null; c.ownerPhone = null; }
    }

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

// One CRM-search POST with backoff retry on 429/5xx (429 = the 4-req/s search cap).
// Returns the parsed JSON, or null after the retries are exhausted — callers degrade to
// partial results instead of blanking the whole console.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function hsSearch(token, url, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await sleep(400 * (attempt + 1)); continue; }
    return null; // 4xx other than 429: retrying won't help
  }
  return null;
}

async function fetchAllCompanies(token) {
  const out = [];
  let after;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await hsSearch(token, HUBSPOT_SEARCH, {
      limit: PAGE_SIZE,
      // city/state/domain/phone: standard HubSpot company properties (populated by the
      // 2026-07-22 campaign import) — power the CRM outreach console's location column,
      // region filter, and site links. Absent values come back undefined → null below.
      properties: ["name", CHANNEL_PROPERTY, "city", "state", "domain", "phone"],
      ...(after ? { after } : {}),
    });
    if (!data) break; // degrade: serve what we have rather than 502 the payload
    for (const r of data.results || []) {
      out.push({
        id: r.id,
        // Nameless companies are HubSpot auto-creates (from contact email domains) — show the
        // domain instead of a "(no name)" wall at the top of the alphabetically-sorted console.
        name: r.properties?.name || r.properties?.domain || "(no name)",
        channel: r.properties?.[CHANNEL_PROPERTY] || null,
        city: r.properties?.city || null,
        state: r.properties?.state || null,
        domain: r.properties?.domain || null,
        phone: r.properties?.phone || null,
      });
    }
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}

// All contacts (name/email/phone/company), paginated like companies — powers the per-company
// primary-contact join for the outreach console. total comes from the first page's `total`.
async function fetchAllContacts(token) {
  const people = [];
  let total = 0;
  let after;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await hsSearch(token, "https://api.hubapi.com/crm/v3/objects/contacts/search", {
      limit: PAGE_SIZE,
      properties: ["firstname", "lastname", "email", "phone", "company"],
      ...(after ? { after } : {}),
    });
    if (!data) break; // degrade: whatever we joined so far still renders
    if (page === 0 && typeof data.total === "number") total = data.total;
    for (const r of data.results || []) {
      const p = r.properties || {};
      people.push({
        name: [p.firstname, p.lastname].filter(Boolean).join(" ") || null,
        email: p.email || null,
        phone: p.phone || null,
        company: p.company || null,
      });
    }
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return { total: total || people.length, people };
}

// Normalized company-name key for the contact join (case/punctuation/whitespace-insensitive).
function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=120" },
    body: JSON.stringify(body),
  };
}
