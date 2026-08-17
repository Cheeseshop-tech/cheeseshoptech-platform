// CRM data layer (OM §7). The CRM of record is HubSpot (Salesforce was dropped — see
// INTEGRATION_WIRING_BRIEF.md, 2026-06-17). Live backend = netlify/functions/crm-hubspot.js,
// which calls the HubSpot API read-only with the token held server-side (Netlify env
// HUBSPOT_TOKEN). Direct-HubSpot, not Make (the Make proxy was deleted 2026-07-16).

import { rolesOf } from "./auth.js";
import { authHeaders } from "./auth-context.jsx";

export function hasCrm(resolved) {
  return resolved?.crm && resolved.crm !== "none";
}

// CRM data is sensitive — only the brand's own team sees it (not external collaborators).
export function canViewCrm(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client");
}

export const PIPELINE_STAGES = ["Lead", "Qualified", "Sample sent", "Negotiation", "Won"];

// Outreach pipeline (campaign console) — the stage model from the Gmail-native campaign CRM
// artifact (Prospecting Phase 10: New→Emailed→Replied→Meeting→Won/Lost/Not a fit). Distinct from
// PIPELINE_STAGES (deal stages, HubSpot-of-record): outreach state is the platform-owned
// overlay wired through crm-outreach.js into Netlify Blobs, because HubSpot access is read-only.
export const OUTREACH_STAGES = ["New", "Emailed", "Replied", "Meeting", "Won", "Lost", "Not a fit"];
// The funnel bar shows the forward path only (Lost / Not a fit drop out, as in the artifact).
export const FUNNEL_STAGES = ["New", "Emailed", "Replied", "Meeting", "Won"];

// State → sales region (the artifact's four East Coast regions + real buckets for the rest of
// the US now that the CRM holds nationwide accounts — 2026-07-24 accuracy audit).
// Data-driven display grouping, not client config — any tenant's US accounts group the same way.
const STATE_REGION = {
  ME: "New England", NH: "New England", VT: "New England", MA: "New England", RI: "New England", CT: "New England",
  NY: "NY Metro", NJ: "NY Metro",
  PA: "Mid-Atlantic", MD: "Mid-Atlantic", DE: "Mid-Atlantic", VA: "Mid-Atlantic", DC: "Mid-Atlantic", WV: "Mid-Atlantic",
  NC: "Southeast", SC: "Southeast", GA: "Southeast", FL: "Southeast", TN: "Southeast", AL: "Southeast", MS: "Southeast", KY: "Southeast", LA: "Southeast", AR: "Southeast",
  OH: "Midwest", MI: "Midwest", IN: "Midwest", IL: "Midwest", WI: "Midwest", MN: "Midwest", IA: "Midwest", MO: "Midwest", ND: "Midwest", SD: "Midwest", NE: "Midwest", KS: "Midwest",
  TX: "South Central", OK: "South Central",
  CO: "Mountain West", UT: "Mountain West", NV: "Mountain West", AZ: "Mountain West", NM: "Mountain West", ID: "Mountain West", MT: "Mountain West", WY: "Mountain West",
  CA: "California", OR: "Pacific NW", WA: "Pacific NW", AK: "Pacific NW", HI: "Pacific NW",
};

// HubSpot's `state` field arrives in TWO formats (abbreviated "NJ" AND spelled-out "New Jersey" —
// the 2026-07-24 audit found both across the live dataset). Normalize spelled-out names to
// abbreviations BEFORE the region lookup so the same state can never split into two regions.
const STATE_ABBREV = {
  "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR", "CALIFORNIA": "CA",
  "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE", "FLORIDA": "FL", "GEORGIA": "GA",
  "HAWAII": "HI", "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA",
  "KANSAS": "KS", "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
  "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS", "MISSOURI": "MO",
  "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH",
  "OKLAHOMA": "OK", "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT", "VERMONT": "VT",
  "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV", "WISCONSIN": "WI", "WYOMING": "WY",
  "DISTRICT OF COLUMBIA": "DC", "WASHINGTON DC": "DC", "WASHINGTON D.C.": "DC",
};

/** Normalized state code for a company: "NJ" for both "NJ" and "New Jersey"; "" when unset;
 *  non-US provinces pass through verbatim (regionOf buckets those as International). */
export function stateOf(company) {
  const raw = String(company?.state || "").trim().toUpperCase();
  if (!raw) return "";
  return STATE_ABBREV[raw] || raw;
}

export function regionOf(company) {
  const st = stateOf(company);
  if (!st) return "—";
  // Known US state → its region. Unknown 2-letter → Other US. Anything longer that isn't a US
  // state name is a non-US province ("Trentino-Alto Adige", "Piemonte") → International.
  return STATE_REGION[st] || (st.length === 2 ? "Other US" : "International");
}

