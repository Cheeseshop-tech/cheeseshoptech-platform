# Spec sheet request — Monti Schede, 2026-09-18

**Route:** Stefano / Monti QA · **Status:** 📋 drafted, not sent
**Why one request:** Rick, 2026-09-18 — *"UPC and other needed details will come with the spec
sheet."* The Schede carry item code, product name, minimum ageing, ingredients, allergens,
nutritional panel, EAN part number (the consumer UPC), EAN carton code, packs per carton, shelf
life, pallet configuration and carton dimensions. So this single request closes most of the
open identity gaps in `docs/GAP_LISTS_2026-09-18.md` — it is not just documentation.

Baseline: the 15 Schede received 2026-08 cover 12 of the 24 Cut & Wrap line items. Everything
below is measured against the live customer price list
(`2026 03 Price list Alma-Cow B-DiPalo-AT-Dekalb`), which is the authority on item numbers.

---

## 1. Schede needed — Cut & Wrap 7 oz EW line (12)

All are actively sold off the current price list and have no Scheda on file.

| Item | Product | Notes |
|---|---|---|
| 20423 | Black Truffle (Caciotta al Tartufo) 7 oz EW | |
| **20579** | **Aged Black Truffle (Fioretto Stagionato al Tartufo) 7 oz EW** | **New number, assigned 2026-09-18. UPC needed — see §3.** |
| 01101 | Sharp Provolone 7 oz EW | |
| 01190 | Mild Provolone 7 oz EW | |
| 04165 | Lagorai Cheese 7 oz EW | |
| 04176 | Imbriago Drunken Cheese 7 oz EW | |
| 04211 | Alpeggio 7 oz EW | |
| 05091 | Grana Padano min 12 mo 7 oz EW | |
| 05600 | Parmigiano Reggiano DOP 18 mo 7 oz EW | UPC needed — see §3 |
| 40184 | Pecorino Romano PDO 7 oz EW | |
| 40163 | Ricotta Salata 7 oz EW | |
| 40086 | Montasio PDO 7 oz EW | |

## 2. Corrections to Schede already received (4)

| Item | Issue | What's needed |
|---|---|---|
| **03073** | The sheet sent describes a **whole wheel** — 1 per carton, no "7 OZ EW" in the title, 360-day shelf life, and EAN part number `2003003`, which is the 03003 whole wheel. The price list sells 03073 as the 12-count 7 oz Cut & Wrap wedge. | The 7 oz EW sheet: 12/case, 150-day shelf life, UPC 857594000158. |
| **03044** | Two files, both marked rev 2, dated 08-21 and 08-27. Content identical except the product photo. | Confirm 08-27 supersedes so we can retire the 08-21 file. |
| **30014 / 30015 / 30016 / 30017** | All four Apericheese Schede carry the **same** EAN part number `857594000936`. The price list has four distinct UPCs (…936, …943, …905, …929). | Corrected sheets with the right UPC on each. |
| **01174** | One sheet covers "Smoked Provolone 7 OZ" generically, but the price list sells a **Wedge and a Disc** under this one number at different prices. | A second sheet once the Disc has its own number — see §3. |

## 3. Numbering / UPC items to confirm

1. **20579 UPC.** The price list prints `857594000158` against the Aged Black Truffle row — but
   that is Asiago Vecchio 03073's barcode. Two products, one barcode, will mis-scan at retail.
   We've left the UPC field empty on our side rather than publish it. Please confirm 20579's own
   UPC on its Scheda.
2. **01174 Wedge vs Disc.** Both ship under item 01174 with UPC `857594000103`, but they sell at
   different prices — $45.46/case for the Wedge, $42.25/case for the Disc. One item number
   carrying two prices is an invoicing risk. Please assign the Disc its own number and UPC.
3. **05600** has no UPC printed on the price list. Please confirm on its Scheda.
4. **30017** UPC reads `857595000929` on the price list — prefix `857595`, where every other
   Monti UPC is `857594`. Likely a typo; please confirm the correct digits.
5. **01114 (Mild Provolone, 3/carton) and 20482 (Cacio Fontinello, 2/carton).** We have Schede for
   both, but neither is on the US price list. Are they coming to the US line, or should we park
   them? They're held as unpublished on our side either way.

## 4. Lower priority — whole-wheel line

None of the 71 whole-wheel and other-format line items on the price list have a Scheda on file.
Not urgent against the Cut & Wrap push, but that is the larger share of current revenue. Suggest
sending in tranches, highest-volume families first (Grana Padano, Parmigiano Reggiano, Asiago,
Pecorino Romano).

---

## What this unblocks on our side

| Gap list item | Closed by |
|---|---|
| A2 — 20579 duplicate UPC | §3.1 |
| A3 — 01174 one number, two prices | §3.2 |
| A4 — 05600 missing UPC | §3.3 |
| A5 — 30017 UPC prefix | §3.4 |
| A6 — 01114 / 20482 status | §3.5 |
| B1 — 12 missing Cut & Wrap Schede | §1 |
| B2 — 4 Scheda corrections | §2 |

Images are a separate request to Marketing — see `docs/GAP_LISTS_2026-09-18.md` list C.

**Before sending:** Rick is addressing product naming with Monti separately — descriptors have been
mixed into product names on both sides (see `docs/PRODUCT_NAMING_STANDARD_2026-09-18.md`). Worth
folding into this same conversation so the Schede come back with names already in the agreed form,
rather than needing a second pass. The font-embedding ask in that doc's §4 belongs here too: the
15 Schede received in August declared Calibri without embedding it.
