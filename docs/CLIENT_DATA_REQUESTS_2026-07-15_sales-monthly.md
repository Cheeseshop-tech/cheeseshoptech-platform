# Client Data Request — Monthly Sales Report (2026-07-15)

**Blocks:** the forecast engine (`forecast-core.js` run-rate / YoY / reorder math). The pipeline
is built and gated — this report is the only thing standing between it and live projections.
**Routed to:** **Sales Management** (per `docs/CLIENT_DATA_ROLES.md`) — sales reporting out of the
ERP is theirs. Queue via Stefano if no direct counterpart yet. Async — send as one batch.
**Context doc:** `docs/SALES_DATA_COVERAGE_2026-07-15.md` (why the PDFs we have don't cut it).

---

## The request (copy-paste ready)

> We're building demand forecasting for reorders and container planning. The monthly PDFs we
> have (2021–2024) cover only a small direct slice (~$18–60K/yr, 7–15 customers) — we need the
> full book. Could you run the following from the ERP:
>
> **Report:** Sales by item, by month — **all customers / all channels** (the same base that
> shows ~$5.0M for 2024).
> **Period:** Jan 2024 → most recent closed month, monthly buckets. (2021–2023 same format
> welcome if cheap to run, but 2024–2025 is the priority.)
> **Columns per row (item × month):** item code · item description · month · **quantity in
> cases** · quantity in lbs · net sales USD (credits netted or shown separately — either works,
> just say which).
> **Format:** **Excel or CSV — not PDF.** One file per year or one combined file, either is fine.
> **Going forward:** same extract monthly, previous closed month, sent with the availability
> sheet cadence if that's easiest.
>
> Two clarifiers with it:
> 1. What slice did the previous monthly PDFs (2021–2024, ~7–15 customers) represent — a
>    specific warehouse, channel, or entity?
> 2. The 2025 exports we have — what exact date are they "through"?

---

## Acceptance checklist (verify on receipt, before it touches the seed)

- [ ] 2024 total ties to ~$4.99M (broker-export yardstick) within reason — if it doesn't, we're
      looking at another slice; stop and ask.
- [ ] Quantity is present in **cases** (or lbs + case pack so we can derive) — USD-only repeats
      today's estimation problem.
- [ ] Item codes match `catalog.json` codes (spot-check 5).
- [ ] All 12 months populated for closed years (no dead half-years like the 2024 PDF).

## On receipt (the drop-in, ~15 min)

1. Convert to JSON rows (script will be extended to read the CSV directly).
2. Add as a source in `scripts/build-sales-monthly.mjs` → `SOURCES`.
3. `node scripts/build-sales-monthly.mjs` — coverage gate recomputes; ≥80% of broker 2024 USD
   flips `forecastReady: true` automatically.
4. Commit. Movement tab's run-rate & YoY go live on deploy; no code changes.

## Status

- [ ] Sent to Sales Management (via Stefano) — date: ______
- [ ] Received — date: ______
- [ ] Passed acceptance checklist
- [ ] Seed rebuilt, gate open