// HubSpot `Channel` → brand-voice audience (3, from brandKit.AUDIENCES). The single
// authoring home for the customer-profile → brand-voice join: once a buyer's channel is known,
// audienceOf() selects the right story blocks + readyPhrases (they're already audience-tagged).
// See docs/MARKET_INTELLIGENCE_SPEC.md §2b. Amend the mapping here only.
// 2026-07-24: extended to cover ALL 13 live values of the HubSpot Channel enum — the enrichment
// pass wrote 8 values this map didn't know (183 accounts are "Cheese shop / Boutique grocery"),
// and every unknown value silently dropped the account from Opportunity Engine targeting.
export const CHANNEL_TO_AUDIENCE = {
  "Distributor":                  "distributor",
  "Importers":                    "distributor",
  "Food Service Distributors":    "distributor",
  "Manufacturers":                "distributor", // bulk/wholesale ingredient buyers — wholesale voice
  "Restaurant / Chef":            "foodservice",
  "Specialty grocer":             "retail",
  "Retail chain":                 "retail",
  "Cheese shop / Boutique grocery": "retail",
  "Independent Supermarkets":     "retail",
  "Regional Supermarket Chains":  "retail",
  "National Chains":              "retail",
  "E-commerce":                   "retail",
  "Partner / Producer":           null, // not a sell-to buyer — excluded from targeting
};

/** The brand-voice audience for a CRM account (by its HubSpot Channel), or null if none/non-buyer. */
export function audienceOf(account) {
  if (!account) return null;
  const ch = account.channel || account.Channel;
  // Accept either the canonical HubSpot label or the app's lowercase channel token (mock orders).
  if (ch && ch in CHANNEL_TO_AUDIENCE) return CHANNEL_TO_AUDIENCE[ch];
  return TOKEN_TO_AUDIENCE[String(ch || "").toLowerCase()] ?? null;
}

// Lowercase channel tokens used in mock orders (channel: "distributor" | "restaurant" | "grocer" | "chain").
const TOKEN_TO_AUDIENCE = {
  distributor: "distributor",
  restaurant: "foodservice",
  chef: "foodservice",
  grocer: "retail",
  chain: "retail",
};

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export function money(n) {
  return fmtUSD.format(n || 0);
}

// ---- MOCK backend ---------------------------------------------------------
const MOCK = {
  montitrentini: {
    contacts: 38,
    pipeline: [
      { stage: "Lead", count: 12, value: 48000 },
      { stage: "Qualified", count: 7, value: 63000 },
      { stage: "Sample sent", count: 5, value: 81000 },
      { stage: "Negotiation", count: 3, value: 72000 },
      { stage: "Won", count: 4, value: 96000 },
    ],
    orders: [
      { id: "SO-1042", account: "Eataly Flatiron", channel: "distributor", total: 8400, status: "Open", date: "2026-06-02" },
      { id: "SO-1041", account: "Bianca Trattoria", channel: "restaurant", total: 1260, status: "Shipped", date: "2026-05-30" },
      { id: "SO-1039", account: "Whole Foods — NE", channel: "grocer", total: 15300, status: "Open", date: "2026-05-28" },
      { id: "SO-1037", account: "Carbone", channel: "restaurant", total: 980, status: "Delivered", date: "2026-05-24" },
      { id: "SO-1035", account: "Gourmet Garage", channel: "grocer", total: 4200, status: "Delivered", date: "2026-05-20" },
    ],
    invoices: [
      { id: "INV-880", account: "Eataly Flatiron", amount: 8400, status: "Sent", due: "2026-06-20" },
      { id: "INV-878", account: "Whole Foods — NE", amount: 15300, status: "Overdue", due: "2026-05-31" },
      { id: "INV-875", account: "Carbone", amount: 980, status: "Paid", due: "2026-05-15" },
    ],
    activity: [
      { who: "Eataly Flatiron", what: "Reorder inquiry — Asiago DOP", when: "2h ago" },
      { who: "Bianca Trattoria", what: "Sample feedback: positive on Gorgonzola", when: "1d ago" },
      { who: "Whole Foods — NE", what: "PO received, invoice sent", when: "2d ago" },
      { who: "Carbone", what: "Payment received (INV-875)", when: "3d ago" },
    ],
  },
};

