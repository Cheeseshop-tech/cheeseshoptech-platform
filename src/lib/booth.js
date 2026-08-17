// Booth-to-Meeting data layer (BOOTH_TO_MEETING_HANDOFF.md §5, §6).
//
// The one thing this tool has to survive is a dead room. Ace Endico's Fall Food Show is four
// hours in a warehouse with one 6-foot table and no promised wifi, so EVERY capture is written to
// localStorage FIRST and reaches the network only later, if at all. Nothing in the booth flow
// awaits a fetch. That inverts the rest of the portal, where crm.js reads HubSpot live and
// degrades to an empty dataset — acceptable at a desk, useless at a booth, because a rep who
// loses one conversation has lost the only copy of it.
//
// Read path (accounts) : crm.js → HubSpot live → SNAPSHOT here → drill-down reads the snapshot.
// Write path (captures): local doc → (rep taps Sync) → crm-push.js → HubSpot contacts.
//
// crm-push.js is dry-run by default and passcode-guarded; this module never passes commit
// itself — the UI has to ask for it. HubSpot stays the CRM of record either way.

import { authHeaders } from "./auth-context.jsx";
import { seedFor } from "./items-seeds.js";
import { businessTypeLabel, contactRoleLabel, isMultiplierRole, channelForBusinessType } from "./lead-taxonomy.js";

const VERSION = 1;
const docKey = (tenantId) => `cst.booth.${tenantId}.v${VERSION}`;
const acctKey = (tenantId) => `cst.booth.${tenantId}.accounts.v${VERSION}`;

// §6 FollowUp.type, plus kitchen_tasting from the §3 escalation ladder. Label is what the rep
// taps; `ask` is how it reads in the recap, written from the buyer's side of the table.
export const FOLLOW_UP_TYPES = [
  { key: "sales_visit", label: "Sales visit — present the line", ask: "come by and walk you through the full line" },
  { key: "sample_dropoff", label: "Sample drop-off", ask: "drop samples at your kitchen" },
  { key: "kitchen_tasting", label: "Kitchen tasting", ask: "run a tasting with your kitchen team" },
  { key: "order_expansion_review", label: "Order review / expand SKUs", ask: "review your current order and where it could expand" },
  { key: "follow_up_call", label: "Follow-up call", ask: "give you a call" },
];

export const TEMPERATURES = ["hot", "warm", "cold"];

// How the next step was left. The handoff assumed a confirmed slot was the only real outcome,
// but at a table most buyers won't commit to a clock time — they'll commit to a WEEK. Forcing an
// exact datetime pushes reps to either invent one or record nothing, and recording nothing is the
// failure this tool exists to prevent. So a window is a first-class outcome, and asking them to
// pick is a third, weaker one that's still better than a blank.
export const NEXT_STEP_MODES = {
  time:    { key: "time",    label: "Confirmed time",   weight: 2 },
  window:  { key: "window",  label: "Agreed window",    weight: 1 },
  request: { key: "request", label: "Request sent",     weight: 0 },
};

// Relative windows a buyer actually says out loud. `days` is only used to sort the follow-up
// queue — the LABEL is what the buyer agreed to and what the recap repeats back.
export const FOLLOW_UP_WINDOWS = [
  { key: "this_week",  label: "this week",           days: 5 },
  { key: "next_week",  label: "next week",           days: 12 },
  { key: "two_weeks",  label: "in the next two weeks", days: 14 },
  { key: "this_month", label: "before the end of the month", days: 30 },
  { key: "next_month", label: "next month",          days: 45 },
];

/** The catalog the booth picks products from. Read from the BUNDLED per-tenant seed, so the SKU
 *  list is in the JS the tablet already downloaded — no fetch, no cache to warm, works in a dead
 *  room on the first tap. */
// Some seed rows carry embedded newlines and double spaces from the source price sheet (e.g.
// 40158's packSize is "AGED MORE THAN 12 MONTHS\nWhole Wheels…"). Harmless in the Media Hub,
// but here the same string is rendered as a one-line spec AND pasted into a buyer's email, so
// it gets flattened once on read rather than patched at every render site.
const flat = (v) => String(v || "").replace(/\s+/g, " ").trim();

export function boothCatalog(tenantFolder) {
  const seed = seedFor(tenantFolder);
  if (!seed?.items) return [];
  return Object.values(seed.items)
    .filter((i) => i?.sku && i?.name)
    .map((i) => ({
      sku: flat(i.sku), name: flat(i.name), packSize: flat(i.packSize), weight: flat(i.weight),
      milkType: flat(i.milkType), minAge: flat(i.minAge), certification: flat(i.certification),
      shortDescription: flat(i.shortDescription), longDescription: flat(i.longDescription),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku));
}

/** Substring match over name, SKU and pack size. Reps search by how they say it out loud
 *  ("asiago", "piave"), not by item number. */
export function searchCatalog(catalog, q, limit = 8) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return [];
  return catalog
    .filter((i) => `${i.name} ${i.sku} ${i.packSize} ${i.certification}`.toLowerCase().includes(needle))
    .slice(0, limit);
}

