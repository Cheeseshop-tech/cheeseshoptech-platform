# Precut Case Pricing — 7 oz Exact-Weight Wedges Priced Per Case

**Date:** 2026-07-28 · **Source:** `2026 03 Price list AlmaCow BDiPaloATDekalb.pdf`
(pages 9–11, C&W exact-weight section, EXW Elizabeth NJ)
**Closes:** the "unpriced C&W line silently totals $0" hazard from
`CUT_AND_WRAP_ITEM_GAP_2026-07-09.md` §3c.

---

## What changed and why

7 oz precut wedges are sold **by the piece, packed 12 per case** — a $/lb price is
the wrong unit for them (Rick, 2026-07-28). The engine already distinguished
`unit: "lb"` (catch-weight, $/lb × net lb) from non-lb (price × cases), but every
SKU was tagged `"lb"`, so the piece-sold precuts either showed a meaningless $/lb
or — because their `cost.fob` was null — a **silent $0.00 line** on a proforma.

Now:

- The 17 C&W wedge SKUs carry `unit: "case"` with
  `cost: { fob: null, fobPiece, fobCase }`. **`fobCase` is authoritative** (it is
  the printed per-case number on the price list); `fobPiece` is kept for
  reference and as a fallback (`fobPiece × piecesPerCase`).
- `quoteUnitPrice` returns the **case price** for these; class-of-trade /
  volume / custom % margins apply to the case price exactly as they do to $/lb.
- `lineLbs` now counts net weight for **all** unit types, so precut cases are
  included in trucking weight and the 1,500 lb processing-fee threshold.
- The proforma prints a per-line basis (`$7.47/lb` vs `$40.81/cs`), and the
  footer distinguishes catch-weight (totals are estimates) from exact-weight
  (totals are firm).
- **Print is blocked while any line has no cost on file** — the rep sees which
  codes are unpriced instead of a customer seeing free cheese. On screen,
  unpriced SKUs show a POR (price on request) badge, never $0.00.

## Prices applied (EXW Elizabeth NJ, per case of 12 × 7 oz)

| Code | Product | $/piece | $/case |
|---|---|---|---|
| 02091 | Asiago Fresco PDO | 3.40 | 40.81 |
| 03044 | Aged Asiago PDO 5 mo | 4.05 | 48.58 |
| 03047 | Asiago Vecchio 9 mo | 4.70 | 56.44 |
| 20424 | Caciotta Piccante | 3.39 | 40.66 |
| 20481 | Pepato | 3.39 | 40.66 |
| 20480 | Mountain Herbs | 3.39 | 40.66 |
| 20423 | Black Truffle | 3.60 | 43.14 |
| 01101 | Sharp Provolone | 3.67 | 44.07 |
| 01190 | Mild Provolone | 3.38 | 40.59 |
| 01174 | Smoked Provolone (Wedge) | 3.79 | 45.46 |
| 04165 | Lagorai | 3.63 | 43.57 |
| 04176 | Imbriago | 4.32 | 51.90 |
| 05050 | Grana Padano 12 mo | 5.09 | 61.03 |
| 05099 | Parmigiano Reggiano 18 mo | 7.60 | 91.19 |
| 40162 | Pecorino Romano PDO | 4.95 | 59.43 |
| 40163 | Ricotta Salata | 3.09 | 37.04 |
| 40086 | Montasio PDO | 3.87 | 46.48 |

## Item-number conflicts — queue for Inventory Manager (identity is never guessed)

The price list prints **different item numbers** than the catalog for four
products. Catalog codes were KEPT; the price-list code is recorded in each SKU's
`_priceNote`. Same products by name/description — but one numbering system has
to win before ERP/inventory joins are trustworthy:

| Catalog | Price list | Product |
|---|---|---|
| 03047 | **03073** | Asiago Vecchio 9 mo (same conflict as gap report §3.4) |
| 05050 | **05091** | Grana Padano 12 mo C&W |
| 05099 | **05600** | Parmigiano Reggiano 18 mo C&W |
| 40162 | **40184** | Pecorino Romano C&W |

Also still open: **01174 printed twice** (Smoked Provolone Wedge $45.46/cs AND
Disc $42.25/cs, same UPC) — Wedge price applied per the catalog's "Wedges"
packing; the Disc needs its own item number before it can be quoted.

## Known deltas, accepted

- Price list prints net case weight **5,28 lb**; catalog keeps **5.25 lb**
  (12 × 7 oz = 5.25 exactly, and the list's own $/lb ÷ $/case math backs out
  5.25). Not changed.
- Printed $/piece × 12 is off the printed $/case by ≤ 1¢ on some rows (their
  rounding); **the printed per-case number wins**.

## On the sheet but NOT in the catalog (not added — needs Rick's call)

- **04211 Alpeggio** C&W wedge ($53.97/cs) and **04182 Vezzena** C&W wedge
  ($53.14/cs) — products exist in the catalog but have no C&W wedge SKU.
- **Aged Black Truffle** C&W ($59.15/cs) — still "tbd" item number, still
  colliding with 03047's UPC.
- **Apericheese 30014–30017** (8 × 5.3 oz, $29.28–$31.89/cs) — the other
  exact-weight per-unit line from the principles doc; would slot straight into
  `unit: "case"` once added.
