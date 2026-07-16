// Build the CANONICAL monthly sales seed for a tenant — the movement-ledger-shaped record set
// that feeds forecast-core.js (runRate / yoyGrowth need monthly periods; annual data cannot).
//
// Run:  node scripts/build-sales-monthly.mjs
// Reads  src/data/montitrentini/source/erp_monthly_resolved_2021-2024.json  (ERP PDF parse — POUNDS)
//        src/data/montitrentini/sales-history.json   (broker annual — lbPerCase + coverage yardstick)
//        src/data/montitrentini/catalog.json         (active SKU check)
// Writes src/data/montitrentini/sales-monthly.json
//
// UNITS — corrected 2026-07-15 (late): the ERP PDFs are "Statistica Di Riepilogo Mensilizzata —
// In Peso" (monthly summary BY WEIGHT). Values are POUNDS, not dollars — the first pass mislabeled
// them USD. "Qtà" = quantità. Cases are now derived lb ÷ lbPerCase (real pack spec), not price-inferred.
//
// DATA-QUALITY GATE (the whole point of this file):
// All three PDFs were elaborated 2024-07-30 — so 2024 covers Jan–Jul ONLY by construction, and the
// whole set is a small ERP slice: 2024 Jan–Jul = 18,161 lb = 2.7% of the broker exports' 667,210 lb
// (~4.7% pro-rated). The seed therefore ships with forecastReady:false and src/lib/sales-monthly.js
// holds it back from the Movement table. When the PROPER full monthly report arrives
// (docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md), add it to SOURCES below and re-run —
// forecastReady flips automatically once 2024 coverage clears FORECAST_READY_MIN_COVERAGE.
//
// KNOWN CAVEAT: month-column alignment from the PDF text extraction is PROVISIONAL — yearly totals
// tie to the PDFs' own "Totale" to 0.00, but per-month placement couldn't be independently verified
// (pypdf scrambles column order). Fine while gated; the proper CSV/XLSX report makes it moot.
//
// Re-run whenever a source changes (safe: output is deterministic).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const FORECAST_READY_MIN_COVERAGE = 0.8; // seed-lbs / broker-lbs for the anchor year (2024)

/* Sources — append the proper monthly report here when it lands. Each loader must return
   records: [{ skuCode, period:"YYYY-MM", soldLb, sourceRef }] (net of credits). */
const SOURCES = [
  {
    id: "erp_monthly_2021-2024",
    kind: "ERP 'Statistica Di Riepilogo Mensilizzata — In Peso' PDF parse (POUNDS, per customer×item×month; all three PDFs elaborated 2024-07-30 → 2024 = Jan–Jul only)",
    file: "src/data/montitrentini/source/erp_monthly_resolved_2021-2024.json",
    load() {
      const rows = rd(this.file);
      const recs = [];
      let unresolvedLb = 0, unresolvedRows = 0;
      for (const r of rows) {
        const matched = /^(MATCHED|CONFIRMED)/.test(r.sku_status || "");
        if (!matched) { unresolvedRows++; unresolvedLb += Number(r.total) || 0; continue; }
        r.months.forEach((v, i) => {
          const lb = Number(v) || 0;
          if (lb === 0) return; // negatives kept — credits net against the month
          recs.push({
            skuCode: r.sku_code,
            period: `${r.year}-${String(i + 1).padStart(2, "0")}`,
            soldLb: Math.round(lb * 100) / 100,
            sourceRef: this.id,
          });
        });
      }
      return { recs, unresolvedRows, unresolvedLb: Math.round(unresolvedLb * 100) / 100 };
    },
  },
];

const salesHistory = rd("src/data/montitrentini/sales-history.json");
const catalog = rd("src/data/montitrentini/catalog.json");
const activeCodes = new Set();
for (const p of catalog.products || []) for (const s of p.skus || []) activeCodes.add(s.code);

/* lb → cases via the REAL pack spec (sales-history lbPerCase). Solid conversion, not price-inferred. */
const lbPerCase = {};
for (const [code, s] of Object.entries(salesHistory.skus || {})) {
  if (s.lbPerCase > 0) lbPerCase[code] = s.lbPerCase;
}

/* Collect + aggregate per skuCode×period (customers folded; per-customer detail stays in source/). */
const agg = new Map();
const sourceMeta = [];
for (const src of SOURCES) {
  const { recs, ...meta } = src.load();
  sourceMeta.push({ id: src.id, kind: src.kind, file: src.file, records: recs.length, ...meta });
  for (const r of recs) {
    const k = r.skuCode + "|" + r.period;
    const cur = agg.get(k) || { skuCode: r.skuCode, period: r.period, soldLb: 0, sources: new Set() };
    cur.soldLb = Math.round((cur.soldLb + r.soldLb) * 100) / 100;
    cur.sources.add(r.sourceRef);
    agg.set(k, cur);
  }
}

