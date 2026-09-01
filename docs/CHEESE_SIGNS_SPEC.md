# Cheese Signs — spec

**Status:** v1, 2026-08-23 (Rick + Claude). Template established, ten Monti Trentini signs proofed.
**Lives in:** the Content Engine — a new template family, `cheese-sign`, alongside `slide-templates.js`.
**Reads with:** `TEMPLATE_ENGINE_SPEC.md` §10 (slot manifests) · `CONTENT_ENGINE_WIRING_SPEC.md` (the five
wires) · `IMAGE_PIPELINE_SPEC.md` (packshots) · `CLIENT_DATA_ROLES.md` (who answers the open questions).

---

## 1. What a cheese sign is

A printed card that sits with the cheese in a service case or on a shelf and does the selling when
nobody is standing there. It is a **retail-facing deliverable produced by the platform** — same slot /
token / paint engine as slides and proposals, different canvas: a physical sheet instead of a screen.

**Two sizes, two description modes, four templates:**

| Template id | Trim | Mode | Use |
|---|---|---|---|
| `sign-3x4/short` | 3″ × 4″ | short description **+ packshot** | the default case card |
| `sign-3x4/long` | 3″ × 4″ | long description, no photo | when the cheese needs a story, not a picture |
| `sign-4x5/short` | 4″ × 5″ | short description **+ packshot** | counter / end-cap, bigger read |
| `sign-4x5/long` | 4″ × 5″ | long description, no photo | full-service counter, tasting table, demo |

The long mode drops the photo on purpose. On a 3″ × 4″ card you can have a picture or you can have a
paragraph; trying to have both produces a sign nobody reads.

## 2. One sign per CHEESE, not per SKU

**Decided 2026-08-23 (Rick).** A sign sells the cheese; the pack format is a purchasing detail. So
`Asiago Vecchio` gets one sign, and the whole wheel, the quarter and the 7 oz exact-weight wedge all
sit behind it. Each record carries its `skus[]` array, so the sign is still joined to the item master
and to inventory — you can ask "which signs are for cheeses we are out of" and get an answer.

Signs in v1 (10): four Asiagos (Fresco, Fresco di Montagna, Stagionato, Vecchio), four caciottas
(Truffle, Mountain Herbs, Black Pepper, Red Chili), Imbriago, and the Aged Black Truffle
(Fioretto Stagionato al Tartufo).

## 3. The data contract

Sign content lives in `src/data/<tenant>/signs.json`. One record per cheese; every slot on every
template binds to a field on that record. **Nothing on a sign face is typed by hand at compose time.**

```
id · name · italianName · designation ("DOP"|null) · family · skus[] · formats
milk { type, detail, treatment }        → cow icon + two lines
minAge · dopMinimum                     → the age cell in the spec rail
region { label, sub, icon }             → region illustration + two lines
mountainMark (bool)                     → the "Product of the Mountain" badge
origin ("Product of Italy")             → tricolore + line
flavorProfile                           → the accent italic line
unique                                  → "Worth knowing" block (long mode)
shortDescription (≤165 chars)           → short mode body
longDescription  (≤900 chars)           → long mode body
image (Cloudinary public_id)            → packshot, contain-fit on white
qrUrl                                   → QR
stock                                   → NOT printed; a build-time warning only
```

**Character caps are real.** The faces are fixed-height; the proof was checked programmatically for
overflow on all 40 rendered cards (0 overflowing). Exceed the cap and the sign clips — the validator
should refuse it rather than let a clipped sign reach a printer.

Sources for v1 content: the item master (`items-seed.json`) for SKU truth, milk type and age; the
producer's own English pages (`montitrentini.com/en/cheeses/*`, read 2026-08-23) for descriptions,
aging and flavor; `inventory.json` for stock state.

## 4. Where the numbers came from — and where they disagree

The item master and the producer site do not always state the same aging, because the producer states
the **PDO / category minimum** and the item master states **what Monti Trentini actually ships**. The
sign prints the item-master number and keeps the minimum in `dopMinimum` for reference:

