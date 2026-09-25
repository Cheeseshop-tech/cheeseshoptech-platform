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
// For the email-activity feed additionally: crm.objects.emails.read (NOT the legacy
// `sales-email-read`, deprecated Sept 2025 — see fetchEmailActivity) (degrades to an empty feed
// without it — check the JSON's activityNote field when the card doesn't show).
const CHANNEL_PROPERTY = "channel";
// Lead taxonomy (docs/LEAD_TAXONOMY.md): `channel` is the coarse route to market and is
// already populated on 189 companies; these two are the finer grain added alongside it.
// Both are safe to request before they exist in HubSpot — unknown properties come back
// undefined rather than erroring, so this ships ahead of the HubSpot-side setup.
const BUSINESS_TYPE_PROPERTY = "business_type";
const CONTACT_ROLE_PROPERTY = "contact_role";

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";

import { withMonitoring } from "./_sentry.js";
const HUBSPOT_SEARCH = "https://api.hubapi.com/crm/v3/objects/companies/search";
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // safety cap — up to 1000 companies; raise if the tenant grows past that

const rawHandler = async (event, context) => {
  // Any valid passcode tier (2026-07-16, wiring-audit P0 #1) — this returns the tenant's full
  // company/contact/email-activity data; a bare URL used to get all of it with zero auth.
  const readAuth = requireReadAuth(event, event.queryStringParameters?.tenant || "", context);
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
      // EVERY contact, not just the one joined onto each company above (2026-08-07). These were
      // already fetched and then discarded — the primary-contact join reduced the whole people
      // list to one per company and dropped the rest. Field sales needs all of them (a
      // distributor has a buyer AND a category manager AND a chef), and passing them through
      // costs no extra HubSpot calls: same fetch, one more field on the response. Bounded by
      // the same MAX_PAGES × PAGE_SIZE cap the companies list already carries.
      people: contactsRes.people,
      // Pipeline/orders/invoices not wired yet — see SCOPE NOTE above. Leave empty so the
      // dashboard hides those cards (command-center.jsx guards on array length) rather
      // than showing misleading all-zero rows.
      pipeline: [],
      orders: [],
      invoices: [],
      // LIVE (2026-07-06): recent sales-email engagements (sends / replies / bounces) — the
      // Asiago Touch 1 feed. Needs private-app scope `crm.objects.emails.read`; without it this
      // degrades to [] and the card hides itself (activityNote says why — check via curl).
      activity: emailActivity.activity,
      ...(emailActivity.activityNote ? { activityNote: emailActivity.activityNote } : {}),
    });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

// ---- Email activity (sales-email engagements) ---------------------------------------------
//
// REWRITTEN 2026-09-26 — now reads the ENGAGEMENTS v1 API, not /crm/v3/objects/emails/search.
//
// These are two different APIs with two different scope requirements, and the old code was
// knocking on the wrong door:
//   · /crm/v3/objects/emails/search  needs `crm.objects.emails.read` — a scope HubSpot does not
//     offer in the private-app scope picker (confirmed live on this portal 2026-09-26).
//   · /engagements/v1/...            needs `sales-email-read` + `crm.objects.contacts.read`,
//     BOTH of which this app now has. `sales-email-read` IS in the picker — Rick found it and
//     granted it 2026-09-26, after an earlier note here wrongly called it deprecated/absent.
//
// So the old call could never have succeeded, and it 403'd on EVERY crm-hubspot request — one
// wasted HubSpot API call and one logged error per CRM page load, for months, silently. That is
// the bug behind the "bunch of API call errors in HubSpot" Rick spotted. A 403 that is handled
// gracefully is still a 403 on someone's dashboard.
//
// Bonus: v1 returns the contact associations inline, so this is ONE request where the old path
// took three (search → association batch-read → contact batch-read).
const EMAIL_LIMIT = 20;
const EMAIL_TYPES = new Set(["EMAIL", "INCOMING_EMAIL", "FORWARDED_EMAIL"]);