// "mock" (bundled sample) | anything else = "hubspot" (direct read-only, companies+contacts
// only — see netlify/functions/crm-hubspot.js scope note). The Make-webhook proxy
// (netlify/functions/crm.js) was DELETED 2026-07-16 (wiring-audit P0 #3, dead code) — if a Make
// seam returns, it returns as a new backend value here, not by resurrecting that file.
export const CRM_BACKEND = import.meta.env.VITE_CRM_BACKEND || "mock";
const USE_MOCK = CRM_BACKEND === "mock";
// True while CRM data is sample (no live backend). Real source = HubSpot (INTEGRATION_WIRING_BRIEF.md).
// UI uses this to mark mock-backed sections "Sample" so they're never mistaken for live numbers.
export const crmIsSample = USE_MOCK;

// Session cache for the HubSpot read (2026-08-03). crm-hubspot.js paginates companies AND
// contacts SEQUENTIALLY on purpose — HubSpot caps search endpoints at ~4 req/s, so a parallel
// burst 429s the whole payload into zeros — which makes a full read of a 600+ account book take
// seconds. Three surfaces now want that same dataset in one session (home command-center, the
// outreach console, and the campaign call console), and each was firing its own copy.
//
// Cached BY TENANT, storing the in-flight promise so concurrent callers share one request rather
// than racing three. Module-level, so a browser reload always refetches — the cache only ever
// spans in-app navigation within a single page load, which is exactly the duplicate-fetch case
// and carries no staleness risk across reloads. TTL is a guard for very long-lived sessions.
const CRM_TTL_MS = 5 * 60 * 1000;
const crmCache = new Map(); // tenantId -> { at, promise }

/** Drop cached CRM reads (all tenants, or one). For a future explicit refresh control. */
export function invalidateCrmCache(tenantId) {
  if (tenantId) crmCache.delete(tenantId);
  else crmCache.clear();
}

/** Fetch the CRM dataset for a tenant. Returns null if no CRM configured. */
export async function getCrmData(resolved, { force = false } = {}) {
  if (!hasCrm(resolved)) return null;
  if (USE_MOCK) return MOCK[resolved.id] || emptyDataset();

  const key = resolved.id;
  const hit = crmCache.get(key);
  if (!force && hit && Date.now() - hit.at < CRM_TTL_MS) return hit.promise;

  // Reads now require the passcode header server-side (2026-07-16) — replay the unlock passcode.
  // Any failure (incl. 401 from a pre-update unlock with no stashed passcode) degrades to the
  // empty dataset — dashboard cards hide rather than crash; sign out/in restores the header.
  // Never cache a failure — a 401/5xx must not pin every surface to an empty account book for
  // the next five minutes. Note a failed read RESOLVES (with emptyDataset) rather than rejecting,
  // so the cache entry has to be dropped inside the success path too, not just on .catch().
  const promise = (async () => {
    const res = await fetch(`/.netlify/functions/crm-hubspot?tenant=${encodeURIComponent(key)}`, {
      headers: { ...(await authHeaders()) },
    });
    if (!res.ok) { crmCache.delete(key); return emptyDataset(); }
    return await res.json();
  })();

  crmCache.set(key, { at: Date.now(), promise });
  promise.catch(() => crmCache.delete(key));
  return promise;
}

function emptyDataset() {
  return { contacts: 0, pipeline: [], orders: [], invoices: [], activity: [] };
}

// ---- Outreach overlay (status + notes per company, Netlify Blobs) -------------------------
// Read: any signed-in tier. Write: house/client-admin passcode (server-enforced by
// crm-outreach.js via requireWriteAuth — the UI only surfaces the 401).

/** { entries: {companyId: {status, note, updatedAt}}, updatedAt } — {} when unset/unavailable. */
export async function getOutreach(resolved) {
  try {
    const res = await fetch(`/.netlify/functions/crm-outreach?tenant=${encodeURIComponent(resolved.id)}`, {
      headers: { ...(await authHeaders()) },
    });
    if (!res.ok) return { entries: {}, updatedAt: null };
    return await res.json();
  } catch {
    return { entries: {}, updatedAt: null };
  }
}

/** Save the FULL entries document (last-writer-wins). Resolves {ok, status}. */
export async function saveOutreach(resolved, entries) {
  try {
    const res = await fetch("/.netlify/functions/crm-outreach", {
      method: "POST",
      headers: { "content-type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ tenant: resolved.id, entries }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Derived aggregates for the dashboard cards.
export function summarize(data) {
  if (!data) return null;
  const pipelineValue = data.pipeline.reduce((s, p) => s + p.value, 0);
  const openOrders = data.orders.filter((o) => o.status === "Open").length;
  const overdue = data.invoices.filter((i) => i.status === "Overdue");
  const overdueAmount = overdue.reduce((s, i) => s + i.amount, 0);
  return {
    contacts: data.contacts,
    pipelineValue,
    openOrders,
    overdueCount: overdue.length,
    overdueAmount,
  };
}