| Cheese | Sign prints | Producer states |
|---|---|---|
| Asiago Fresco | 30–40 days | min 20 days |
| Asiago Fresco di Montagna | 60–70 days | min 30 days |
| Asiago Stagionato | 5 months | min 90 days (3–9 months) |
| Asiago Vecchio | 9 months | at least 9 months |
| Caciottas (truffle, herbs, pepper, chili) | 5 days | minimum 5 days |
| Imbriago | 30 days | at least 30 days |
| Aged Black Truffle | 90 days | at least 90 days |

**Open item — confirm the shipped ages with Stefano before a commercial print run.** A printed sign is
a claim; a spreadsheet is not.

**Sharper as of 2026-08-25:** the Consorzio Tutela Formaggio Asiago's own consumer booklet (the
regulator, not a retailer) states **Vecchio requires a maturing period of over 10 months.** The
Asiago Vecchio sign ships at 9 months — a month short of the name it carries. Full digitized
source, the three ways this can resolve, and what else the booklet says about all four Asiago
signs: `docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md`.

## 5. The icon set (`src/lib/sign-icons.js`)

All icons are inline SVG on a shared 120 × 82 frame with one stroke weight, so the spec rail reads as
a family. Colors are Brand-Kit tokens, resolved per tenant at render.

- **`cow`** — black-and-white spotted cow, side profile. Marks milk type. Sheep and goat variants are
  the obvious next two; Monti Trentini's sheep-milk line (Pecorino, Ricotta Salata) will need one.
- **`region.*`** — a small landscape illustration per region: `valsugana` (Dolomite peaks over a valley
  and river), `altopiano-asiago` (the plateau tabletop with pasture fencing), `trentino-veneto` (two
  ranges over the shared PDO milkshed).
- **`dop`** — a **house** DOP/PDO badge, not the EU mark. It is a stand-in: **before any commercial
  print run, swap in the official Asiago DOP consortium and EU PDO artwork.** Reproducing the real
  marks is legitimate on a genuine PDO product, but the files have to be the real files.
- **`mountain`** — the "Product of the Mountain" badge, same caveat.
- **`italy`** — boot silhouette. Drawn, but **not used on the face**: the tricolore rule plus
  "PRODUCT OF ITALY" reads better at this size. Kept for larger formats.

## 6. The QR — read this before printing

Rick chose montitrentini.it as the QR target. What is actually there:

1. **montitrentini.it redirects to montitrentini.com.** The `.it` domain also throws an SSL error over
   HTTPS. The QR encodes the `.com` URL directly, so a scan never touches the broken certificate.
2. **There are no per-cheese pages.** The producer's site is organised by family:
   `/en/cheeses/asiago-pdo`, `/en/cheeses/caciotta`, `/en/cheeses/regional-specialites`. All four Asiago
   signs therefore point at the same page, and the caciotta signs at another.
3. There is a good English version of every family page, with the same copy this spec sourced.

So a shopper who scans lands on a correct, on-brand, English page — but one that lists ten cheeses
instead of the one in front of them. **That is the weak link in the sign.** The fix is
`qrUrl` per record: change one string and every sign repoints. Options, cheapest first:

