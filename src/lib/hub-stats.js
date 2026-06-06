// Home-hub stat row. Returns [{ value, label, accent }] for the landing page.
// Priority: explicit config stats > house cross-tenant rollup > tenant ops rollup (from the
// canonical pricing/inventory bundle, mirroring the standalone Operations Portal) > none.

import { getPricingData } from "@/lib/pricing.js";
import { listClients } from "@/lib/clientConfig.js";

export function getHubStats(resolved) {
  // 1. Explicit stats authored in config win (static content).
  if (Array.isArray(resolved.home?.stats) && resolved.home.stats.length) {
    return resolved.home.stats;
  }

  // 2. House (agency) view: a lightweight cross-tenant rollup.
  if (resolved.isHouse) {
    const clients = listClients();
    const liveTools = clients.reduce(
      (n, c) => n + (c.tools?.filter((t) => t.status !== "coming-soon").length || 0), 0,
    );
    const modules = new Set(clients.flatMap((c) => c.modules || [])).size;
    return [
      { value: clients.length, label: "Active tenants", accent: "brand" },
      { value: liveTools, label: "Tools live", accent: "accent" },
      { value: modules, label: "Modules in use", accent: "info" },
    ];
  }

  // 3. Tenant with a canonical pricing/inventory bundle: the ops rollup.
  const data = getPricingData(resolved);
  if (data?.inventory?.skus && data?.catalog) {
    const skus = Object.values(data.inventory.skus);
    const onHand = skus.reduce((n, s) => n + (s.casesAvail || 0), 0);
    const inTransit = skus.reduce((n, s) => n + (s.casesInTransit || 0), 0);
    const arriving = skus.filter((s) => (s.casesInTransit || 0) > 0).length;
    const plans = (data.commitments?.commitments || []).filter((c) => c.kind === "standing_plan").length;
    const products = (data.catalog.products || []).length;
    return [
      { value: products, label: "Products", accent: "brand" },
      { value: onHand.toLocaleString(), label: "Cases on hand", accent: "accent" },
      { value: inTransit.toLocaleString(), label: "Cases on the water", accent: "info" },
      { value: arriving, label: "SKUs arriving", accent: "info" },
      { value: plans, label: "Standing commitments", accent: "warning" },
    ];
  }

  // 4. Nothing to show.
  return [];
}
