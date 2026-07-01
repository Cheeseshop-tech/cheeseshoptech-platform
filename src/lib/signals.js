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

// Locally-promoted signals (the Tier 1 → Tier 2 bridge, spec §2a): a house click on a Market News
// row distills it into a signal. Persisted per-tenant in localStorage — the same overlay model as
// the brand kit and the Content Library catalog — and merged over the authored bundle.
const LOCAL_KEY = (tenantId) => `cs-signals-local-${tenantId}`;

export function loadLocalSignals(tenantId) {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY(tenantId))) || []; } catch { return []; }
}

/** Promote a distilled signal into the tenant's local overlay (dedup by id). Returns the overlay. */
export function addLocalSignal(tenantId, signal) {
  const list = loadLocalSignals(tenantId).filter((s) => s.id !== signal.id);
  const next = [{ ...signal, source: signal.source || "promoted-news" }, ...list];
  try { localStorage.setItem(LOCAL_KEY(tenantId), JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

export function removeLocalSignal(tenantId, id) {
  const next = loadLocalSignals(tenantId).filter((s) => s.id !== id);
  try { localStorage.setItem(LOCAL_KEY(tenantId), JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

/** Market signals for a tenant (most timely first is the engine's job, not this seam's). */
export async function getSignals(resolved) {
  const local = loadLocalSignals(resolved?.id);
  if (USE_MOCK) return [...local, ...(BUNDLES[resolved?.id] || [])];
  const res = await fetch(`/.netlify/functions/signals?tenant=${encodeURIComponent(resolved.id)}`);
  return res.ok ? [...local, ...(await res.json())] : local;
}
