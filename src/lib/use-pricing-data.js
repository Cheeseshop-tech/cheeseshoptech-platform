import { useEffect, useState } from "react";
import { getPricingData, fetchInventory, PRICING_BACKEND } from "@/lib/pricing.js";

/**
 * Tenant pricing bundle with LIVE inventory hydrated over the bundled snapshot.
 *
 * Renders instantly with the bundled bundle (offline-safe — never blocks or shows a spinner),
 * then, when VITE_PRICING_BACKEND=function, swaps in live inventory fetched from the Netlify
 * function. If the fetch returns nothing (mock mode, no live data yet, or network/Blobs down),
 * the bundled inventory simply stays — so the quoting tool always has data.
 *
 * @returns {{ data: object|null, stockSource: "bundled"|"live"|"loading" }}
 */
export function usePricingData(resolved) {
  const [data, setData] = useState(() => getPricingData(resolved));
  const [stockSource, setStockSource] = useState(PRICING_BACKEND === "mock" ? "bundled" : "loading");

  useEffect(() => {
    const base = getPricingData(resolved);
    setData(base);
    if (!base || PRICING_BACKEND === "mock") { setStockSource("bundled"); return; }
    setStockSource("loading");
    let alive = true;
    fetchInventory(resolved.id).then((inv) => {
      if (!alive) return;
      if (inv && inv.skus) { setData({ ...base, inventory: inv }); setStockSource("live"); }
      else setStockSource("bundled");
    });
    return () => { alive = false; };
  }, [resolved.id]);

  return { data, stockSource };
}