async function fetchEmailActivity(token) {
  const headers = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

  // Recent engagements, newest first. `count` is engagements of ALL types, so ask for more than
  // EMAIL_LIMIT and filter down — otherwise a busy day of calls/notes crowds the emails out.
  const res = await fetch(
    `https://api.hubapi.com/engagements/v1/engagements/recent/modified?count=${EMAIL_LIMIT * 5}`,
    { headers }
  );
  if (res.status === 403) {
    // Still not switched on. Name the scope that ACTUALLY grants this endpoint, and say where.
    return {
      activity: [],
      activityNote: "HubSpot app lacks the sales-email-read scope (Settings → Integrations → Private Apps → Scopes)",
    };
  }
  if (!res.ok) throw new Error(`HubSpot engagements ${res.status}`);

  const results = (await res.json()).results || [];
  const emails = results
    .filter((r) => EMAIL_TYPES.has(r.engagement?.type))
    .slice(0, EMAIL_LIMIT);
  if (!emails.length) return { activity: [] };

  // Contact names, one batch call. Pure enrichment — the feed still renders without it, showing
  // "Outbound email" instead of a person's name.
  const contactNames = {};
  const ids = [...new Set(emails.flatMap((e) => e.associations?.contactIds || []).map(String))].slice(0, 100);
  if (ids.length) {
    try {
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
    } catch { /* enrichment only */ }
  }

  const activity = emails.map((e) => {
    const meta = e.metadata || {};
    const subject = meta.subject || "(no subject)";
    const incoming = e.engagement?.type === "INCOMING_EMAIL";
    // v1 exposes per-recipient delivery status; BOUNCE anywhere in the thread is worth flagging.
    const bounced = (meta.status || "") === "BOUNCED"
      || (meta.to || []).some((t) => (t.status || "") === "BOUNCED");
    const verb = bounced ? "Bounced" : incoming ? "Reply" : "Sent";
    const cid = (e.associations?.contactIds || [])[0];
    return {
      who: contactNames[String(cid)] || (incoming ? "Inbound email" : "Outbound email"),
      what: `${verb}: ${subject}`,
      when: relTime(e.engagement?.timestamp),
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
      // city/state/address/zip/domain/phone: standard HubSpot company properties (city/state/
      // domain/phone populated by the 2026-07-22 campaign import; address/zip added 2026-09-09
      // for the prospect quick-look card). Power the CRM outreach console's location column,
      // region filter, site links, and the quick-look card's full address. Absent values come
      // back undefined → null below.
      // ENGAGEMENT ROLL-UP (2026-09-26) — notes_last_contacted / notes_last_updated /
      // num_contacted_notes / hs_last_logged_call_date / hs_last_booked_meeting_date.
      //
      // This is the replacement for the email-activity feed, and it is strictly better. The old
      // feed read /crm/v3/objects/emails/search, which needs `crm.objects.emails.read` — a scope
      // that is NOT offered in the private-app scope picker for this portal (confirmed live
      // 2026-09-26; the legacy `sales-email-read` it used to name was deprecated by HubSpot in
      // Sept 2025). So that feed could never be switched on, whatever anyone ticked.
      //
      // HubSpot already rolls the same history up onto the COMPANY object, and it comes free with
      // crm.objects.companies.read, which this function has always had. notes_last_contacted is
      // defined by HubSpot as "the last time a call, chat conversation, LinkedIn message, postal
      // mail, meeting, SALES EMAIL, SMS, or WhatsApp message was logged for a company."
      //
      // It also fixes a real defect rather than just working around a scope: the old feed had no
      // companyId to join on and fell back to substring-matching the shop name (see the comment
      // in crm-page.jsx's ProspectCard), which mis-attributes "Baldor" vs "Baldor Specialty
      // Foods". These properties ARE on the company row, so there is no join to get wrong.
      // Verified populated on 66 companies at time of writing.
      properties: [
        "name", CHANNEL_PROPERTY, BUSINESS_TYPE_PROPERTY, "city", "state", "address", "zip", "domain", "phone",
        "notes_last_contacted", "notes_last_updated", "num_contacted_notes",
        "hs_last_logged_call_date", "hs_last_booked_meeting_date",
      ],
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
        // Fine-grained class (docs/LEAD_TAXONOMY.md). Null until the property exists in
        // HubSpot — the app falls back to guessing from `channel`, so this is additive.
        businessType: r.properties?.[BUSINESS_TYPE_PROPERTY] || null,
        city: r.properties?.city || null,
        state: r.properties?.state || null,
        // Street address + zip (2026-09-09, prospect quick-look card) — standard HubSpot
        // company properties, not previously requested. Absent on many records; the UI shows
        // whatever's populated rather than requiring all four.
        address: r.properties?.address || null,
        zip: r.properties?.zip || null,
        domain: r.properties?.domain || null,
        phone: r.properties?.phone || null,
        // Engagement roll-up. `lastContacted` is the headline — the last outbound or logged
        // touch of any kind, sales email included. `timesContacted` gives it weight: "today, 89
        // touches" is a very different account from "today, 1". Nulls are expected and normal —
        // a company nobody has contacted yet simply has none of these.
        lastContacted: r.properties?.notes_last_contacted || null,
        lastActivity: r.properties?.notes_last_updated || null,
        timesContacted: Number(r.properties?.num_contacted_notes) || 0,
        lastCall: r.properties?.hs_last_logged_call_date || null,
        lastMeeting: r.properties?.hs_last_booked_meeting_date || null,
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
      properties: ["firstname", "lastname", "email", "phone", "company", CONTACT_ROLE_PROPERTY],
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
        role: p[CONTACT_ROLE_PROPERTY] || null,
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

export const handler = withMonitoring("crm-hubspot", rawHandler);
