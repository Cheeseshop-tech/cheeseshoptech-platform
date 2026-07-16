// CRM data layer (OM §7). The CRM of record is HubSpot (Salesforce was dropped — see
// INTEGRATION_WIRING_BRIEF.md, 2026-06-17). Live backend = netlify/functions/crm-hubspot.js,
// which calls the HubSpot API read-only with the token held server-side (Netlify env
// HUBSPOT_TOKEN). Direct-HubSpot, not Make (the Make proxy was deleted 2026-07-16).

import { rolesOf } from "./auth.js";
import { writeAuthHeader } from "./auth-context.jsx";

export function hasCrm(resolved) {
  return resolved?.crm && resolved.crm !== "none";
}

// CRM data is sensitive — only the brand's own team sees it (not external collaborators).
export function canViewCrm(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client");
}

export const PIPELINE_STAGES = ["Lead", "Qualified", "Sample sent", "Negotiation", "Won"];

// HubSpot `Channel` (5 values) → brand-voice audience (3, from brandKit.AUDIENCES). The single
// authoring home for the customer-profile → brand-voice join: once a buyer's channel is known,
// audienceOf() selects the right story blocks + readyPhrases (they're already audience-tagged).
// See docs/MARKET_INTELLIGENCE_SPEC.md §2b. Amend the mapping here only.
export const CHANNEL_TO_AUDIENCE = {
  "Distributor":       "distributor",
  "Restaurant / Chef": "foodservice",
  "Specialty grocer":  "retail",
  "Retail chain":      "retail",
  "Partner / Producer": null, // not a sell-to buyer — excluded from targeting
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

/** Fetch the CRM dataset for a tenant. Returns null if no CRM configured. */
export async function getCrmData(resolved) {
  if (!hasCrm(resolved)) return null;
  if (USE_MOCK) return MOCK[resolved.id] || emptyDataset();
  // Reads now require the passcode header server-side (2026-07-16) — replay the unlock passcode.
  // Any failure (incl. 401 from a pre-update unlock with no stashed passcode) degrades to the
  // empty dataset — dashboard cards hide rather than crash; sign out/in restores the header.
  const res = await fetch(`/.netlify/functions/crm-hubspot?tenant=${encodeURIComponent(resolved.id)}`, {
    headers: { ...writeAuthHeader() },
  });
  return res.ok ? await res.json() : emptyDataset();
}

function emptyDataset() {
  return { contacts: 0, pipeline: [], orders: [], invoices: [], activity: [] };
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