// ---- Deals ------------------------------------------------------------------------------
//
// There was no deal/promo concept anywhere in this codebase before now (Rick, 2026-08-07: "deals
// still need to be created"). Deliberate choices about where they live:
//
//   · IN TENANT CONFIG, not localStorage. Rick creates the show's offers once; a device-local
//     list would never reach the rep's tablet. Config ships in the bundle, so it's on every
//     device and works with no signal — the same reason the SKU seed lives there.
//   · NOT derived from the price list. A show offer ("10% on 3+ cases, order by Oct 1") is a
//     commercial decision with an expiry, not a computed number, and inventing one from pricing
//     data would put words in Rick's mouth in front of a buyer.
//   · A free-text fallback stays, because something always gets offered at a table that nobody
//     wrote down beforehand.
//
// Shape (config/clients/<tenant>.json → deals[]):
//   { key, label, detail, appliesTo?: ["<sku>"], expires?: "YYYY-MM-DD" }

/** Active deals for a tenant on a given date — expired offers never reach a buyer's recap. */
export function activeDeals(resolved, today = new Date()) {
  const stamp = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return (resolved?.deals || []).filter((d) => !d.expires || d.expires >= stamp);
}

/** Deals relevant to the SKUs picked — an offer with no `appliesTo` is a blanket offer. */
export function dealsForProducts(deals, products = []) {
  const skus = new Set(products.map((p) => p.sku));
  return deals.filter((d) => !d.appliesTo?.length || d.appliesTo.some((s) => skus.has(s)));
}

/** How a deal reads in the buyer's recap. */
export function dealLine(d) {
  return [d.label, d.detail].filter(Boolean).join(" — ");
}

/** Spec WITHOUT the name — for lists that already show the name in their own title. */
export function productSpec(p) {
  return [p.packSize, p.certification, p.minAge && p.minAge !== "—" ? p.minAge : ""]
    .filter(Boolean).join(" · ");
}

/** Name + spec — the line that goes in the buyer's recap, where nothing else names the product. */
export function productLine(p) {
  const spec = productSpec(p);
  return spec ? `${p.name} · ${spec}` : p.name;
}

// The §3 escalation ladder, encoded. A price/minimums question is the strongest signal a buyer
// gives at a table — they have already moved past "is this nice" to "what would this cost me" —
// so it outranks everything. A named item WITH a volunteered use case is the next tier: the buyer
// has done the placing work themselves. A taste with no specifics is nurture, and pushing there
// spends goodwill for nothing.
export function suggestTemperature({ products, useCase, priceQuestion } = {}) {
  if (priceQuestion) return "hot";
  if (products?.length && useCase?.trim()) return "warm";
  return "cold";
}

// What to ask for, given how hot it is (§5a step 5). Cold deliberately returns null — no ask.
export function suggestedFollowUp(temperature) {
  if (temperature === "hot") return "sales_visit";
  if (temperature === "warm") return "sample_dropoff";
  return null;
}

// ---- Local document --------------------------------------------------------------------

function emptyDoc() {
  return { version: VERSION, captures: [], updatedAt: null };
}

/** The tenant's booth doc from localStorage. Always returns a usable doc — a corrupt or
 *  half-written value is discarded rather than thrown, because the booth is the worst possible
 *  place to meet a crash screen. */
export function loadBooth(tenantId) {
  try {
    const raw = localStorage.getItem(docKey(tenantId));
    if (!raw) return emptyDoc();
    const doc = JSON.parse(raw);
    if (!doc || !Array.isArray(doc.captures)) return emptyDoc();
    return { ...emptyDoc(), ...doc };
  } catch {
    return emptyDoc();
  }
}

/** Persist the doc. Returns false if the write failed (quota, private mode) so the UI can say so
 *  out loud — a silent failure here loses the show's entire record. */
