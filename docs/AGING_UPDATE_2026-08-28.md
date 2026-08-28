# Official aging applied across the app — 2026-08-28

Source: **`ageing item list.xls`** — authored by Stefano, last saved 2026-08-28. Captured verbatim
as `src/data/montitrentini/source/aging-2026-08-28.json`, which is now the canonical aging record
for this tenant. 66 item numbers carry an official figure; 12 cheese families carry a header wording.

## How the sheet was read
- **Column C ("shipping")** is the minimum age at shipment — the authoritative per-SKU figure.
- **Column D ("warehousing…")** reads `30 days/1 month` on every single line. It is a logistics
  allowance, not aging, and was deliberately **not** carried into any product copy.
- Column E and the row-12 note (`40+30+71 = 141 days`) are a worked example for 02005 only.

## Where it landed
| File | What changed | Consumers |
|---|---|---|
| `source/aging-2026-08-28.json` | NEW — canonical map, code → age, plus family wording and the conflict list | source of truth |
| `items-seed.json` | `minAge` on 80 SKUs | Media Hub items panel, `booth.js` spec line, `sign-templates.js` `min_age` binding |
| `catalog.json` | `marketing.age` on 33 of 38 products (was 12), plus reconciled blurb lead sentences | Pricing tool "Aging" spec, Quote Builder "Format & Aging", proposals |
| `signs.json` | Caciotta ×4 and Imbriago `minAge` + contradicting prose | printed retail case signs |
| `source/cut-and-wrap-spec.json` | `minAge` on 14 C/W wedges | staging for a future catalog merge |

**Rules applied.** A SKU on the sheet gets its exact figure. A SKU absent from the sheet inherits
its parent cheese's figure **only when every sheet-covered SKU in that product agrees** — otherwise
it is left blank and listed below. Product-level `marketing.age` is the sheet's family wording where
one exists, else a single value (`aged min. 30 days`) or an honest range (`aged 4–13 months`).

## Material changes to what a buyer sees
- **Grana Padano base line: `min. 12–16 months` → `min. 10 months`** (05001, 05007, 05012, and the
  wedge/grated/flake SKUs 05091, 05123, 05124, 05205, 05211). Also drops the C/W wedge 05050 from
  12 → 10 months. **This is the single change most likely to appear on printed collateral.**
- **Asiago Vecchio wheels/quarters: 9 → 10 months** (03003, 03014, 03073, 03047).
- **Caciotta family on the retail signs: 5 days → 30 days** (all eight codes). Sign prose that said
  "aged only briefly", "only days old" and "Aged briefly in Grigno" was rewritten to match.
- **Imbriago on the retail sign: 30 days → 5 months** (04028). "A young cow's-milk wheel" → "A
  cow's-milk wheel".
- **21 products gained an aging figure they did not have** (were showing `—`): Alta Badia, Bra,
  Caciotta (both sizes), both Fiorettos, Fontal, Gorgonzola, Imbriago, Mild Provolone, Naturally
  Smoked Provolone, Parmigiano Reggiano, Pecorino Romano, Pecorino Toscano, Piave, Raschera,
  Ricotta Salata, Stelvio, Taleggio, Toma.

## Open — for Stefano
1. **Asiago Vecchio, 9 or 10 months?** The section header reads *aged 9 months* (also the DOP
   minimum) but items 03003/03014 read *10 months*. SKUs were set to 10; the **retail sign was left
   at 9 months** because it is family-level. Confirm before reprinting signs.
2. **Grana Padano appears twice on the sheet.** An early block says *aged 12 months* with corrupted
   shipping cells (`1.0`, `2.0`, `8`); a later, fuller block says *aged min. 10 months* for the same
   codes and adds 05012/05093/05018/05411/05095. The later block was taken as current (Rick,
   2026-08-28). Confirm 10 months is right before it reaches a price list or a sign.
3. **Item 5058** (Grana C/W 7 oz wedges) carries a bare `8` with no unit and is not in the catalog.
   Not applied. Is 5058 live, and is it 8 months?
4. **Sharp Provolone is internally inconsistent.** The block holds 01269 = 45 days, 01032 = 90 days,
   and 01154 — a *mild* provolone fiaschetto — filed under it at 20 days. Meanwhile 01126's own pack
   description says *aged minimum 5 months*. Product-level age was left blank on purpose; 01101,
   01126 and 01401 have no aging.
5. **Naturally Smoked Provolone wedge (01174)** — parents split 15 days (01021, 01186) vs 20 days
   (01155). Which format is the wedge cut from?
6. **Parmigiano Reggiano wedge (05099)** stays at *min. 18 months*; the sheet carries only 12 and 24.
7. **Piave 40158** — the sheet says 13 months, the pack description says *aged more than 12 months*.
   Pack text was left alone.
8. **Aged Black Truffle** — the sign is mapped to code 20533, but 20533 is Fioretto Stagionato with
   Truffle in the catalog and the sheet ages it at 8 months. The sign's *90 days on wooden boards*
   was left as-is. Its real item number is still open (cut-and-wrap-spec: no item number on the
   sheet, UPC duplicates 03047). **Blocks the Aged Black Truffle sign.**
9. **Vezzena 04182** kept at *min 5 months* rather than inheriting the 9-month wheel — the C/W spec
   documents a 5-month Vezzena wedge. Are these two different cheeses?

## Not on the sheet at all — no aging anywhere
Cacio Provolone (20437/20439/20440/20441) · Castelmagno (20567) · Pecorino Siciliano Primosale
(20700–20703, 20719, 20720) · Apericheese (30014–30017) · Grana Riserva 05417 · Parmigiano 05600 ·
Asiago Fresco 02091 was resolved from its parent wheel (40 days).

## Verification
`npx vite build` — clean, exit 0, no new warnings. All five JSON files re-validated after write.
