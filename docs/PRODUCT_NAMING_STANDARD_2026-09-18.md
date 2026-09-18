# Product naming standard — names vs. descriptors

**Written:** 2026-09-18 · **Origin:** Rick's observation, verbatim: *"I see a pattern where they
have been mixing descriptors with product names. The product name for the cheese is Fioretto —
there are two, one with truffle and one without. So with truffle would be Fioretto al Tartufo, and
in English Fioretto with Truffle. The descriptors / description would be aged, and made with
summer black truffle from Umbria."*

**Status:** 📋 Standard. Rick owns the conversation with Monti; this is the written form of the
rule, plus the scope of the cleanup on our side.

---

## The rule

**A product name identifies the cheese. Everything else is a descriptor.**

| | Belongs in the name | Belongs in a descriptor field |
|---|---|---|
| | The cheese itself (Fioretto, Caciotta, Asiago, Montasio) | Age — "aged 8 months", "stagionato", "min. 30 days" |
| | A defining inclusion that makes it a different product (al Tartufo, Pepato, alle Erbe) | Provenance of an inclusion — "summer black truffle from Umbria" |
| | A protected designation that is legally part of the name — see below | Format — wheel, ¼ wheel, 7 oz wedge, small |
| | | Pack — 12/case, 6 lb, 4×, vacuum packed |
| | | Rind or process — basket rind, smoked, ATM |

A descriptor never earns a place in the name just because it helps a buyer tell two items apart.
That is what the format, pack, and age fields are for, and every surface already has them.

## The Fioretto family, worked through

| | Name (EN) | Name (IT) | Descriptors |
|---|---|---|---|
| Plain | **Fioretto** | Fioretto | aged min. 5 months · 4.4 lb wheel |
| With truffle | **Fioretto with Truffle** | **Fioretto al Tartufo** | aged 6–8 months · summer black truffle from Umbria · 2 kg wheel, 7 oz wedge |

Two products, one name each. Not "Fioretto Stagionato Small Wheel" and not "Aged Black Truffle
Cheese" — those are a format and a descriptor standing in for names.

## One addition, needs Rick's call

The rule above would also flatten **Asiago Fresco DOP** → "Asiago" and **Asiago Vecchio DOP** →
"Asiago." It shouldn't. *Fresco*, *Mezzano*, *Vecchio* and *Stravecchio* are the Asiago DOP
consortium's own legally defined types, and *Prodotto della Montagna* is a protected mountain
mention — they are part of the name, not descriptors, and stripping them would misdescribe the
cheese on a label.

**Proposed exception:** *a designation that is legally part of the protected name stays in the
name. An Italian word that merely means "aged" does not.* That keeps Asiago Fresco DOP and Asiago
Vecchio DOP intact while still making "Fioretto Stagionato" wrong — Fioretto carries no DOP and no
defined age classes, so *stagionato* there is just the Italian for aged, exactly as Rick read it.

