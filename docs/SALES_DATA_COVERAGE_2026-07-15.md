# Sales Data Coverage — what we actually have (2026-07-15)

**Finding:** the ERP monthly PDFs (2021–2024), parsed yesterday and billed as "the real unblock
for forecast-core," are a **tiny slice of the business — not the sales base.** The forecast
engine's monthly pipeline is now built end-to-end, but it is **gated shut** until the proper
report arrives.

## The numbers

| Year | ERP monthly (seed) | Customers | SKUs | Last active month | Broker exports (sales-history) |
|---|---|---|---|---|---|
| 2021 | $53,950 | 12 | 28 | Dec | — |
| 2022 | $21,690 | 15 | 19 | Dec | — |
| 2023 | $39,042 | 10 | 25 | Dec | — |
| **2024** | **$17,977** | **7** | 29 | **June** | **$4,991,076** |
| 2025 | none (annual YTD only) | — | — | — | $4,608,366 YTD (through 2025-10-15) |

**2024 flags:**
- ERP monthly 2024 = **0.36%** of the broker-export 2024 dollars. This is not partial — it's a
  different, much smaller book of business (likely one warehouse/direct slice; ask which).
- No activity recorded **after 2024-06** — second half of the year missing entirely.
- March 2024 is net-negative (credits exceed sales) — fine as data, another sign of a thin slice.
- Parse quality is NOT the issue: yesterday's checksums tied to the PDFs' own totals to $0.00.
  The PDFs themselves only ever contained this slice.

## What was built anyway (the template, per Rick 2026-07-15)

The monthly system is real and wired; only the data is withheld:

1. **`scripts/build-sales-monthly.mjs`** — generator. Converts any monthly source into the
   canonical seed. The proper report gets added to its `SOURCES` list and re-run; nothing else
   changes anywhere.
2. **`src/data/montitrentini/sales-monthly.json`** — canonical monthly seed (251 records,
   2021–2024). Carries per-year coverage, per-record `estimated`/`casesBasis` (cases are derived
   from USD via implied $/case from sales-history), and **`forecastReady: false`** — computed,
   not hand-set: 2024 seed-USD must be ≥ 80% of broker 2024 USD.
3. **`src/lib/sales-monthly.js`** — the seam. Feeds seed records to forecast-core **only when
   `forecastReady`**; live rep captures (history.js) always flow. Movement tab shows the
   held-back status line so nobody wonders where history went.
4. **Movement tab (pricing-tool.jsx)** — merges seed + live ledger; run-rate & YoY light up
   automatically the day the gate opens.

## What unblocks it

The full monthly report — spec in `docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md`.
On arrival: convert to JSON, add to `SOURCES` in the generator, `node scripts/build-sales-monthly.mjs`,
commit. Gate opens itself.

## Open questions attached to this finding

- What slice do the 2021–2024 ERP PDFs represent (which warehouse / channel / entity)?
- Confirm the 2025 YTD "through" date (currently inferred 2025-10-15 from the broker exports) —
  the run-rate math needs the exact cutoff. *(Wait — that date is odd: it's ~9 months before
  "today" 2026-07-15. Verify whether the exports are truly 2025 calendar YTD or a fiscal window.)*
- Tony's Fine Foods absent from both broker exports AND ERP slice — still with Stefano.
