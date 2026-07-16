// Build the CANONICAL monthly sales seed for a tenant — the movement-ledger-shaped record set
// that feeds forecast-core.js (runRate / yoyGrowth need monthly periods; annual data cannot).
//
// Run:  node scripts/build-sales-monthly.mjs
// Reads  src/data/montitrentini/source/erp_monthly_resolved_2021-2024.json  (ERP PDF parse, USD)
//        src/data/montitrentini/sales-history.json   (broker annual — implied $/case + coverage yardstick)
//        src/data/montitrentini/catalog.json         (active SKU check)
// Writes src/data/montitrentini/sales-monthly.json
//
// DATA-QUALITY GATE (the whole point of this file):
// The 2021-2024 ERP monthly PDFs are a <1% SLICE of the business (2024: $18.2K across 7 customers
// vs $4.99M in the broker exports; no activity recorded after 2024-06). The seed therefore ships
// with forecastReady:false and src/lib/sales-monthly.js holds it back from the Movement table.
// When the PROPER full monthly report arrives (docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md),
// add it to SOURCES below and re-run — forecastReady flips automatically once 2024 coverage clears
// FORECAST_READY_MIN_COVERAGE. No hand-editing, no UI change needed.
//
// Re-run whenever a source changes (safe: output is deterministic).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const FORECAST_READY_MIN_COVERAGE = 0.8; // seed-USD / broker-USD for the anchor year (2024)

/* Sources — append the proper monthly report here when it lands. Each loader must return
   records: [{ skuCode, period:"YYYY-MM", soldUsd, sourceRef }] (net of credits). */
const SOURCES = [
  {
    id: "erp_monthly_2021-2024",
    kind: "ERP 'sales by customer/item' PDF parse (USD, per customer×item×month)",
    file: "src/data/montitrentini/source/erp_monthly_resolved_2021-2024.json",
    load() {
      const rows = rd(this.file);
      const recs = [];
      let unresolvedUsd = 0, unresolvedRows = 0;
      for (const r of rows) {
        const matched = /^(MATCHED|CONFIRMED)/.test(r.sku_status || "");
        if (!matched) { unresolvedRows++; unresolvedUsd += Number(r.total) || 0; continue; }
        r.months.forEach((v, i) => {
          const usd = Number(v) || 0;
          if (usd === 0) return; // negatives kept — credits net against the month
          recs.push({
            skuCode: r.sku_code,
            period: `${r.year}-${String(i + 1).padStart(2, "0")}`,
            soldUsd: Math.round(usd * 100) / 100,
            sourceRef: this.id,
          });
        });
      }
      return { recs, unresolvedRows, unresolvedUsd: Math.round(unresolvedUsd * 100) / 100 };
    },
  },
];

const salesHistory = rd("src/data/montitrentini/sales-history.json");
const catalog = rd("src/data/montitrentini/catalog.json");
const activeCodes = new Set();
for (const p of catalog.products || []) for (const s of p.skus || []) activeCodes.add(s.code);

/* Implied $/case per SKU from the broker annual data (2024 preferred, 2025 YTD fallback) —
   used ONLY to estimate case counts from USD months. Flagged estimated on every record. */
const usdPerCase = {};
for (const [code, s] of Object.entries(salesHistory.skus || {})) {
  if (s.usd2024 > 0 && s.cases2024 > 0) usdPerCase[code] = { rate: s.usd2024 / s.cases2024, basis: "sales-history 2024" };
  else if (s.usd2025_ytd > 0 && s.cases2025_ytd > 0) usdPerCase[code] = { rate: s.usd2025_ytd / s.cases2025_ytd, basis: "sales-history 2025 YTD" };
}

/* Collect + aggregate per skuCode×period (customers folded; per-customer detail stays in source/). */
const agg = new Map();
const sourceMeta = [];
for (const src of SOURCES) {
  const { recs, ...meta } = src.load();
  sourceMeta.push({ id: src.id, kind: src.kind, file: src.file, records: recs.length, ...meta });
  for (const r of recs) {
    const k = r.skuCode + "|" + r.period;
    const cur = agg.get(k) || { skuCode: r.skuCode, period: r.period, soldUsd: 0, sources: new Set() };
    cur.soldUsd = Math.round((cur.soldUsd + r.soldUsd) * 100) / 100;
    cur.sources.add(r.sourceRef);
    agg.set(k, cur);
  }
}

