# Client Data Request — Monthly Sales Report (2026-07-15)

**Blocks:** the forecast engine (`forecast-core.js` run-rate / YoY / reorder math). The pipeline
is built and gated — this report is the only thing standing between it and live projections.
**Routed to:** **Sales Management** (per `docs/CLIENT_DATA_ROLES.md`) — sales reporting out of the
ERP is theirs. Queue via Stefano if no direct counterpart yet. Async — send as one batch.
**Context doc:** `docs/SALES_DATA_COVERAGE_2026-07-15.md` (why the PDFs we have don't cut it).

---

## The request (copy-paste ready)

> We're building demand forecasting for reorders and container planning. The monthly reports we
> have (the "Statistica Di Riepilogo Mensilizzata — In Peso" PDFs) were run on 30/07/2024, so
> they stop at July 2024 — and they cover only a small slice (~18–54K lb/yr, 7–15 customers) vs
> the ~667K lb the full book did in 2024. Could you run a fresh extract from the ERP:
>
> **Report:** the same "Statistica Di Riepilogo Mensilizzata" works — sales by item, by month —
> but **all customers / all channels** (the full base, ~667K lb / ~$5.0M in 2024).
> **Period:** Jan 2024 → most recent closed month (i.e., run it NOW, not from an old elaboration).
> 2021–2023 in the same format welcome if cheap to run, but 2024–2026 is the priority.
> **Values:** **In Peso (lbs) AND In Valore (USD)** if the report supports both; plus **cases**
> or the case pack per item so we can convert. Credits netted or shown separately — either
> works, just say which.
> **Format:** **Excel or CSV — not PDF** (the PDF layout scrambles month columns when parsed).
> One file per year or one combined file, either is fine.
> **Going forward:** same extract monthly, previous closed month, sent with the availability
> sheet cadence if that's easiest.
>
> Two clarifiers with it:
> 1. What slice do the existing monthly PDFs represent — a specific warehouse, channel, or
>    entity? (They book ~18K lb for Jan–Jul 2024 vs ~667K lb full-book.)
> 2. The 2025 exports we have — what exact date are they "through"?

---

## Acceptance checklist (verify on receipt, before it touches the seed)

- [ ] 2024 total ties to ~667K lb / ~$4.99M (broker-export yardstick) within reason — if it
      doesn't, we're looking at another slice; stop and ask.
- [ ] Quantity is present in **lbs and/or cases** (or lbs + case pack so we can derive).
- [ ] Units confirmed — "In Peso" = weight, "In Valore" = dollars; label which columns are which.
- [ ] Item codes match `catalog.json` codes (spot-check 5).
- [ ] All 12 months populated for closed years, and the run date ("Data Elab.") is current —
      the old PDFs' only structural flaw was a 2024-07-30 run date.

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
