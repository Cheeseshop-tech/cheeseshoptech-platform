# Cut & Wrap (Food Service) — Item + Image Gap Report

Source: `MT Assortment Cut nWrap FW (1).pdf` (3 pages, 20 product rows)
Checked against: Cloudinary `monti-trentini/*` (376 images) and `src/data/montitrentini/items-seed.json` (112 items)
Date: 2026-07-09

---

## 1. Image verdict — the PDF images are NOT usable

Every packshot embedded in the C&W sheet is a screen thumbnail.

| Metric | PDF images | Existing Cloudinary packshots |
|---|---|---|
| Largest | 331 × 210 px | 6732 × 6732 px |
| Smallest | 116 × 111 px | 652 × 832 px |
| Effective ppi | 150–211 | print-grade |

**Recommendation: do not upload.** They fail as web packshots, catalog tiles, and print. Loading them into Cloudinary as `sku`-tagged assets would make the Media Hub *look* complete while actually being wrong — and a wrong image is harder to fix than a missing one, because nothing flags it.

Extracted originals are staged (not uploaded) at
`src/data/montitrentini/source/cut-and-wrap-thumbnails/` for reference only.

**Found while extracting:** `03044` (Aged Asiago, 5 mo) and `03047` (Asiago Vecchio, 9 mo) are
the *same image object* in the PDF — one photo, printed twice. At least one row is showing the
wrong product.

---

## 2. Item coverage

| Item | Product (7 oz Exact Weight wedge) | In items-seed | Cloudinary packshot |
|---|---|---|---|
| 02091 | Asiago Fresco PDO, 30–40 days | yes | **yes** |
| 03044 | Aged Asiago PDO, 5 months | yes | no |
| 03047 | Aged Asiago (Vecchio), 9 months | **no** | no |
| 20424 | Caciotta Piccante (red chili) | yes | **yes** |
| 20481 | Pepato (black peppercorn) | yes | **yes** |
| 20480 | Mountain Herbs | yes | **yes** |
| 20423 | Black Truffle | yes | **yes** |
| — | **Aged Black Truffle** | **no** | no |
| 01101 | Sharp Provolone | yes | no |
| 01190 | Mild Provolone | yes | no |
| 01174 | Naturally Smoked Provolone — Wedge | yes | no |
| 01174 | Naturally Smoked Provolone — **Disc** | **no** | no |
| 04165 | Lagorai | yes | no |
| 40176 | Imbriago Drunken Cheese | as **04176** | **yes** (as 04176) |
| — | **Vezzena, aged min 5 months** | as 04182 | no |
| 05050 | Grana Padano, min 12 months | **no** | no |
| 05099 | Parmigiano Reggiano DOP, 18 months | **no** | no |
| 40162 | Pecorino Romano PDO | **no** | no |
| 40163 | Ricotta Salata | yes | no |
| 40086 | Montasio PDO | yes | no |

**Net-new items to seed:** 03047, 05050, 05099, 40162
**Items needing a number from Stefano:** Aged Black Truffle, Smoked Provolone Disc, Vezzena 7 oz EW
**Items missing a packshot:** 13 of 20

---

## 3. Data errors on the sheet — queue for Stefano

1. **Aged Black Truffle carries UPC `857594000158`** — identical to 03047 Asiago Vecchio. One of the two is wrong.
2. **01174 is used twice** — Smoked Provolone Wedge and Smoked Provolone Disc share the item number *and* UPC `857594000103`. Two different products; needs two numbers.
3. **40176 vs 04176 (Imbriago)** — the sheet says `40176`; Cloudinary and items-seed both say `04176`. Likely a digit transposition on the sheet.
4. **03047 vs 03073 (Asiago Vecchio 9 months)** — sheet says 03047, items-seed says 03073. Same product, two numbers.
5. **Vezzena row has no item number.**
6. **No UPC on any Italian Classic item** — 05050, 05099, 40162, 40163, 40086 are all blank.

Per house rule, item identity is not guessed. These stay blocked until Stefano answers.

---

## 3b. What was actually merged (2026-07-09)

New source: `src/data/montitrentini/source/cut-and-wrap-spec.json`
`scripts/build-items-seed.mjs` now reads it as a third input. It only fills **blank** fields —
zero overwrites of existing non-empty values (verified).

```
items-seed.json: 71 SKUs from catalog + 41 identity-only from item-reference
                 + 17 enriched / 4 new from cut-and-wrap-spec   →  116 items (was 112)
```