const records = [...agg.values()]
  .sort((a, b) => a.period.localeCompare(b.period) || a.skuCode.localeCompare(b.skuCode))
  .map((r) => {
    const pc = usdPerCase[r.skuCode];
    return {
      skuCode: r.skuCode,
      period: r.period,
      soldUsd: r.soldUsd,
      // forecast-core reads soldCases; ours is derived, so it's estimated and marked as such.
      soldCases: pc ? Math.round((r.soldUsd / pc.rate) * 10) / 10 : null,
      casesBasis: pc ? `estimated from USD @ implied $/case (${pc.basis})` : "no implied price — USD only",
      estimated: true,
      inCatalog: activeCodes.has(r.skuCode),
      source: [...r.sources].join("+"),
    };
  });

/* Coverage per year + the forecast-ready gate, measured against the broker exports. */
const byYear = {};
for (const r of records) {
  const y = r.period.slice(0, 4);
  (byYear[y] ||= { usd: 0, records: 0, skus: new Set(), lastActivePeriod: null }).usd += r.soldUsd;
  byYear[y].records++;
  byYear[y].skus.add(r.skuCode);
  if (r.soldUsd > 0) byYear[y].lastActivePeriod = r.period > (byYear[y].lastActivePeriod || "") ? r.period : byYear[y].lastActivePeriod;
}
const brokerUsd2024 = Object.values(salesHistory.skus || {}).reduce((s, x) => s + (x.usd2024 || 0), 0);
const coverage = {};
for (const [y, v] of Object.entries(byYear)) {
  coverage[y] = {
    usd: Math.round(v.usd * 100) / 100,
    records: v.records,
    skus: v.skus.size,
    lastActivePeriod: v.lastActivePeriod,
    ...(y === "2024" && {
      brokerUsd: Math.round(brokerUsd2024 * 100) / 100,
      shareOfBroker: Math.round((v.usd / brokerUsd2024) * 10000) / 10000,
      flag: "INCOMPLETE — ERP slice only; no activity after 2024-06; do not forecast from this",
    }),
  };
}
const cov2024 = coverage["2024"] ? coverage["2024"].shareOfBroker : 0;
const forecastReady = cov2024 >= FORECAST_READY_MIN_COVERAGE;

const out = {
  schemaVersion: "1.0-monthly",
  clientId: "monti-trentini",
  generatedAt: new Date().toISOString().slice(0, 10),
  generator: "scripts/build-sales-monthly.mjs",
  units: "soldUsd = net USD (credits netted). soldCases = ESTIMATED from implied $/case — see casesBasis per record.",
  forecastReady,
  forecastReadyRule: `2024 seed-USD ≥ ${FORECAST_READY_MIN_COVERAGE * 100}% of broker-export 2024 USD`,
  forecastReadyDetail: forecastReady
    ? "Coverage gate passed — src/lib/sales-monthly.js feeds these records to forecast-core."
    : `HELD BACK: 2024 coverage is ${(cov2024 * 100).toFixed(2)}% of broker USD. Awaiting the full monthly report — docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md. Add it to SOURCES in the generator and re-run.`,
  sources: sourceMeta,
  coverage,
  records,
};

writeFileSync(join(root, "src/data/montitrentini/sales-monthly.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`sales-monthly.json: ${records.length} records, ${Object.keys(byYear).length} years`);
for (const [y, c] of Object.entries(coverage)) console.log(`  ${y}: $${c.usd.toLocaleString()} · ${c.skus} SKUs · last active ${c.lastActivePeriod}${c.flag ? " · " + c.flag : ""}`);
console.log(`forecastReady: ${forecastReady} (2024 coverage ${(cov2024 * 100).toFixed(2)}% of broker $${Math.round(brokerUsd2024).toLocaleString()})`);