export function saveBooth(tenantId, doc) {
  try {
    localStorage.setItem(docKey(tenantId), JSON.stringify({ ...doc, version: VERSION, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

function newId() {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** A blank capture, optionally seeded from a CRM account (territory flow) or a card (booth flow). */
export function newCapture(seed = {}) {
  return {
    id: newId(),
    capturedAt: new Date().toISOString(),
    source: seed.source || "booth",     // "booth" | "territory"
    name: seed.name || "",
    title: seed.title || "",
    company: seed.company || "",
    companyId: seed.companyId || null,  // HubSpot id when it came from the account book
    // The website printed on the card. The OCR already reads it and card-scan.js uses it to match
    // the account in-session, but it was never PERSISTED — so by sync time the domain was gone.
    // It matters because domain is HubSpot's own company key, and the buyers' own emails can't
    // substitute: sampling the live portal, 12/12 unlinked contacts were on gmail/hotmail/aol.
    website: seed.website || "",
    email: seed.email || "",
    phone: seed.phone || "",           // the person's OWN direct line, if they have one
    // Most foodservice buyers aren't reached on a direct line — they're reached on the house
    // switchboard plus an extension (Rick, 2026-08-07). Kept as two fields so "the office number"
    // is never mistaken for someone's personal number, and so the extension survives into the
    // CRM instead of being buried in a note.
    officePhone: seed.officePhone || "",
    phoneExt: seed.phoneExt || "",
    city: seed.city || "",
    state: seed.state || "",
    // Lead classification (docs/LEAD_TAXONOMY.md). Two fields, not one, because they answer
    // different questions and live on different HubSpot objects: businessType describes the
    // COMPANY, contactRole describes the PERSON. A DSR is a person at a distributor — both.
    businessType: seed.businessType || "",
    contactRole: seed.contactRole || "",
    products: [],                       // [{sku,name,packSize,certification,...}] — real catalog rows
    useCase: seed.useCase || "",
    priceQuestion: false,
    dealKeys: [],                       // config deals offered at the table
    dealNote: "",                       // anything offered that isn't a configured deal
    notes: "",
    temperature: seed.temperature || "cold",
    followUpType: seed.followUpType || "",
    nextStepMode: "",                   // "time" | "window" | "request"
    whenISO: "",                        // local floating datetime — mode "time"
    windowKey: "",                      // FOLLOW_UP_WINDOWS key — mode "window"
    booked: false,                      // a next step was agreed (time OR window), not just asked
    requestedAt: null,                  // mode "request" — we asked them to pick
    // Card scan. The photo itself lives in IndexedDB under this capture's id (see card-scan.js);
    // only the state lives here. "pending" means the photo exists but hasn't been read yet —
    // the offline case — and the app retries it when a signal returns.
    scanState: seed.scanState || "none", // none | pending | read | failed | illegible
    scannedAt: null,
    scanMatch: null,                    // "existing-contact" | "new-at-known" | "new"
    scanNote: "",                       // why a read failed, shown in the banner (status + what was sent)
    recapSentAt: null,
    calendarAddedAt: null,             // set once the rep has taken it into Google Calendar
    pushedAt: null,
  };
}

export function addCapture(tenantId, capture) {
  const doc = loadBooth(tenantId);
  const next = { ...doc, captures: [capture, ...doc.captures] };
  saveBooth(tenantId, next);
  return next;
}

export function updateCapture(tenantId, id, part) {
  const doc = loadBooth(tenantId);
  const next = { ...doc, captures: doc.captures.map((c) => (c.id === id ? { ...c, ...part } : c)) };
  saveBooth(tenantId, next);
  return next;
}

export function removeCapture(tenantId, id) {
  const doc = loadBooth(tenantId);
  const next = { ...doc, captures: doc.captures.filter((c) => c.id !== id) };
  saveBooth(tenantId, next);
  return next;
}

// ---- Account snapshot (offline territory drill-down) -----------------------------------

/** Mirror the live HubSpot account book AND its contacts to localStorage so Territory Mode still
 *  works with the network gone. Stores only the fields the drill-down and the capture sheet read
 *  — the payload can run to several hundred accounts plus a thousand contacts, against a ~5MB
 *  localStorage budget. */
export function cacheAccounts(tenantId, companies, people) {
  try {
    // `phone` (HubSpot company property) is the OFFICE general line; `ownerPhone` is the primary
    // contact's own number. Kept as separate fields — collapsing them made a person's direct
    // line and the switchboard indistinguishable, so a contact with no number of their own
    // appeared to have one.
    const slimCompanies = (companies || []).map((c) => ({
      id: c.id, name: c.name, city: c.city, state: c.state, channel: c.channel, domain: c.domain,
      owner: c.owner, ownerEmail: c.ownerEmail,
      ownerPhone: c.ownerPhone || "",
      phone: c.phone || "",
    }));
    const slimPeople = (people || []).map((p) => ({
      name: p.name, email: p.email, phone: p.phone, company: p.company,
    }));
    localStorage.setItem(acctKey(tenantId), JSON.stringify({
      at: new Date().toISOString(), companies: slimCompanies, people: slimPeople,
    }));
    return true;
  } catch {
    // Quota is the realistic failure here. Retry without the people list rather than losing the
    // account book too — a drill-down with primary contacts only still works at the booth.
    try {
      localStorage.setItem(acctKey(tenantId), JSON.stringify({
        at: new Date().toISOString(),
        companies: (companies || []).map((c) => ({
          id: c.id, name: c.name, city: c.city, state: c.state, channel: c.channel,
          owner: c.owner, ownerEmail: c.ownerEmail, ownerPhone: c.ownerPhone || "", phone: c.phone || "",
        })),
        people: [],
      }));
    } catch { /* nothing more to try — the live read still renders this session */ }
    return false;
  }
}

/** { at, companies, people } — `at` tells the rep how stale the offline book is. */
export function readCachedAccounts(tenantId) {
  try {
    const raw = localStorage.getItem(acctKey(tenantId));
    if (!raw) return { at: null, companies: [], people: [] };
    const v = JSON.parse(raw);
    return {
      at: v?.at || null,
      companies: Array.isArray(v?.companies) ? v.companies : [],
      people: Array.isArray(v?.people) ? v.people : [],
    };
  } catch {
    return { at: null, companies: [], people: [] };
  }
}

// ---- Company ↔ contacts join ------------------------------------------------------------
//
// The SAME two keys crm-hubspot.js uses server-side to pick a primary contact, applied here to
// collect ALL of them. The 2026-07-22 import stored each contact's company as free text with no
// HubSpot association records, so the normalized name is the honest first key; the 2026-07-24
// audit then found 268 companies whose contacts carry emails at the company's own domain but
// with blank or mismatched company text, which is what the domain key recovers.
// Kept deliberately identical to the server's logic — if these two ever disagree, the CRM page
// and the booth would name different people for the same account.

const FREEMAIL = new Set(["gmail.com", "yahoo.com", "hotmail.com", "aol.com", "outlook.com", "icloud.com", "me.com", "msn.com", "live.com", "comcast.net", "verizon.net", "sbcglobal.net", "att.net", "earthlink.net", "protonmail.com", "ymail.com"]);

const normCompany = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Build the lookup once per account-book load, not per account — otherwise every render walks
 *  the full contact list for every company on screen. */
export function indexContacts(people = []) {
  const byName = new Map();
  const byDomain = new Map();
  for (const p of people) {
    const key = normCompany(p.company);
    if (key) {
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(p);
    }
    const dom = String(p.email || "").split("@")[1]?.toLowerCase();
    if (dom && !FREEMAIL.has(dom)) {
      if (!byDomain.has(dom)) byDomain.set(dom, []);
      byDomain.get(dom).push(p);
    }
  }
  return { byName, byDomain };
}

/** Every contact for a company, de-duplicated across both join keys. Falls back to the primary
 *  contact the server already joined on, so an account is never contactless when it has one. */
export function contactsForCompany(company, index) {
  const out = new Map(); // email|name -> person, de-dupes a contact matched by both keys
  const add = (p) => {
    const k = (p.email || p.name || "").toLowerCase();
    if (k && !out.has(k)) out.set(k, p);
  };
  for (const p of index?.byName?.get(normCompany(company?.name)) || []) add(p);
  const dom = String(company?.domain || "").toLowerCase().replace(/^www\./, "");
  if (dom) for (const p of index?.byDomain?.get(dom) || []) add(p);
  if (!out.size && company?.ownerEmail) {
    add({ name: company.owner, email: company.ownerEmail, phone: company.ownerPhone, company: company.name });
  }
  return [...out.values()].sort((a, b) => String(a.name || "~").localeCompare(String(b.name || "~")));
}

/** How to actually reach this person, in the order a rep would try. Returns "" when there's
 *  nothing to dial — never a number belonging to somebody else. */
export function phoneText(capture) {
  if (capture?.phone) return capture.phone;
  if (capture?.officePhone) {
    return capture.phoneExt ? `${capture.officePhone} ext. ${capture.phoneExt}` : `${capture.officePhone} (office)`;
  }
  return "";
}

/** Display city for grouping — "" when HubSpot has none, which the UI buckets separately rather
 *  than hiding, because an account with no city still has to be reachable in the drill-down. */
export function cityOf(company) {
  return String(company?.city || "").trim();
}

// ---- The headline metric (§5a step 7) --------------------------------------------------

/** Leads captured is the metric this product exists to argue against — a booked next step is the
 *  only outcome that survives the drive home, so bookedRate is what the header shows. */
export function boothStats(captures = []) {
  const conversations = captures.length;
  // COMMITTED = they agreed to something, whether a clock time or a week. A sent request is NOT
  // a commitment and is counted separately — folding it in would flatter the number, and the
  // whole point of this metric is that it stays honest enough to act on.
  const committed = captures.filter((c) => c.nextStepMode === "time" || c.nextStepMode === "window").length;
  const timed = captures.filter((c) => c.nextStepMode === "time").length;
  const requested = captures.filter((c) => c.nextStepMode === "request").length;
  const byTemp = { hot: 0, warm: 0, cold: 0 };
  for (const c of captures) if (byTemp[c.temperature] !== undefined) byTemp[c.temperature]++;
  return {
    conversations,
    committed,
    timed,
    requested,
    committedRate: conversations ? Math.round((committed / conversations) * 100) : 0,
    unsynced: captures.filter((c) => !c.pushedAt).length,
    // A confirmed TIME that never reached the calendar — the queue that builds while the booth
    // has no signal, and the list the rep has to clear before leaving the show. Windows are
    // excluded on purpose: there's no event to create until a time exists.
    awaitingCalendar: captures.filter((c) => c.nextStepMode === "time" && c.whenISO && !c.calendarAddedAt).length,
    ...byTemp,
  };
}

// ---- Calendar invite -------------------------------------------------------------------

// RFC 5545 wants CRLF, ≤75-octet lines, and escaped separators. Getting any of these wrong makes
// Outlook reject the file outright while Apple Calendar silently accepts it — so it gets done
// properly rather than by string concatenation.
function icsEscape(v) {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) { parts.push(" " + rest.slice(0, 74)); rest = rest.slice(74); }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

const pad = (n) => String(n).padStart(2, "0");

/** "2026-09-22T14:30" (the value an <input type=datetime-local> gives) → "20260922T143000".
 *  Deliberately FLOATING local time, with no TZID and no Z: the rep and the buyer are standing in
 *  the same room in the same timezone, and a floating value can't be shifted wrong by a device
 *  whose zone is set oddly. Revisit if reps ever book across zones. */
function toIcsLocal(localValue) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(localValue || ""));
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00`;
}

function icsStamp(d = new Date()) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Add `minutes` to a floating "YYYYMMDDTHHMMSS" without touching timezones. */
function addMinutes(icsLocal, minutes) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(icsLocal);
  if (!m) return icsLocal;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  d.setMinutes(d.getMinutes() + minutes);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** A real .ics for a booked follow-up, or null if the capture has no usable datetime.
 *  METHOD:REQUEST + an ATTENDEE line is what makes a mail client show Accept/Decline rather than
 *  treating the file as a plain attachment. */
export function buildIcs(capture, { brandName = "", organizerEmail = "", durationMinutes = 45 } = {}) {
  const start = toIcsLocal(capture.whenISO);
  if (!start) return null;
  const end = addMinutes(start, durationMinutes);
  const type = FOLLOW_UP_TYPES.find((t) => t.key === capture.followUpType);
  const summary = `${brandName || "Follow-up"} — ${type?.label || "Follow-up"}${capture.company ? ` @ ${capture.company}` : ""}`;
  const descParts = [
    productNames(capture).length && `Discussed: ${productNames(capture).join(", ")}`,
    capture.useCase && `Their use case: "${capture.useCase}"`,
    capture.notes && capture.notes,
  ].filter(Boolean);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CheeseShop TECH//Booth-to-Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${capture.id}@cheeseshoptech.com`,
    `DTSTAMP:${icsStamp()}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(summary)}`,
    descParts.length ? `DESCRIPTION:${icsEscape(descParts.join("\n"))}` : null,
    capture.company ? `LOCATION:${icsEscape([capture.company, capture.city, capture.state].filter(Boolean).join(", "))}` : null,
    organizerEmail ? `ORGANIZER:mailto:${organizerEmail}` : null,
    capture.email ? `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${capture.email}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.map(fold).join("\r\n") + "\r\n";
}

// ---- Google Calendar ------------------------------------------------------------------
//
// A prefilled Google Calendar "TEMPLATE" link, NOT the Calendar API. This is a deliberate choice
// for the September show, and worth the note:
//
//   · No OAuth. The API route needs a Google Cloud project, a consent screen, a client secret and
//     a stored refresh token — none of which exist yet, and all of which are Rick's to create.
//   · The rep is already signed into the sales@ account on the tablet, so this opens the real
//     calendar, prefilled, and one tap on Save creates the event AND emails the buyer the invite
//     (that's what `add=` does). The booking is real, not a draft.
//   · Nothing sends without the rep's tap — the same posture as the recap mailto.
//
// What it CANNOT do, and what OAuth would buy: read free/busy to show open slots. Today the rep
// picks a time from their own knowledge. See the handoff §2 — CalendarBridge's edge is exactly
// this availability read, so it's the obvious next upgrade.
const GCAL = "https://calendar.google.com/calendar/render";

/** Prefilled Google Calendar event URL, or null if the capture has no usable datetime. */
export function googleCalendarUrl(capture, { brandName = "", calendar = null } = {}) {
  const start = toIcsLocal(capture.whenISO);
  if (!start) return null;
  const end = addMinutes(start, calendar?.defaultDurationMinutes || 45);
  const type = FOLLOW_UP_TYPES.find((t) => t.key === capture.followUpType);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${brandName || "Follow-up"} — ${type?.label || "Follow-up"}${capture.company ? ` @ ${capture.company}` : ""}`,
    dates: `${start}/${end}`,
    details: [
      capture.name && `With: ${capture.name}${capture.title ? `, ${capture.title}` : ""}`,
      productNames(capture).length && `Discussed: ${productNames(capture).join(", ")}`,
      capture.useCase && `Their use case: "${capture.useCase}"`,
      capture.priceQuestion && "Asked about price/minimums",
      capture.notes,
    ].filter(Boolean).join("\n"),
    // Pin the wall-clock time to the device's zone rather than leaving it floating — Google
    // would otherwise read it in the calendar's default zone, which is usually but not always
    // the same thing.
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  if (capture.company) params.set("location", [capture.company, capture.city, capture.state].filter(Boolean).join(", "));
  // Saving the event with a guest attached is what sends the invite — the booking, not a note.
  if (capture.email) params.set("add", capture.email);
  // Force the right account when the tablet is signed into more than one Google identity.
  if (calendar?.address) params.set("authuser", calendar.address);

  return `${GCAL}?${params.toString()}`;
}

/** Download the invite. Returns false when the capture has no date yet. */
export function downloadIcs(capture, opts = {}) {
  const ics = buildIcs(capture, opts);
  if (!ics) return false;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${(capture.company || capture.name || "follow-up").replace(/[^\w-]+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

// ---- Recap ------------------------------------------------------------------------------

const dtFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Human date for a floating local value, e.g. "Tuesday, September 22 at 2:30 PM". */
export function prettyWhen(localValue) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(localValue || ""));
  if (!m) return "";
  return dtFmt.format(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
}

/** The products, as the buyer would recognise them. */
export function productNames(capture) {
  return (capture.products || []).map((p) => p.name);
}

/** How the agreed next step reads in prose. ONE timing phrase, two voices: the buyer's copy is
 *  second person ("drop samples at your kitchen"), the house record is the neutral label ("Sample
 *  drop-off") — the same commitment, worded for who's reading. Both sides derive the timing here,
 *  so the CRM and the buyer can never end up describing different meetings. */
export function nextStepText(capture, { voice = "buyer" } = {}) {
  const type = FOLLOW_UP_TYPES.find((t) => t.key === capture.followUpType);
  if (!type) return "";
  const what = voice === "house" ? type.label : type.ask;
  if (capture.nextStepMode === "time" && capture.whenISO) return `${what} on ${prettyWhen(capture.whenISO)}`;
  if (capture.nextStepMode === "window" && capture.windowKey) {
    const w = FOLLOW_UP_WINDOWS.find((x) => x.key === capture.windowKey);
    return w ? `${what} ${w.label}` : what;
  }
  return what;
}

// ============================================================================================
// THE TWO-SIDED NOTE (Rick, 2026-08-07)
// Every interaction produces exactly two artefacts from ONE capture:
//   · buildRecap()        → the BUYER side: what they tasted, what was offered, the next step.
//   · buildInternalNote() → the HOUSE side: the same interaction as a record for Rick and the
//                           rep, and the note that rides into HubSpot via crm-push.
// They share nextStepText() and the same product list on purpose. The failure mode this design
// exists to prevent is the two sides drifting — a buyer told one thing and the CRM recording
// another — which is exactly what happens when a rep writes the email and the note separately.
// ============================================================================================

/** BUYER side. Built from what they actually said and named, then carries the product info and
 *  any offer that was on the table — so the recap is useful on its own, not just a pleasantry. */
export function buildRecap(capture, { brandName = "", repName = "", deals = [] } = {}) {
  const first = (capture.name || "").trim().split(/\s+/)[0];
  const names = productNames(capture);
  const offered = dealsForProducts(deals.filter((d) => (capture.dealKeys || []).includes(d.key)), capture.products);

  const lines = [first ? `${first},` : "Hi,", ""];

  lines.push(
    names.length
      ? `Great talking at the show — you tried the ${listPhrase(names)}${capture.useCase ? ` and mentioned ${capture.useCase}` : ""}.`
      : "Great talking at the show today."
  );

  // The product block is the "send some product info" half — specs the buyer can forward to
  // their chef or their buying team without coming back to ask.
  if (capture.products?.length) {
    lines.push("", "What you tasted:");
    for (const p of capture.products) {
      lines.push(`• ${productLine(p)}`);
      if (p.shortDescription) lines.push(`  ${p.shortDescription}`);
    }
  }

  if (offered.length || capture.dealNote) {
    lines.push("", "While it's open:");
    for (const d of offered) lines.push(`• ${dealLine(d)}`);
    if (capture.dealNote) lines.push(`• ${capture.dealNote}`);
  }

  const step = nextStepText(capture);
  if (step) {
    lines.push("");
    if (capture.nextStepMode === "time") lines.push(`Confirming: I'll ${step}. Calendar invite attached.`);
    else if (capture.nextStepMode === "window") lines.push(`As agreed, I'll ${step} — I'll send a time to confirm.`);
    else lines.push(`I'd like to ${step} — what does your week look like?`);
  }

  if (capture.notes) { lines.push("", capture.notes); }
  lines.push("", repName || "", brandName || "");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** HOUSE side. Written for someone who was NOT at the table — Rick reading it days later, or the
 *  rep picking the account back up in November. Leads with the account and the commitment,
 *  because those are what get actioned; the colour comes after. */
export function buildInternalNote(capture, { deals = [] } = {}) {
  const offered = dealsForProducts(deals.filter((d) => (capture.dealKeys || []).includes(d.key)), capture.products);
  const step = nextStepText(capture, { voice: "house" });

  const lines = [];
  lines.push(`${capture.company || "Unknown account"}${capture.city || capture.state ? ` (${[capture.city, capture.state].filter(Boolean).join(", ")})` : ""}`);
  const reach = phoneText(capture);
  const role = contactRoleLabel(capture.contactRole);
  const btype = businessTypeLabel(capture.businessType);
  lines[0] += btype ? ` — ${btype}` : "";
  lines.push(`Spoke with: ${[capture.name, capture.title, role].filter(Boolean).join(", ") || "—"}${capture.email ? ` · ${capture.email}` : ""}${reach ? ` · ${reach}` : ""}`);
  lines.push(`Temperature: ${capture.temperature}${capture.priceQuestion ? " · asked price/minimums" : ""}`);

  if (capture.products?.length) {
    lines.push(`Products: ${capture.products.map((p) => `${p.name} (${p.sku})`).join("; ")}`);
  } else {
    lines.push("Products: none recorded");
  }
  if (capture.useCase) lines.push(`Their use case: "${capture.useCase}"`);
  if (offered.length || capture.dealNote) {
    lines.push(`Offered: ${[...offered.map(dealLine), capture.dealNote].filter(Boolean).join(" | ")}`);
  }

  lines.push(
    capture.nextStepMode === "time" ? `NEXT STEP (confirmed): ${step}`
    : capture.nextStepMode === "window" ? `NEXT STEP (window agreed): ${step}`
    : capture.nextStepMode === "request" ? `NEXT STEP (requested, not yet agreed): ${step}`
    : "NEXT STEP: none agreed"
  );

  if (capture.notes) lines.push(`Notes: ${capture.notes}`);
  return lines.join("\n");
}

/** "A, B and C" — the buyer reads a sentence, not a comma-delimited field. */
function listPhrase(arr) {
  if (arr.length <= 1) return arr[0] || "";
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;
}

function recapSubject(capture, opts = {}) {
  const type = FOLLOW_UP_TYPES.find((t) => t.key === capture.followUpType);
  return capture.nextStepMode === "time" && capture.whenISO
    ? `Confirmed: ${type?.label || "follow-up"} — ${prettyWhen(capture.whenISO)}`
    : `Following up — ${opts.brandName || "the show"}`;
}

/** mailto: with the buyer recap pre-filled. The rep taps send — nothing leaves the device on its
 *  own. §9 asks how much AI-drafted content should send without review; this is the conservative
 *  answer, and the one that matches how Rick works. The .ics downloads separately and gets
 *  attached, because mailto: cannot carry an attachment.
 *
 *  Kept as the fallback for any tenant without a Google `calendar` identity configured — see
 *  recapComposeUrl() below, which is what actually fires for Monti Trentini. */
export function recapMailto(capture, opts = {}) {
  return `mailto:${encodeURIComponent(capture.email || "")}?subject=${encodeURIComponent(recapSubject(capture, opts))}&body=${encodeURIComponent(buildRecap(capture, opts))}`;
}

// ---- Recap origin identity (2026-08-17) ----------------------------------------------------
//
// Rick's ask: buyer recaps need to originate from the shared sales inbox (Sales@montitrentini-
// Usa.com for this tenant), not whatever personal account happens to be the default mail handler
// on a rep's own device at a trade show -- and it has to be right every time, not "usually right
// if the rep remembers." A plain mailto: CANNOT do this: no mail client honours a From address in
// a mailto: URI (that's an anti-spoofing rule, not a gap in this app), so a dropdown of reps here
// would only ever be a reminder, never a guarantee.
//
// The fix is to reuse the SAME trick already shipped for the Calendar button (see
// googleCalendarUrl's `authuser=` param and its comment: "the rep is already signed into the
// sales@ account on the tablet"). Gmail's own web compose URL supports the identical `authuser=`
// param: it composes as whichever Google account is named, PROVIDED that account is already
// signed into the browser doing the composing. Same assumption Calendar already depends on, same
// config field (`calendar.address`) -- this is not new infrastructure, it's the existing one
// applied to the other button. If that Google session isn't there, Gmail shows its own account
// picker rather than silently doing nothing, which is also strictly better than today's mailto:
// failure mode (a rep never had visible feedback that nothing happened).
//
// "Assign contact after": crm-push.js does not set hubspot_owner_id today, deliberately left for
// this reason -- no code change needed there. Whoever answers the recap claims the HubSpot contact
// afterward.
const GMAIL_COMPOSE = "https://mail.google.com/mail/?view=cm&fs=1";

/** The URL Recap should actually open: Gmail web compose forced onto the tenant's shared sales
 *  identity when `calendar.provider === "google"` and an address is configured, else the plain
 *  mailto: fallback (unaffected for any client without that identity set up yet). */
export function recapComposeUrl(capture, opts = {}) {
  const { calendar } = opts;
  if (calendar?.provider !== "google" || !calendar?.address) return recapMailto(capture, opts);

  const params = new URLSearchParams({
    to: capture.email || "",
    su: recapSubject(capture, opts),
    body: buildRecap(capture, opts),
    // Selects which already-signed-in Google account composes this -- the identity guarantee.
    // Not authentication and not a login trigger: if that account isn't signed into this
    // browser, Gmail falls back to its own account chooser instead of composing as it.
    authuser: calendar.address,
  });
  return `${GMAIL_COMPOSE}&${params.toString()}`;
}

// ---- End-of-show digest (the house side, rolled up) -------------------------------------

/** Every interaction of the day as one handover for Rick. Ordered by commitment strength, so the
 *  things needing action are at the top and the nurture pile is at the bottom. */
export function buildShowDigest(captures = [], { brandName = "", eventName = "", deals = [] } = {}) {
  const stats = boothStats(captures);
  const rank = (c) => -(NEXT_STEP_MODES[c.nextStepMode]?.weight ?? -1);
  const ordered = [...captures].sort((a, b) => rank(a) - rank(b));

  const skuTally = new Map();
  for (const c of captures) for (const p of c.products || []) {
    skuTally.set(p.name, (skuTally.get(p.name) || 0) + 1);
  }
  const topProducts = [...skuTally.entries()].sort((a, b) => b[1] - a[1]);

  // Who you met, by what the business IS — the question a channel-level field can't answer.
  const typeTally = new Map();
  for (const c of captures) {
    const label = businessTypeLabel(c.businessType);
    if (label) typeTally.set(label, (typeTally.get(label) || 0) + 1);
  }
  const byType = [...typeTally.entries()].sort((a, b) => b[1] - a[1]);

  // Multipliers reported APART from customers. A DSR or broker isn't a lead in the usual sense —
  // one relationship can open dozens of accounts. Counted together they inflate the headline and
  // bury the more interesting number.
  const multipliers = captures.filter((c) => isMultiplierRole(c.contactRole));

  const out = [];
  out.push(`${brandName || "Show"} — ${eventName || "field report"}`);
  out.push("=".repeat(Math.min(60, (brandName + (eventName || "")).length + 6)));
  out.push("");
  out.push(`${stats.conversations} conversations · ${stats.committed} with a next step agreed (${stats.committedRate}%) · ${stats.requested} requests out`);
  out.push(`Hot ${stats.hot} · Warm ${stats.warm} · Cold ${stats.cold}`);
  if (multipliers.length) {
    out.push("");
    out.push(`Trade contacts (open doors rather than buy) — ${multipliers.length}:`);
    for (const c of multipliers) {
      out.push(`  ${contactRoleLabel(c.contactRole)} · ${c.name || "—"}${c.company ? ` · ${c.company}` : ""}`);
    }
  }
  if (byType.length) {
    out.push("");
    out.push("Who you met, by business type:");
    for (const [label, n] of byType) out.push(`  ${n}× ${label}`);
  }
  if (topProducts.length) {
    out.push("");
    out.push("Most-discussed products:");
    for (const [name, n] of topProducts.slice(0, 8)) out.push(`  ${n}× ${name}`);
  }
  out.push("", "-".repeat(60), "");
  for (const c of ordered) {
    out.push(buildInternalNote(c, { deals }));
    out.push("");
  }
  return out.join("\n").trim();
}

// ---- Sync to HubSpot -------------------------------------------------------------------

/** Company domain for a capture: the card's printed website first, then the buyer's email domain —
 *  but ONLY when it isn't a freemail provider. Returns "" when there is no usable company domain,
 *  which is the common case at a booth and is why crm-push must still fall back to name matching. */
export function companyDomainOf(capture) {
  const clean = (v) => String(v || "").toLowerCase().trim()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  const fromSite = clean(capture?.website);
  if (fromSite && fromSite.includes(".") && !FREEMAIL.has(fromSite)) return fromSite;
  const fromEmail = clean(String(capture?.email || "").split("@")[1] || "");
  if (fromEmail && fromEmail.includes(".") && !FREEMAIL.has(fromEmail)) return fromEmail;
  return "";
}

/** crm-push.js accepts only CLEARED rows (email AND buyer name). Split rather than filter, so the
 *  UI can tell the rep exactly which captures are being held back and why. */
export function splitPushable(captures = []) {
  const pending = captures.filter((c) => !c.pushedAt);
  const ready = pending.filter((c) => c.email?.trim() && c.name?.trim());
  return { ready, blocked: pending.filter((c) => !ready.includes(c)) };
}

/** Map a capture onto crm-push.js's row contract. `outcome` carries the booking so the CRM note
 *  records the commitment, not just that a conversation happened. */
export function toPushRow(capture, { deals = [] } = {}) {
  const type = FOLLOW_UP_TYPES.find((t) => t.key === capture.followUpType);
  return {
    companyId: capture.companyId || undefined,
    companyName: capture.company || "",
    // Freemail is stripped here, not server-side: a personal address must never become a company
    // domain, or one "gmail.com" account would swallow every unrelated buyer.
    companyDomain: companyDomainOf(capture),
    buyer: capture.name || "",
    title: capture.title || "",
    email: capture.email || "",
    // The office line + extension goes to HubSpot as one dialable string when there's no direct
    // number — an extension recorded only in a note is an extension nobody finds again.
    phone: phoneText(capture),
    // The HOUSE side of the two-sided note, verbatim — the CRM gets exactly what Rick reads in
    // the digest, not a second paraphrase that could drift from it.
    note: buildInternalNote(capture, { deals }),
    outcome: capture.nextStepMode === "time" && type ? `${type.label} confirmed ${prettyWhen(capture.whenISO)}`
      : capture.nextStepMode === "window" && type ? nextStepText(capture, { voice: "house" })
      : capture.nextStepMode === "request" && type ? `${type.label} requested, awaiting reply`
      : `${capture.temperature} — no next step agreed`,
  };
}

/** Send cleared captures to crm-push.js. DRY RUN unless `commit` is explicitly true — that
 *  function's own posture, mirrored here rather than defaulted away, so a stray call can never
 *  write to the CRM of record. Resolves { ok, status, dryRun, planned, results, error }. */
export async function pushToHubspot(resolved, captures, { commit = false } = {}) {
  const { ready } = splitPushable(captures);
  if (!ready.length) return { ok: true, status: 200, dryRun: !commit, planned: [], results: [], pushedIds: [] };
  const deals = activeDeals(resolved);
  try {
    const res = await fetch("/.netlify/functions/crm-push", {
      method: "POST",
      headers: { "content-type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ tenant: resolved.id, rows: ready.map((c) => toPushRow(c, { deals })), commit }),
    });
    const data = await res.json().catch(() => ({}));
    // Stamp only what HubSpot actually CONFIRMED, derived from `results` — not a blanket
    // "res.ok ⇒ everything landed". crm-push loops row by row and returns `results` on BOTH the
    // success path AND a mid-loop failure (where it also sets `partial: true`), so a push that dies
    // on row 12 still reports the 11 that wrote. The old blanket stamp lost that entirely: on a
    // partial, `res.ok` is false, nothing was marked, and the next sync replayed the rows that had
    // already succeeded. Contacts survive a replay (crm-push upserts on email), but the call NOTE is
    // created unconditionally — so replaying duplicated the note on every already-pushed contact.
    const confirmed = new Set(
      (data.results || []).map((r) => String(r?.email || "").trim().toLowerCase()).filter(Boolean),
    );
    const pushedIds = commit
      ? ready.filter((c) => confirmed.has(String(c.email || "").trim().toLowerCase())).map((c) => c.id)
      : [];
    return { ok: res.ok, status: res.status, dryRun: !commit, ...data, pushedIds };
  } catch (e) {
    // Offline is the expected case here, not an exception — the captures stay local and the rep
    // syncs from anywhere with a signal later. Nothing is lost by a failed push.
    return { ok: false, status: 0, dryRun: !commit, pushedIds: [], error: String(e?.message || e) };
  }
}
