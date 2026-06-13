// CRM data layer (OM §7, walkthrough Phase 6). Client CRM (HubSpot/etc.) flows into the
// dashboard via a Make scenario — zero new infra. Today this serves a MOCK so the dashboard
// is fully buildable; the real backend drops in behind getCrmData() as a Netlify function
// that calls the Make webhook (secrets server-side only). See docs/CRM_CONNECTOR.md.

import { rolesOf } from "./auth.js";

export function hasCrm(resolved) {
  return resolved?.crm && resolved.crm !== "none";
}

// CRM data is sensitive — only the brand's own team sees it (not external collaborators).
export function canViewCrm(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client");
}

export const PIPELINE_STAGES = ["Lead", "Qualified", "Sample sent", "Negotiation", "Won"];

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

const USE_MOCK = (import.meta.env.VITE_CRM_BACKEND || "mock") === "mock";
// True while CRM data is sample (no live backend). Real source = Salesforce (INTEGRATIONS_PLAN.md).
// UI uses this to mark mock-backed sections "Sample" so they're never mistaken for live numbers.
export const crmIsSample = USE_MOCK;

/** Fetch the CRM dataset for a tenant. Returns null if no CRM configured. */
export async function getCrmData(resolved) {
  if (!hasCrm(resolved)) return null;
  if (USE_MOCK) return MOCK[resolved.id] || emptyDataset();
  const res = await fetch(`/.netlify/functions/crm?tenant=${encodeURIComponent(resolved.id)}`);
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
