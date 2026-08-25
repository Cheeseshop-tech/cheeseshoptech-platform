# Availability sheet — column misalignment, 2026-08-21

**Sheet:** "Availability of items and pending orders" (owner `order@montitrentini-usa.com`)
**Last edit:** Tue 2026-08-18 17:41
**Status:** ✅ **RESOLVED 2026-08-25.** Corrected by Nico (Nicolette, MT customer service,
covering the sheet during Cecilia's leave) in the 2026-08-24 18:15 UTC edit. Feed hold
released; current data published live 2026-08-25 — first current inventory since 8/14.

---

## Resolution — verified 2026-08-25

All nine affected item codes reconcile. lb/case before → after:

| Item | before | after |
|---|---|---|
| 05411 Grana Riserva | 13.7 – 411.5 | 82.8 – 83.0 |
| 05012 Grana Hor. Cut | 36.9 – 161.3 | 42.1 – 42.1 |
| 05007 Grana 1/8 | 20.7 – 27.5 | 20.7 – 21.7 |
| 05033 Parmigiano WW 24mo | 218.7 | 88.1 |
| 05093 Grana WW 16mo | 162.0 | 75.1 |
| 05095 Trentin Grana | 45.0 | 82.3 |
| 05025 Parmigiano 1/8 | 14.4 | 22.1 |
| 05034 Parmigiano WW 18mo | 58.7 | 97.6 (recounted 15 → 5 cases) |
| 05417 | 355.7 | lot cleared |

Sheet-wide impossible-lb/case rows: **5 → 1**. Orphan bottom row: gone.

The three rows flagged above as "realignment alone will NOT fix" were physically recounted,
not just shifted:

- **05012** lots 1296216 / 1296217 now agree at 42.1 lb/case
- **05034** lot 1285651 recounted to 5 cases / 488.01 lb
- **20423** lot 1312807 back to 144 cases / 760.32 lb = 5.28 lb/case (= 12 × 7 oz, correct)

### Not sent
Decision (Rick, 2026-08-25): move forward silently. No warning email. Nico had already
fixed it before we raised it a second time, and the negative `Cases Available` figures are
her team's preorder convention (pre-sold against an inbound container), **not** a defect —
`Cases Available` = on-hand − Reserved holds for 50 of 57 items, and the 7 exceptions are
exactly the 7 negatives, each carrying a preorder note.

### Remaining, low risk, not chased
- **20438** lots 1206510 / 1206511, exp 2026-01-15 — still carry quantity, but are fully
  reserved (38/38, 72/72), so zero free. Cannot reach a quote.
- **02073** lot 1304244 — 12.4 lb/case vs ~6.9 on its three sibling lots. Weight-only; the
  SKU's 518 cases come from the case count, which is sound.
- **40105 Pecorino Granglona** — 21 cases sellable, no price in the 2026-03 list. Pricing
  gap, routes to Sales Management, not to Nico. Rick taking this one.

---

## What happened

In the right-hand on-hand table, the last two columns — **Net Available** and **Expiration
Date** — are **one row lower** than the Item / Lot# / Cases they belong to.

- Last correct row: lot `1316573`
- Every row below it carries the row above's Net Available and Expiration Date
- The bottom row of the sheet is an orphan: no item, no lot, just `143.077` and `03/12/2027`
  left stranded — that is lot `1316563`'s real data pushed off the end

Cause is almost certainly a cell insert/delete done on those two columns only, rather than
across the whole row, during the 8/18 edit. In Excel/Sheets this is the "shift cells down"
option instead of "insert entire row."

## How we know it isn't real stock movement

Within one item code, every lot must weigh about the same per case. Item `05411`
Grana Padano Riserva whole wheel as the sheet currently stands:

| Lot | Cases | Net Available | lb/case |
|---|---|---|---|
| 1304211 | 5 | 2,057.72 | 411.5 — impossible |
| 1308166 | 30 | 411.84 | 13.7 — impossible |
| 623115168 | 30 | 2,484.11 | 82.8 — correct |

Slide Net Available up one row and all three land at ~82.5 lb/case, which is what a Grana
Padano wheel actually weighs.

## Affected rows

Everything from lot `1312792` down. Item codes touched:
`05007`, `05012`, `05025`, `05033`, `05034`, `05093`, `05095`, `05411`, `05417`.

## Two things a realignment alone will NOT fix

Re-aligning the columns resolves most rows, but these still don't reconcile and need a
physical check:

1. **`05034` Parmigiano Reggiano WW, lot `1285651`** — cases dropped 25 → 15 this week
   (Cheese Importers 86070 came off the comment), but Net Available was never recalculated.
   15 cases should be roughly 1,350 lb. Neither the current value nor the realigned one fits.
2. **`05012` Grana Padano Hor. Cut**, lots `1296216` / `1296217` — the two lots disagree on
   lb/case even after realignment.

## Separate issue, same root cause

**`20423` Caciotta Black Truffles 7 oz EW, lot `1312807`** — cases went 144 → 71 this week,
Net Available stayed at 760.32, the figure it has carried since 8/7 when it really was 144
cases. Cases were updated, weight wasn't. This one is mid-sheet, not part of the shift.

---

## Draft message

> Subject: Availability sheet — Net Available / Expiration columns shifted down one row
>
> Hi —
>
> Something went sideways in the availability sheet on the 8/18 update and I wanted to flag
> it before it reaches anyone's quotes.
>
> In the on-hand table on the right side, the **Net Available** and **Expiration Date**
> columns have slipped **one row down** relative to the Item and Lot# next to them. It starts
> at lot **1312792** and continues to the bottom of the sheet. The very last row has no item
> or lot on it at all — just a leftover 143.077 / 03/12/2027, which is lot 1316563's data
> pushed off the end.
>
> The quickest way to see it: item **05411**, Grana Padano Riserva whole wheel. Right now lot
> 1304211 reads 5 cases / 2,057.72 lb, which would be 411 lb per case. Lot 1308166 reads 30
> cases / 411.84 lb, or 13.7 lb per case. A Riserva wheel is about 82 lb. Move that column up
> one row and all three lots come out at ~82 lb per case.
>
> It looks like a cell insert done on just those two columns instead of the whole row.
>
> Two rows won't come right from realigning alone and need an actual count:
>
> - **05034 / lot 1285651** — cases went from 25 to 15 this week but Net Available wasn't
>   recalculated
> - **05012 / lots 1296216 and 1296217** — the two lots don't agree on weight per case even
>   after realigning
>
> One more, unrelated to the shift but same kind of thing: **20423 / lot 1312807** went from
> 144 cases to 71, but Net Available is still 760.32 — the number from when it was 144 cases.
>
> Could you correct it in the master sheet rather than sending me a one-off export? If the
> shift stays in the master it'll come back on next week's refresh.
>
> Our inventory feed is holding at the 8/14 numbers until this clears, so nothing wrong is
> going out — but it's a week stale and I'd like to get it current.
>
> Thanks,
> Rick
