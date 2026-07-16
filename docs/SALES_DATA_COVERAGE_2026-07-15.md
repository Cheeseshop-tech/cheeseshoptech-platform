# Sales Data Coverage — what we actually have (2026-07-15, corrected same day)

**Finding:** the ERP monthly PDFs (2021–2024) are a **small slice of the business — not the
sales base.** The forecast engine's monthly pipeline is built end-to-end but **gated shut**
until the proper report arrives.

## ⚠️ Corrections vs the first pass (Rick uploaded the source PDFs — they settle it)

1. **Units are POUNDS, not dollars.** The reports are *"Statistica Di Riepilogo Mensilizzata —
   In Peso"* (monthly summary **by weight**); "Qtà" = quantità. The first parse tied the numbers
   correctly but labeled them USD. Everything below is in lbs. Silver lining: cases are now
   derived from real pack specs (lb ÷ lbPerCase), not inferred prices.
2. **2024 stops at July by construction, not data loss.** Header: *"Da GENNAIO A LUGLIO — Data
   Elab. 30/07/2024."* All three PDFs were generated on **2024-07-30** — nothing after that date
   exists in any of them. "Dead after June" was the wrong diagnosis (June vs July placement is a
   month-alignment artifact, see caveat below).

## The numbers (lbs)

| Year | ERP monthly (seed) | Customers | SKUs | Period covered | Broker exports (sales-history) |
|---|---|---|---|---|---|
| 2021 | 53,950 lb | 12 | 28 | full year | — |
| 2022 | 21,690 lb | 15 | 19 | full year | — |
| 2023 | 39,042 lb | 10 | 25 | full year | — |
| **2024** | **17,977 lb** | **7** | 29 | **Jan–Jul only** | **667,210 lb ($4,991,076)** |
| 2025 | none | — | — | — | 623,585 lb YTD (through 2025-10-15) |

**2024:** ERP slice = **2.7%** of broker lbs (≈4.7% pro-rated to a full year). Still a different,
much smaller book — likely one warehouse/direct channel. **Which slice = open question in the
data request.**

**Month-alignment caveat:** yearly totals tie to the PDFs' own "Totale" figures to 0.00, but PDF
text extraction scrambles column order, so per-month placement in the seed is provisional. Fine
while the gate is closed; the proper CSV/XLSX report makes it moot.

## What was built (the template, per Rick 2026-07-15)

The monthly system is real and wired; only the data is withheld:

1. **`scripts/build-sales-monthly.mjs`** — generator. Converts any monthly source into the
   canonical seed. The proper report gets added to its `SOURCES` list and re-run; nothing else
   changes anywhere.
2. **`src/data/montitrentini/sales-monthly.json`** — canonical monthly seed (251 records,
   2021–2024, schema `1.1-monthly-lb`). Carries per-year coverage, per-record `casesBasis`
   (173/251 records convert to cases via pack spec), and **`forecastReady: false`** — computed,
   not hand-set: 2024 seed-lbs must be ≥ 80% of broker 2024 lbs.
3. **`src/lib/sales-monthly.js`** — the seam. Feeds seed records to forecast-core **only when
   `forecastReady`**; live rep captures (history.js) always flow. Movement tab shows the
   held-back status line so nobody wonders where history went.
4. **Movement tab (pricing-tool.jsx)** — merges seed + live ledger; run-rate & YoY light up
   automatically the day the gate opens.

## What unblocks it

The same ERP report, **run fresh** (the PDFs' only real flaw is a 2024-07-30 run date), all
customers, through the most recent closed month, in xlsx/csv, weight + dollars — spec in
`docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md`. On arrival: convert to JSON, add to
`SOURCES`, `node scripts/build-sales-monthly.mjs`, commit. Gate opens itself.

## Open questions attached to this finding

- What slice do the ERP PDFs represent (which warehouse / channel / entity books these ~18–54K
  lb/yr vs the broker exports' ~667K lb)?
- Confirm the 2025 exports' exact "through" date (currently inferred 2025-10-15) — and note
  they're ~9 months stale vs today; the new report request covers the gap.
- Tony's Fine Foods absent from both broker exports AND ERP slice — still with Stefano.
