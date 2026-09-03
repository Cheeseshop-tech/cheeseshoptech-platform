import { useEffect, useState } from "react";
import { getPricingData, fetchInventory, PRICING_BACKEND } from "@/lib/pricing.js";
import { fetchPriceState, applyPublishedPrices } from "@/lib/prices.js";

/**
 * Tenant pricing bundle with LIVE inventory and the LIVE PUBLISHED PRICE LIST hydrated over the
 * bundled snapshot.
 *
 * Renders instantly with the bundled bundle (offline-safe — never blocks or shows a spinner),
 * then, when VITE_PRICING_BACKEND=function, swaps in live inventory and overlays the published
 * FOB costs. If either fetch returns nothing (mock mode, no live data yet, or network/Blobs
 * down), the bundled version simply stays — so the quoting tool always has data.
 *
 * THIS IS THE SINGLE READ POINT for price truth (Rick, 2026-08-21). Overlaying here rather than
 * in each tool is what makes Pro Forma, the Quote Builder, Proposals and the storefront all quote
 * the same number without any of them knowing the price store exists.
 *
 * Both fetches are awaited together and applied in ONE setData: two independent `setData(base)`
 * calls would race, and whichever landed second would silently drop the other's result.
 *
 * CRM-05 follow-up (2026-09-03): priceListSource distinguishes "quoting bundled because nothing
 * has been published" from "quoting bundled because the live price-list read FAILED" — before
 * this, both looked identical (priceList: null) and a fetch failure would silently quote stale
 * bundled costs with no signal anything was wrong, on the tool Rick explicitly designated as
 * price truth.
 *
 * @returns {{ data: object|null, stockSource: "bundled"|"live"|"loading", priceList: object|null, priceListSource: "bundled"|"live"|"unavailable"|"loading" }}
 */
export function usePricingData(resolved) {
  const [data, setData] = useState(() => getPricingData(resolved));
  const [stockSource, setStockSource] = useState(PRICING_BACKEND === "mock" ? "bundled" : "loading");
  // The published price-list doc itself (version, effectiveDate, validUntil, publishedBy) so a
  // surface can SAY which price list it is quoting. null = quoting the bundled catalog.
  const [priceList, setPriceList] = useState(null);
  const [priceListSource, setPriceListSource] = useState(PRICING_BACKEND === "mock" ? "bundled" : "loading");

  useEffect(() => {
    const base = getPricingData(resolved);
    setData(base);
    setPriceList(null);
    if (!base || PRICING_BACKEND === "mock") { setStockSource("bundled"); setPriceListSource("bundled"); return; }
    setStockSource("loading"); setPriceListSource("loading");
    let alive = true;
    Promise.all([fetchInventory(resolved.id), fetchPriceState(resolved.id)]).then(([inv, priceState]) => {
      if (!alive) return;
      let next = base;
      const pub = priceState?.published;
      if (pub && pub.prices) {
        next = { ...next, catalog: applyPublishedPrices(next.catalog, pub) };
        setPriceList(pub);
        setPriceListSource("live");
      } else {
        setPriceListSource(priceState?.unavailable ? "unavailable" : "bundled");
      }
      if (inv && inv.skus) { next = { ...next, inventory: inv }; setStockSource("live"); }
      else setStockSource("bundled");
      setData(next);
    });
    return () => { alive = false; };
  }, [resolved.id]);

  return { data, stockSource, priceList, priceListSource };
}
