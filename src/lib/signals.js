// Market-signal data layer — the "market" nerve ending (docs/MARKET_INTELLIGENCE_SPEC.md §2a,
// Tier 2). A signal is a distilled market opportunity: a trend + the audience it fits + the SKUs
// and brand-story hints that capitalize on it.
//
// Wired live 2026-09-19: the weekly mt-seed-topics-scan automation distills signals from its own
// web research, recent Market News trade items, Google Alerts, Owler company alerts, and a
// quarterly USDA FAS dairy-trade snapshot — then publishes through
// /.netlify/functions/signals-publish (Netlify Blobs), read back here through
// /.netlify/functions/signals-list — same no-rebuild path attention/market-news use. Gated by
// VITE_SIGNALS_BACKEND=mock|function. The bundled JSON stays as the offline/error fallback, and
// "is this sample data?" is decided per fetch (like attention/market-news), not just by the build
// flag — a fetch failure or an empty/unprovisioned store falls back to the bundled sample rather
// than showing an empty Opportunities card.

import { authHeaders } from "@/lib/auth-context.jsx";
import mtSignals from "@/data/montitrentini/signals.json";
import demoSignals from "@/data/demo/signals.json";

const BUNDLES = {
  montitrentini: mtSignals,
  demo: demoSignals,
};

const SIGNALS_BACKEND = import.meta.env.VITE_SIGNALS_BACKEND || "mock";

// Locally-promoted signals (the Tier 1 → Tier 2 bridge, spec §2a): a house click on a Market News
// row distills it into a signal. Persisted per-tenant in localStorage — the same overlay model as
// the brand kit and the Content Library catalog — and merged over whatever the seam returns below,
// mock or live.
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

/**
 * Market signals for a tenant (most timely first is the engine's job, not this seam's), plus
 * whether the non-local portion is still sample data. The local (promoted-from-news) overlay is
 * always real regardless of backend, so it's merged on top either way and never affects isSample.
 *
 * @returns {Promise<{items: Array, isSample: boolean, updatedAt: string|null}>}
 */
export async function getSignals(resolved) {
  const local = loadLocalSignals(resolved?.id);
  const bundled = BUNDLES[resolved?.id] || [];

  if (SIGNALS_BACKEND === "mock") return { items: [...local, ...bundled], isSample: true, updatedAt: null };

  try {
    const res = await fetch(`/.netlify/functions/signals-list?tenant=${encodeURIComponent(resolved.id)}`,
      { cache: "no-store", headers: { Accept: "application/json", ...(await authHeaders()) } });
    if (!res.ok) return { items: [...local, ...bundled], isSample: true, updatedAt: null };
    const data = await res.json();
    if (!Array.isArray(data?.items) || data.items.length === 0) {
      // No live watch list published yet (or a transient Blobs error) — fall back to bundled
      // sample rather than showing a near-empty Opportunities card.
      return { items: [...local, ...bundled], isSample: true, updatedAt: null };
    }
    return { items: [...local, ...data.items], isSample: false, updatedAt: data.updatedAt || null };
  } catch {
    return { items: [...local, ...bundled], isSample: true, updatedAt: null };
  }
}
