// Historical monthly sales seam — the bridge between the canonical monthly seed
// (src/data/<tenant>/sales-monthly.json, built by scripts/build-sales-monthly.mjs) and
// forecast-core.js. Live rep captures (history.js ledger) always flow to the forecast;
// the HISTORICAL seed flows only when its own data-quality gate says it's forecast-grade.
//
// Why the gate: the only monthly history on hand today is a <1% ERP slice (2024: 0.36% of
// broker USD, dead after June). Feeding that to runRate()/yoyGrowth() would print confidently
// wrong numbers. The seed carries forecastReady, set by the generator from measured coverage —
// when the proper full report lands and the seed is rebuilt, this seam opens automatically.

import seed from "@/data/montitrentini/sales-monthly.json";

/** Seed movement records for forecast-core ({skuCode, period, soldCases}), or [] while the
 *  quality gate is closed. Records with no implied price (soldCases null) are excluded. */
export function seedMovementRecords(tenantId) {
  if (tenantId && seed.clientId !== tenantId) return [];
  if (!seed.forecastReady) return [];
  return seed.records
    .filter((r) => r.soldCases != null)
    .map((r) => ({
      id: "seed-" + r.skuCode + "-" + r.period,
      skuCode: r.skuCode,
      period: r.period,
      soldCases: r.soldCases,
      missedCases: 0,
      estimated: r.estimated,
      source: r.source,
    }));
}

/** Status line for the Movement UI — says exactly what the seed is doing and why. */
export function seedStatus(tenantId) {
  if (tenantId && seed.clientId !== tenantId) return null;
  const years = Object.keys(seed.coverage || {}).sort();
  const span = years.length ? `${years[0]}–${years[years.length - 1]}` : "";
  if (seed.forecastReady) {
    return `Historical monthly sales ${span} loaded (${seed.records.length} records) — run-rate & YoY include history.`;
  }
  return `Historical monthly seed ${span} is on file but HELD BACK from projections (${seed.forecastReadyDetail ? "coverage gate: " + seed.forecastReadyRule : "quality gate closed"}) — awaiting the full monthly report.`;
}