Same test applied elsewhere: **Ricotta Salata** stays (it's the cheese), **Caciotta (Basket Rind)**
becomes Caciotta with a rind descriptor, **Grana Padano Riserva** stays (Riserva is a consortium
designation).

## Where each fact already lives

Nothing here needs a new field. The slots exist; descriptors have simply leaked out of them.

| Fact | catalog.json | items-seed.json / Media Hub | signs.json |
|---|---|---|---|
| Name | `product.name` | `name` | `name` / `italianName` |
| Age | `marketing.age` | `minAge` | `minAge` |
| Milk | `marketing.milk` | `milkType` | `milk` |
| Description | `marketing.blurb` | `shortDescription` / `longDescription` | prose block |
| Designation | in the name | `certification` | `designation` |
| Format + pack | `sku.packing`, `sku.pack` | `packSize`, `weight` | `formats` |

## Current state — what the cleanup is

| Store | Names carrying descriptors |
|---|---|
| `catalog.json` products | 8 of 39 |
| `items-seed.json` items | 40 of 123 |
| `signs.json` records | 5 of 10 |

The sharper symptom is that **one cheese carries a different name in every store**:

| Item | catalog.json | items-seed.json | signs.json |
|---|---|---|---|
| 20423 | Caciotta (Basket Rind) | Caciotta Black Truffles 7 Oz EW | Truffle Caciotta / Caciotta al Tartufo |
| 20579 | Fioretto Stagionato with Truffle | Aged Black Truffle 7 Oz EW | Aged Black Truffle Cheese / Fioretto Stagionato al Tartufo |

That is the real cost. Nothing can be joined or reconciled on name — which is exactly why every
join in the platform runs on item number, and why a wrong item number propagates so far so fast.

## The four standards to hold Monti to

Rick's list, 2026-09-18:

1. **Consistent names** — one name per cheese, per the rule above, identical on the price list,
   the Schede, and the labels.
2. **Consistent descriptions** — age, milk, inclusion and provenance in their own fields, written
   once. "Made with summer black truffle from Umbria" is description, and it is also a selling
   point that currently appears nowhere in our data.
3. **High-res images** — 2000 px minimum short edge, white or transparent background, portion-accurate
   per `CUT_AND_WRAP_PORTION_RULE_2026-09-17.md`. Outstanding list in `GAP_LISTS_2026-09-18.md` §C.
4. **Spec sheets with font stability across operating systems** — not a preference; we have already
   been bitten. The 15 Schede received in August declared **Calibri without embedding it**, so any
   viewer without that Microsoft font substituted a fallback and buyers downloaded a sheet that
   looked nothing like the original. Fixed on our side in commit `8ac00b7` by embedding **Carlito**,
   the metric-compatible open clone, so advance widths were unchanged and the files now render
   identically everywhere. **The ask upstream: embed and subset all fonts at export.** If Monti's
   template stays on Calibri, every new Scheda arrives with the same defect and needs the same
   remediation pass.

## Sequencing

This is a rename across three stores plus whatever Monti changes upstream, and renames are exactly
the kind of change that quietly breaks joins. Suggested order:

1. Agree the names with Monti first — ours should follow theirs, not diverge a second time.
2. Fix `signs.json` and `items-seed.json` before `catalog.json`: the first two are display and copy,
   the third is upstream of pricing and quoting.
3. Item numbers never change as part of this. The join key stays put; only the display name moves.

---

# The gate — read this before creating any item number

**Added 2026-09-18**, after `04108` was found live in the Buyer Catalog. Rick confirmed Cloudinary
has been automated end to end with no manual work, so this was not a typo somebody made — **one of
our own passes minted it.** The asset is
`monti-trentini/stagionati/le-malghe-di-vezzena-300g-atm-usa-04108-13aj1e`: a sync took the
trailing number out of the filename and treated it as an item number. It is not one. It appears in
no price list, no catalog, no item reference. And the photo is a **300 g ATM pack**, not a 7 oz
wedge — the "70z" in the asset title is a typo that then propagated into the spec line a buyer
could read.

## Rule 1 — a code is real only if the price list carries it

> **Never mint an item number from a filename, a title, a folder name, or an inference.**
> If `catalog.json` does not have the code, it is not an item. The correct state for that photo is
> *untagged* — not tagged with a guess.

This binds automated passes exactly as it binds people, and automation is where it has actually
broken. Any script that writes a `code`/`sku` onto a Cloudinary asset, creates a Media Hub item
record, or adds a row to `catalog.json` validates against the price list **first**. A number from
Inventory Manager goes onto the price list before it goes anywhere else.

Corollary for suffixes: `30014-back` is not an item number either. A photo named `<code>-<suffix>`
belongs on `<code>` with the matching **usage tag** (`back-shot`, `unwrapped`, `lifestyle`) — the
taxonomy already exists in `src/lib/media.js`.

## Rule 2 — the spec line format

Rick's standard, 2026-09-18, is item **04182** exactly. `specLine()` renders
`weight · packSize · milkType · minAge`:

```
7 oz · 12 × 7 oz Exact Weight Wedges/case · Cow milk · min 5 months
```

| Field | Pattern | Good | Bad |
|---|---|---|---|
| `weight` | number + space + lowercase unit | `7 oz` · `4.4 lb` | `7 ounce` · `70z` |
| `packSize` | count + ` × ` (U+00D7) + unit + `/case` | `12 × 7 oz Exact Weight Wedges/case` | `12/70z` · `12 x 7oz` |
| `milkType` | `<Animal> milk`, capitalised | `Cow milk` · `Sheep milk` | `cow` · `COW MILK` |
| `minAge` | `min <n> days\|months`, or `<n>–<m> months` for a real range (en dash) | `min 5 months` · `6–8 months` | `4 months` · `—` · blank |

Packaging type (`ATM`, `SV`, vacuum) is **not** part of pack size — it has its own field. Blank and
`—` both fail: an empty age renders a spec line that simply stops, which a buyer reads as unknown
rather than not-applicable.

## The check

```bash
npm run validate:items              # offline, against the repo snapshot
PORTAL_PASSCODE=<passcode> node scripts/validate-item-standards.mjs --live
```

**Run `--live` before trusting a clean result.** Offline mode reads `items-seed.json`, which cannot
see records that exist only in Media Hub — that is precisely how `04108` stayed invisible to every
offline audit run earlier that day. Exits non-zero on any HIGH, so it can gate CI or a pre-commit
hook.

| Severity | What it catches |
|---|---|
| HIGH | A code tagged on an asset, or an item record, with no matching SKU in `catalog.json` — buyer-visible and unquotable |
| MEDIUM | A spec-line field that does not match Rule 2 |
| LOW | A format descriptor sitting in a name or a pack-size string |

**Belt and braces:** `buyer-catalog.jsx` now also filters at render time, so an item whose code is
not on the price list cannot reach a buyer even if it slips past the validator. That is a safety
net, not the fix — the validator names them so they get corrected at the source instead of quietly
hidden.

## First run — 2026-09-18

**22 HIGH · 23 MEDIUM · 31 LOW.** `04108` was not alone.

### Phantom codes carrying real photos (4)

| Code | What it actually is |
|---|---|
| `04108` | Le Malghe di Vezzena **300 g ATM** — wrong format and a minted number. Unlink; keep the file. |
| `30014-back` | Back-of-package shot for Apericheese Yellow. Belongs on `30014` + `back-shot` usage. |
| `30015-back` | Same, for Apericheese Red. Belongs on `30015` + `back-shot` usage. |
| `20163` | "Caciotta Rustega With Truffle" — has a photo *and* an item record, but no price-list SKU. |

The two `-back` shots are a straight win: good photos that never appear as their item's second
photo because they sit on codes that do not exist.

### Duplicate cards (2 findings, both real)

- **`20437` / `20439` / `20440` / `20441`** all read "Cacio Provolone" with the identical pack size
  `2 × Cylinder for slicing/case`. They are the chili, peppercorn, herb and truffle variants, but
  nothing in the name or the spec line says so — a buyer sees four identical cards. Same name *and*
  same pack size is the one combination that is always wrong.
- **`04197` / `04208`** ("Drunken Aged Cheese (Imbriago) Whole Wheel" and "1/4 Wheel") duplicate
  real SKU **`04176`**. Neither ghost is on the price list, so they cannot be ordered — they only
  add a second and third Imbriago card to the catalog.

### Ghost numbers

The check deliberately does **not** flag on edit distance alone: at this code density a five-digit
number sits within two characters of a dozen real SKUs, which is noise. It flags a phantom code
that is one character from a real SKU **and names the same cheese** — the shape every numbering
error here has taken (`03047` beside `03073`, `40176` beside `04176`). Near-misses with different
product names drop to LOW as coincidence worth a glance.

### 16 phantom item records

These render as cards with no photo. Several are real Monti products simply not on the current US
price list (Christmas Gift Box, the Italian Cheese Flights, Lagrein, Pecorino Granglona, the
Imbriago wheels, Grana Padano 20 Mesi). Same call as `01114` / `20482`: either they come onto the
price list or they are parked — but they should not sit in a buyer-facing catalog meanwhile.

### Spec-line drift on the precut line — narrow

`weight`, `packSize` and `milkType` are already clean on all 24. **`minAge` is the outlier: only
`04182` uses the `min` prefix** the standard adopts. The rest are bare (`5 months`, `30 days`), an
em dash, or blank. Fix it after the Schede land and settle the producer's real minimums — get the
figure, then write it in the standard form, not the reverse.

### One structural finding, not a data error

23 product families have several real SKUs sharing an identical name, differing only by pack size —
Grana Padano has eight. Not duplicates; every one is a genuine format. But the catalog shows the
same name repeatedly and the buyer has to read the spec line to tell them apart. That is the naming
standard's job, and it is the strongest argument for finishing it.