- **4 new:** 03047, 05050, 05099, 40162
- **13 enriched** with packSize, weight, UPC, milk type, min age, certification, short description
- `packagingType` and the pallet/shelf-life `logistics` block are captured in the spec file but
  **not** injected into the seed — the Media Hub schema is identity + copy only (`src/lib/items.js`)

## 3c. Price list + inventory app (2026-07-09, second pass)

**All 17 C&W SKUs added to `catalog.json`** under their existing products, with real pack data
(12 × 7 oz EW, 5.25 lb net / 6 lb gross, pallet Ti×Hi, 144 cases/pallet, 150-day shelf life).
Catalog goes 71 → 88 SKUs. `availability` derived from today's availability sheet: the four
caciotta wedges are `in_stock`, the rest `unavailable`.

**Pricing left blank, per Rick.** `cost.fob: null`, `priceOnRequest: true`. Calculator formulas
untouched — verified `05001` still quotes $7.47/lb and $5,378.40 on 10 cases, byte-identical.

> ⚠️ **Known hazard, accepted for now.** `quoteUnitPrice` returns `null` for an unpriced SKU, but
> `quoteLineTotal` then returns `0`. A quote containing 02091 will show a **$0 line with no
> warning**. 17 SKUs are exposed. Fix when the price update lands, or guard the engine sooner —
> `unpriced = catalog.products.flatMap(p => p.skus).filter(s => typeof s.cost?.fob !== "number")`.

**Inventory app: 13 of 17 already there.** `inventory.json` is regenerated from the availability
sheet, so it cannot be hand-edited. Four codes are simply not on the 2026-07-09 sheet:
`03047`, `05050`, `05099`, `40162`. Stefano has to add them upstream. (Note the sheet carries
`03073`, not `03047` — same conflict as §3.)

**Bonus found in the food-service price list.** 12 priced SKUs exist there that `catalog.json`
has never seen: `01314`, `01401`, `05123`, `05124`, `05205`, `05211`, `20437`, `20439`, `20440`,
`20441`, `20569`, `20717`. Their EXW column was verified to be exactly `cost.fob` (13/13 exact
match on overlapping codes). Captured in
`src/data/montitrentini/source/pricelist-2026-03-foodservice.json`.

## 3d. Food-service price-list SKUs applied (2026-07-09, third pass)

**11 of the 12 added to `catalog.json` WITH their printed EXW prices.** These are Stefano's
numbers transcribed, not invented — the EXW Elizabeth NJ column is the `cost.fob` basis the
engine consumes, confirmed by exact match on every code the two sheets share.

```
catalog: 88 -> 99 SKUs across 37 products (was 34)
items-seed: 116 -> 125 items
priced: 82 · unpriced: 17 (still only the C&W wedge line)
```

- into `sharp-provolone`: `01401` shredded 5 lb — $7.03
- into `grana-padano`: `05123` grated 1.5 lb $8.37 · `05124` flakes 1.5 lb $9.42 ·
  `05205` flakes tray 1 lb $9.50 · `05211` flakes 5.5 lb $9.27
- new product **Cacio Provolone** (`cacio-provolone`, Provolone): `20437` chili $5.78 ·
  `20440` herbs $5.78 · `20439` peppercorn $5.78 · `20441` truffle $7.27
- new product **Bianco Duro d'Italia** (`bianco-duro-italia`, Alpine & Specialty): `20569` $7.10
- new product **Bianco Duro d'Europa** (`bianco-duro-europa`, Alpine & Specialty): `20717` $6.73

`availability` follows the sheet: everything marked "PRE-ORDER NEEDED FOR SHELF-LIFE PURPOSE" is
`preorder`. `20569` is `in_stock` — **it has 84 cases on hand and, until now, no way to quote it.**
Verified: it quotes at $7.10/lb and allocates cleanly against lot 1285661.

`01314` **withheld.** It is printed twice, for two different products at two different prices.
No existing price moved: `05001` still totals $5,378.40 on 10 cases.

## 4. Scope boundary — the price list stays out

`2026 03 Price list food service (1).pdf` contains EXW Elizabeth NJ and delivered $/lb pricing.
**Pricing does not enter the Media Hub.** It belongs to the Custom Price List Creator. The C&W sheet's non-pricing columns (packaging type, pieces/case, net + gross case weight, pallet Ti×Hi, cases/pallet, shelf life, UPC) are legitimate Media Hub fields and can be merged into items-seed.
