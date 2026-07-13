# Image Health — Monti Trentini

Date: 2026-07-09
Sources audited: Cloudinary manifest `src/data/montitrentini/images.json` (242 images) ·
`catalog.json` (99 SKUs) · `MT Assortment Cut nWrap FW.pdf`

**Standing rule: Cloudinary hosts hi-res only.** Low-res reference thumbnails live locally in
`/public/placeholders/` and are opt-in per call site. A buyer never sees one.

---

## 1. Headline

| | Count | |
|---|---:|---|
| SKUs in catalog | 99 | |
| ...with a real packshot | **39** | 39% |
| ...with a low-res reference placeholder | **9** | internal only |
| ...**with no image at all** | **51** | **52%** |

**Half the sellable catalog has no image.** All 51 blanks **carry a price** — every one is a
product a rep can quote today and cannot show.

---

## 2. Resolution health of what we DO host

242 images in the manifest:

| Short edge | Count | Verdict |
|---|---:|---|
| 2000 px+ | 125 | print-grade |
| 1200–1999 px | 67 | good |
| 600–1199 px | 40 | web only — will not survive print |
| under 600 px | 10 | unusable |

**192 of 242 images have no SKU link at all.** They're lifestyle, production, and story photos —
legitimately unlinked. But it means the catalog is drawing on a pool of only ~50 product-linked
assets.

### SKU-linked images that are too small to print

| Item | Size | Asset |
|---|---|---|
| 40107 | 652 × 832 | Piave Mezzano |
| 40109 | 672 × 884 | Piave Vecchio |
| 05091 | 704 × 898 | Grana Padano Porzionato |
| 04108 | 1000 × 1000 | Le Malghe di Vezzena 300g |
| 30014 | 1125 × 1125 | Apericheese (Yellow) |
| 30015 | 1125 × 1125 | Apericheese (Red) |

These six render fine on the web and fall apart on a sell sheet. Reshoot or request originals.

---

## 3. Data errors in the manifest

**`20724` is linked to a photo of cows.** Two assets carry that SKU:

- `Alpeggio — Monti Trentini` · 3000 × 2814 · correct
- `Cows grazing at altitude` · 1670 × 870 · **a lifestyle shot, tagged as a product, and marked
  `approved-for-press`**

Which one wins depends on manifest order. Unlink the cows.

**Four more SKUs carry two packshots each** — harmless but ambiguous, since `imageForCode` takes
the first match:

| Item | Competing assets |
|---|---|
| 02005 | "Asiago Fresco (variant a)" vs "Asiago Fresco DOP" |
| 04154 | "Soffio del Lagorai" vs "Lagorai" |
| 20141 | "Caciotta al Peperoncino" vs "Caciotta al Peperoncino (3kg)" — different pack sizes |
| 20533 | "Aged Truffle Caciotta" vs "Caciotta Tartufo Stagionata (3kg)" — different pack sizes |

`20141` and `20533` are the concerning pair: one SKU, two pack sizes, and the app picks whichever
is first. Decide which asset owns the code.

**117 of 242 images are still `draft`.** Only 122 are `approved-for-press`. Anything a proposal
pulls should be approved; nothing enforces that today.

---

## 4. What images are needed

### Priority 1 — priced, stocked, invisible (request first)

The Cut & Wrap 7 oz exact-weight wedge line. 9 now show a low-res reference; all 9 need originals.

| Item | Product |
|---|---|
| 01101 | Sharp Provolone 7 oz EW |
| 01174 | Naturally Smoked Provolone 7 oz EW — **Wedge and Disc, two shots** |
| 03044 | Aged Asiago PDO, 5 months |
| 03047 | Asiago Vecchio PDO, 9 months |
| 04165 | Lagorai 7 oz EW |
| 05050 | Grana Padano PDO 7 oz EW |
| 05099 | Parmigiano Reggiano DOP 7 oz EW |
| 40086 | Montasio PDO 7 oz EW |
| 40162 | Pecorino Romano PDO 7 oz EW |
| — | Aged Black Truffle (no item number) |
| — | Vezzena 7 oz EW (no item number) |

⚠ `03044` and `03047` share **one identical photograph** in the assortment sheet. One is wrong.

### Priority 2 — priced, no image, no placeholder (51 SKUs)

**Provolone (10)** — `01126`, `01154`, `01155`, `01186`, `01401`, `20438`, and the four new Cacio
Provolone cylinders `20437` / `20439` / `20440` / `20441`

**Pecorino & Sheep (11)** — the six Pecorino Siciliano Primosale variants `20700`–`20703`,
`20719`, `20720`; `40103`, `40104` Pecorino Romano; `40140` Ricotta Salata Saporita;
`40174`, `40175` Pecorino Toscano

**Alpine & Specialty (11)** — `04168`, `20511` Fontal Trentinella; `20464` Alta Badia;
`20519` Gorgonzola; `20520` Taleggio; `20569` Bianco Duro d'Italia; `20584` Stelvio;
`20717` Bianco Duro d'Europa; `40020`, `40130` Montasio; `40158` Piave

**Grana Padano (7)** — `05012`, `05018`, `05095`, and the four new formats `05123` grated,
`05124` / `05205` / `05211` flakes

**Piemontesi (5)** — `20450`, `20451` Bra; `20452` Toma; `20453` Raschera; `20567` Castelmagno

**Parmigiano (3)** — `05025`, `05033`, `05034`

**Asiago (2)** — `02302` square for slicing; `03014` ¼ wheel

**Caciotta (2)** — `20142` black pepper; `20229` herbs (small)

> `20569` deserves its own line: **84 cases on hand, freshly priced at $7.10/lb, and no photo.**
> It is the single most sellable blank in the catalog.

### Priority 3 — reshoot the six sub-1200 px SKU images listed in §2.

---

## 5. Spec for anything new

- **2000 px minimum** on the short edge. Print needs it; the web downsamples for free.
- White or transparent background for packshots.
- One canonical asset per item number. If a product ships in two pack sizes, they are two SKUs
  and want two photos.
- Named or tagged with the item number, so `sync-images.mjs` can link it.
- `approved-for-press` before anything customer-facing touches it.

---

## 6. Placeholder mechanics (what shipped 2026-07-09)

17 thumbnails extracted from the assortment sheet, re-encoded to WebP: **836 KB → 108 KB (87%
smaller)**. Served from `/public/placeholders/<code>.webp`.

- **Never uploaded to Cloudinary.** The Media Hub stays hi-res only.
- **Opt-in per call site.** `codeImageUrl(..., { allowPlaceholder: true })`. Only the Proforma
  passes it. Proposals and sell sheets do not, so a buyer cannot receive one.
- Rendered with a dashed border and a **REF** corner tag; the detail dialog shows the image at
  native size, banners it as "Reference image only," and **hides Share / Download / Copy link.**
- 9 of the 17 actually fill a gap. The other 8 are already superseded by real packshots and sit
  unused — harmless, and they self-retire the moment `imageForCode` finds something better.

To retire one: upload the hi-res original, re-run `scripts/sync-images.mjs`, and drop the code
from `PLACEHOLDER_CODES` in `src/lib/images.js`.