const records = [...agg.values()]
  .sort((a, b) => a.period.localeCompare(b.period) || a.skuCode.localeCompare(b.skuCode))
  .map((r) => {
    const pc = lbPerCase[r.skuCode];
    return {
      skuCode: r.skuCode,
      period: r.period,
      soldLb: r.soldLb,
      // forecast-core reads soldCases; derived lb ÷ lbPerCase when the pack spec is known.
      soldCases: pc ? Math.round((r.soldLb / pc) * 10) / 10 : null,
      casesBasis: pc ? `lb ÷ ${pc} lb/case (sales-history pack spec)` : "no pack spec on file — lbs only",
      inCatalog: activeCodes.has(r.skuCode),
      source: [...r.sources].join("+"),
    };
  });

/* Coverage per year + the forecast-ready gate, measured in POUNDS against the broker exports. */
const byYear = {};
for (const r of records) {
  const y = r.period.slice(0, 4);
  (byYear[y] ||= { lb: 0, records: 0, skus: new Set(), lastActivePeriod: null }).lb += r.soldLb;
  byYear[y].records++;
  byYear[y].skus.add(r.skuCode);
  if (r.soldLb > 0) byYear[y].lastActivePeriod = r.period > (byYear[y].lastActivePeriod || "") ? r.period : byYear[y].lastActivePeriod;
}
const brokerLb2024 = Object.values(salesHistory.skus || {}).reduce((s, x) => s + (x.qty2024_lb || 0), 0);
const coverage = {};
for (const [y, v] of Object.entries(byYear)) {
  coverage[y] = {
    lb: Math.round(v.lb * 100) / 100,
    records: v.records,
    skus: v.skus.size,
    lastActivePeriod: v.lastActivePeriod,
    ...(y === "2024" && {
      periodCovered: "Jan–Jul ONLY by construction — source PDFs elaborated 2024-07-30",
      brokerLb: Math.round(brokerLb2024 * 100) / 100,
      shareOfBroker: Math.round((v.lb / brokerLb2024) * 10000) / 10000,
      flag: "ERP slice, partial year — do not forecast from this",
    }),
  };
}
const cov2024 = coverage["2024"] ? coverage["2024"].shareOfBroker : 0;
const forecastReady = cov2024 >= FORECAST_READY_MIN_COVERAGE;

const out = {
  schemaVersion: "1.1-monthly-lb",
  clientId: "monti-trentini",
  generatedAt: new Date().toISOString().slice(0, 10),
  generator: "scripts/build-sales-monthly.mjs",
  units: "soldLb = net POUNDS (ERP reports are 'In Peso'/by weight; credits netted). soldCases = lb ÷ lbPerCase pack spec — see casesBasis per record. v1.0 mislabeled these values USD; corrected 2026-07-15.",
  monthAlignment: "PROVISIONAL — yearly totals tie to the PDFs' own totals; per-month column placement not independently verifiable from PDF text extraction. Superseded by the proper CSV/XLSX report.",
  forecastReady,
  forecastReadyRule: `2024 seed-lbs ≥ ${FORECAST_READY_MIN_COVERAGE * 100}% of broker-export 2024 lbs`,
  forecastReadyDetail: forecastReady
    ? "Coverage gate passed — src/lib/sales-monthly.js feeds these records to forecast-core."
    : `HELD BACK: 2024 coverage is ${(cov2024 * 100).toFixed(2)}% of broker lbs (and Jan–Jul only). Awaiting the full monthly report — docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md. Add it to SOURCES in the generator and re-run.`,
  sources: sourceMeta,
  coverage,
  records,
};

writeFileSync(join(root, "src/data/montitrentini/sales-monthly.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`sales-monthly.json: ${records.length} records, ${Object.keys(byYear).length} years`);
for (const [y, c] of Object.entries(coverage)) console.log(`  ${y}: ${c.lb.toLocaleString()} lb · ${c.skus} SKUs · last active ${c.lastActivePeriod}${c.flag ? " · " + c.flag : ""}`);
console.log(`forecastReady: ${forecastReady} (2024 coverage ${(cov2024 * 100).toFixed(2)}% of broker ${Math.round(brokerLb2024).toLocaleString()} lb)`);
