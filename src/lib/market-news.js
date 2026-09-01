// Market News data layer — Tier 1 of the market nerve ending (docs/MARKET_INTELLIGENCE_SPEC.md §2a).
// The ambient "morning read": cheese-trade + consumer headlines, not per-account, not scored.
//
// Wired live 2026-08-21: the scheduled overnight research routine writes the brief through
// /.netlify/functions/market-news-publish (Netlify Blobs), and this reads it back through
// /.netlify/functions/market-news — same no-rebuild path inventory uses. Gated by
// VITE_MARKETNEWS_BACKEND=mock|function. The bundled JSON stays as the offline/empty fallback.
//
// Item shape: { id, category: "trade"|"consumer", headline, summary, url, source, date, tags[] }

import { authHeaders } from "@/lib/auth-context.jsx";
import mtNews from "@/data/montitrentini/market-news.json";
import tplNews from "@/data/_template/market-news.json";

const BUNDLES = {
  montitrentini: mtNews,
  demo: tplNews,
};

// "mock" (default) = bundled sample only. "function" = pull the live overnight brief at runtime,
// with the bundled sample as fallback — no app rebuild needed when the routine publishes.
export const MARKETNEWS_BACKEND = import.meta.env.VITE_MARKETNEWS_BACKEND || "mock";

export const NEWS_CATEGORIES = [
  { id: "trade", label: "Trade" },
  { id: "consumer", label: "Consumer" },
];

const byNewestFirst = (items) => [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

/**
 * Market news for a tenant, newest first.
 *
 * Returns an envelope, not a bare array, because "is this sample data?" is a RUNTIME fact now,
 * not a build flag: with the backend set to "function" the brief is still sample until the
 * routine has actually published one. Deciding it per fetch is what stops the card showing a
 * false "live" over bundled sample rows (guardrails #7/#8 — no false green).
 *
 * @returns {Promise<{items: Array, isSample: boolean, updatedAt: string|null}>}
 */
export async function getMarketNews(resolved) {
  const bundled = BUNDLES[resolved?.id] || [];
  const sample = { items: byNewestFirst(bundled), isSample: true, updatedAt: null };

  if (MARKETNEWS_BACKEND === "mock") return sample;

  try {
    // Reads require portal auth server-side — replay the session/unlock header, same as inventory.
    // A 401 or an empty store lands on the bundled sample below rather than an empty card.
    const res = await fetch(`/.netlify/functions/market-news?tenant=${encodeURIComponent(resolved.id)}`,
      { headers: { Accept: "application/json", ...(await authHeaders()) } });
    if (!res.ok) return sample;
    const data = await res.json();
    if (!Array.isArray(data?.news) || data.news.length === 0) return sample;
    return { items: byNewestFirst(data.news), isSample: false, updatedAt: data.updatedAt || null };
  } catch {
    return sample;
  }
}
