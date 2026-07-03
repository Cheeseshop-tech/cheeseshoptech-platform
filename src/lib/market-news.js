// Market News data layer — Tier 1 of the market nerve ending (docs/MARKET_INTELLIGENCE_SPEC.md §2a).
// The ambient "morning read": cheese-trade + consumer headlines, not per-account, not scored.
// Mock now; the getMarketNews() seam swaps to a real source later (scheduled morning research task
// writing market-news.json overnight — recommended v1 — or Apify/RSS) behind VITE_MARKETNEWS_BACKEND.
// Same additive pattern as CRM/Campaigns/Signals.
//
// Item shape: { id, category: "trade"|"consumer", headline, summary, url, source, date, tags[] }

import mtNews from "@/data/montitrentini/market-news.json";
import tplNews from "@/data/_template/market-news.json";

const BUNDLES = {
  montitrentini: mtNews,
  demo: tplNews,
};

const USE_MOCK = (import.meta.env.VITE_MARKETNEWS_BACKEND || "mock") === "mock";
// True while news is sample (no live overnight feed). UI marks the card "Sample".
export const marketNewsAreSample = USE_MOCK;

export const NEWS_CATEGORIES = [
  { id: "trade", label: "Trade" },
  { id: "consumer", label: "Consumer" },
];

/** Market news for a tenant, newest first. */
export async function getMarketNews(resolved) {
  let items;
  if (USE_MOCK) {
    items = BUNDLES[resolved?.id] || [];
  } else {
    const res = await fetch(`/.netlify/functions/market-news?tenant=${encodeURIComponent(resolved.id)}`);
    items = res.ok ? await res.json() : [];
  }
  return [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
