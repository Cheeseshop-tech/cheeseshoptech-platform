// Campaigns data layer — the sales + social engine (POSITIONING: coordinated campaigns across
// retail + DTC + social). Mock now; getCampaigns() seam swaps to a real backend later
// (Make/CRM/social analytics). Gated to the brand team (admin/client).

import { rolesOf } from "./auth.js";

export function canViewCampaigns(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client");
}

export const STATUS_TONE = { draft: "muted", scheduled: "info", active: "success", completed: "outline" };
export const CHANNELS = {
  retail: "Retail",
  dtc: "DTC",
  social: "Social",
};

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (n) => fmtUSD.format(n || 0);
export const compact = (n) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(n || 0);

const MOCK = {
  montitrentini: [
    {
      id: "C-104", name: "Summer Cheese Board", status: "active",
      channels: ["retail", "dtc", "social"], start: "2026-06-01", end: "2026-06-30",
      goal: "Drive DTC boards + grocer placement", assets: 12,
      kpis: { reach: 48000, orders: 120, revenue: 9600 },
    },
    {
      id: "C-103", name: "Asiago DOP Relaunch", status: "scheduled",
      channels: ["retail", "social"], start: "2026-07-08", end: "2026-07-29",
      goal: "Reintroduce Asiago to distributor accounts", assets: 6,
      kpis: { reach: 0, orders: 0, revenue: 0 },
    },
    {
      id: "C-102", name: "Holiday Gift Boxes", status: "draft",
      channels: ["dtc", "social"], start: "2026-11-15", end: "2026-12-20",
      goal: "Q4 DTC gifting push", assets: 2,
      kpis: { reach: 0, orders: 0, revenue: 0 },
    },
    {
      id: "C-098", name: "Grana Padano Wholesale Push", status: "completed",
      channels: ["retail"], start: "2026-04-01", end: "2026-04-30",
      goal: "Land 3 new distributor accounts", assets: 8,
      kpis: { reach: 22000, orders: 64, revenue: 18200 },
    },
  ],
};

const USE_MOCK = (import.meta.env.VITE_CAMPAIGNS_BACKEND || "mock") === "mock";

/** Campaigns for a tenant (most recent first). */
export async function getCampaigns(resolved) {
  if (USE_MOCK) return MOCK[resolved.id] || [];
  const res = await fetch(`/.netlify/functions/campaigns?tenant=${encodeURIComponent(resolved.id)}`);
  return res.ok ? await res.json() : [];
}

export function summarize(list) {
  const active = list.filter((c) => c.status === "active").length;
  const scheduled = list.filter((c) => c.status === "scheduled").length;
  const reach = list.reduce((s, c) => s + (c.kpis?.reach || 0), 0);
  const revenue = list.reduce((s, c) => s + (c.kpis?.revenue || 0), 0);
  return { active, scheduled, reach, revenue };
}