- keep the family page (today's state);
- add public, ungated `/p/<code>` product pages on `montitrentini.cheeseshoptech.com` — English, US
  formats, our photography, our copy, and a destination we control permanently. This is the option
  worth building, and it makes the sign a lead-generating surface rather than a referral to a page we
  do not own.

All ten QR codes were generated offline (error correction M, quiet zone 1) and **machine-decoded from
the rendered proof — 10/10 resolve to the intended URL.** At 0.62 in (3 × 4) and 0.78 in (4 × 5) they
scan comfortably at case distance.

## 7. Print specification

- **Trim:** exactly 3.000″ × 4.000″ and 4.000″ × 5.000″ — verified by measuring the rendered proof
  (288 × 384 px and 384 × 480 px at 96 dpi).
- **Bleed:** 0.125″ all round, added by the export, not by the canvas. The ground fill and the accent
  bar extend into it.
- **Safe margin:** 0.12″ inside trim. No text crosses it.
- **Color:** brand tokens — `$primary #064E22`, `$accent #009640`, `$cream #FAF9F5`, `$ink #141413`.
  For offset or a color-managed digital run, convert once and store the CMYK builds in the Brand Kit;
  do not let a printer guess at the green.
- **Stock:** 100 lb cover or heavier, matte. Cream ground is doing work — do not print on bright white.
- **Fonts:** Fraunces (display) + Inter (UI), the tenant Brand Kit faces. Embed or outline before
  sending to a commercial printer.
- **Printing from the proof:** print at 100%, "actual size", not "fit to page". The proof sheet paginates
  one section per page.

## 8. How it plugs into the Content Engine

Same architecture as every other output; nothing new is invented.

| Wire | Feeds | Status |
|---|---|---|
| Brand Kit | ground, accent bar, wordmark, all type tokens | ✓ existing `brand-tokens.js` |
| Media Hub / Cloudinary | `packshot` slot (`tag: packshot`, `binds: image`) | ✓ existing `cldUrl` / MediaPicker |
| Catalog / item master | milk, age, SKUs, format list | ✓ `items-seed.json` |
| Brand Voice | flavor line and descriptions authored in voice | ✓ copy in `signs.json` |
| Studio Director | Stage 0 deterministic fill — a sign needs **zero** human slot-filling | ● wire the sign family in |

**Build order to make it real in the app:**

1. Add `src/lib/sign-templates.js` + `src/lib/sign-icons.js` + `src/data/montitrentini/signs.json` (done —
   this session).
2. Teach the manifest renderer two new slot kinds: `qr` (kind: "qr", binds a URL) and `showIf`
   (conditional slots, for the DOP and mountain badges). Everything else it already renders.
3. Add a **Signs** entry to the Content Engine app registry (`content-engine-page.jsx`), route to a
   picker: choose cheeses → choose size → choose mode → print sheet.
4. Export: HTML render → PDF with bleed and crop marks. The proof already prints correctly from a
   browser; a Netlify function render is the durable version.
5. Validator: refuse a sign whose description exceeds the cap, whose packshot is missing, or whose
   cheese is out of stock.

## 9. Open items

| # | Item | Owner |
|---|---|---|
| 1 | **Pasteurized vs raw milk is unknown for every cheese.** Not in the item master, not on the producer site. The field exists (`milk.treatment`) and prints when filled. | Stefano |
| 2 | Confirm shipped minimum ages (§4) before a commercial run — specifically, Asiago Vecchio ships at 9 months but the Consorzio's own literature defines "Vecchio" as over 10 months (`docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md`) | Stefano |
| 3 | Official EU PDO + Asiago consortium mark artwork to replace the house badges — reference photos of both marks now exist (`docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md`) but are phone photos of a printed booklet, not production art; still need the real vector files | Marketing (per `CLIENT_DATA_ROLES.md`) |
| 4 | Decide the QR destination: family page vs. `/p/<code>` pages we control (§6) | Rick |
| 5 | **Red Chili Pepper Caciotta shows 0 cases available (availability sheet 2026-08-15).** Its sign is built; confirm before printing. | Rick |
| 6 | Price / price-per-lb zone — deliberately **not** on the v1 face. If retailers ask, it is a blank white box at the footer, not a printed number. | Rick |
| 7 | Sheep-milk icon for the Pecorino / Ricotta Salata line | Design |

## 10. Files

```
docs/CHEESE_SIGNS_SPEC.md              this document
src/data/montitrentini/signs.json      the ten sign records
src/lib/sign-templates.js              four manifests, cheese-sign family
src/lib/sign-icons.js                  cow, region, DOP, mountain, italy
design/cheese-signs/build_proof.py     the proof generator (photos, QR, layout)
design/cheese-signs/icons.py           icon source shared with sign-icons.js
monti-trentini-cheese-signs.html       the printable proof (40 faces)
```
