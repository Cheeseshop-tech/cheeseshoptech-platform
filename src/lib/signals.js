// Market-signal data layer — the "market" nerve ending (docs/MARKET_INTELLIGENCE_SPEC.md §2a,
// Tier 2). A signal is a distilled market opportunity: a trend + the audience it fits + the SKUs
// and brand-story hints that capitalize on it. House-authored (part of the CST orchestration
// value). Mock now; the getSignals() seam swaps to a real feed later (scheduled brief, Apify,
// Ahrefs, ZoomInfo) behind VITE_SIGNALS_BACKEND — same additive pattern as CRM/Campaigns/Media.

import mtSignals from "@/data/montitrentini/signals.json";

const BUNDLES = {
  montitrentini: mtSignals,
};

const USE_MOCK = (import.meta.env.VITE_SIGNALS_BACKEND || "mock") === "mock";
// True while signals are sample (no live feed). UI marks signal-backed sections "Sample".
export const signalsAreSample = USE_MOCK;

/** Market signals for a tenant (most timely first is the engine's job, not this seam's). */
export async function getSignals(resolved) {
  if (USE_MOCK) return BUNDLES[resolved?.id] || [];
  const res = await fetch(`/.netlify/functions/signals?tenant=${encodeURIComponent(resolved.id)}`);
  return res.ok ? await res.json() : [];
}
