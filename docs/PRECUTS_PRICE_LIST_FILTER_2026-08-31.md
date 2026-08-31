# Precuts Price List Filter — Quote Builder

**Date:** 2026-08-31

## What changed and why

Rick wanted to pull together a price list scoped to just the Precuts (the 7 oz exact-weight
wedges, 12 to a case, `unit: "case"` in `catalog.json`) without hand-searching 24 SKU codes, and
wanted the printed sheet to show the price both **per case** (the authoritative, printed number —
see `docs/PRECUT_CASE_PRICING_2026-07-28.md`) and **per each** (per 7 oz piece), not a $/lb figure.

Added to `src/components/tools/quote-builder.jsx` (the branded one-sheet rate-card tool):

- **"Precuts only" toggle** — narrows the SKU picker to `unit === "case"` items. Combines with the
  existing search box (search still narrows further within the filtered set).
- **"Add all shown" button** — bulk-adds every SKU currently visible (after the Precuts filter
  and/or search) to the sheet in one click, instead of clicking all 24 wedges individually.
- **$ / Each column** — appears on the "New Customer Negotiation" arrangement (the full rate card)
  whenever at least one selected line is case-priced. Shows the per-piece price for precut lines,
  "—" for catch-weight bulk lines. This is on-screen (the sheet-as-it-will-print table) and in the
  printed/PDF output.
- Picker rows also show a small `$X.XX/ea` line under the case price for any precut, so a rep sees
  both numbers while browsing, not just after adding.

**How the each price is computed:** `eachPriceOf(sku, casePrice) = round2(casePrice / piecesPerCase)`.
It divides the already-margin-applied CASE price (from `pricing-core.js`'s `quoteUnitPrice`, which
is unchanged) rather than computing a second price off `cost.fobPiece` independently — so the each
price can never drift from the case price the rest of the app already treats as authoritative.
`cost.fobCase` stays the one number that's edited; everything else, including this new column,
derives from it.

**Scope:** the $/Each column was added to the "New Customer Negotiation" arrangement only (the one
the code already describes as "the full rate card... prices as quoted" — the closest match to a
standalone Precuts price list). Price Change Notification and Promo Offer keep their existing
column layouts (previous/new/change, regular/promo/save) unchanged.

## Not touched

Nothing about pricing math changed. `pricing-core.js`, `catalog.json`, the Price List cost editor,
Pro Forma, and Proposal links are unmodified — this is a display/workflow addition inside Quote
Builder only.

## Verified

`npx vite build` succeeds clean (pre-existing chunk-size warnings only, unrelated to this change).
Not yet live-tested in the deployed app.
