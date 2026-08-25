# Sign Composer — drag-and-drop layout editor (spec, 2026-08-25)

For: a Claude Code session in this repo · Owner: Rick Posada
Read first: `src/lib/sign-templates.js` (the grammar this emits), then
`docs/CHEESE_SIGNS_SPEC.md`, then `docs/HANDOFF_2026-08-25_asiago-shelf-talkers.md`.
State: **spec only, nothing built.**

Rick's ask, verbatim: *keep all layouts, create an HTML editable drag-and-drop field that
allows repositioning of image and copy fields to optimize composition, then a save
composition to copy across the series.*

Decisions already made (2026-08-25): **standalone HTML in `design/`**, no build step ·
**export manifest for paste-in**, templates stay versioned in code · **all three layouts
G/H/I kept** as presets, none discarded · **MT logo uses the PNG**, no vector exists.

---

## 1. The block model — the unit of composition

**Rick's model, and the one to build:** a sign is a small number of **semantic blocks**. You
drag a *block*, not a text box. Each block owns its internal arrangement; the composer never
asks him to position a milk icon relative to a milk label.

His blocks, verbatim, plus the ones already in the templates:

| Block | Contains | Binds to |
|---|---|---|
| **Name** | cheese name + Italian name | `name`, `italianName` |
| **Origin** | region label, sub-label, region illustration | `region.label`, `region.sub`, `region.icon` |
| **How to verify** | age, DOP minimum-aging floor, milk type + detail | `minAge`, *(DOP floor — new)*, `milk.type`, `milk.detail` |
| **DOP** | DOP/PDO mark, Product of the Mountain mark | `designation`, `mountainMark` (both `showIf`) |
| **Company ID** | MT logo, wordmark, "Casari dal 1925 · Grigno, Valsugana" | brand kit, not the record |
| **QR** | code + caption | `qrUrl` |
| **Flavor** | italic flavor tag | `flavorProfile` |
| **Recognition cue** | one-line sensory detail | `recognitionCue` *(new field)* |
| **Description** | short or long copy | `shortDescription` / `longDescription` |
| **Packshot** | product photo — **on the talker too**, reversing the handoff's original call (see below) | `image` |

### Packshot on the talker — reversed 2026-08-25

`HANDOFF_2026-08-25_asiago-shelf-talkers.md` originally dropped the packshot from the talker.
Rick reversed that: *"we should include a pack shot. it seems there is enough room."* He is
right about the room. Budget at 250×350, `s = 250/300 = 0.833`:

| Block | @ base | @ talker |
|---|---|---|
| Accent bar | 5.5 | 4.6 |
| Company ID (wordmark + logo) | 36 | 30.0 |
| **Packshot** | 115 | **95.8** |
| Name | 30 | 25.0 |
| Italian name | 10 | 8.3 |
| Flavor | 18 | 15.0 |
| Recognition cue | 14 | 11.7 |
| Origin + verify rail | 34 | 28.3 |
| DOP + QR foot | 62 | 51.7 |
| Padding (top + bottom) | — | 28.0 |
| Inter-block gaps (8 × 4) | — | 32.0 |
| **Total** | | **330.4 of 350 — 19.6 spare (0.20 in)** |

Assets exist: all four Asiago records carry an `image` (`monti-trentini/asiago/…`), verified
2026-08-25. No new photography needed.

**Two things the arithmetic does not settle.**

The original reason for dropping it was **not** space — it was redundancy: the talker sits
beside the actual wedge, so why photograph it. That argument stands independent of the budget.
The counter-argument, and the reason to include it anyway: the packshot shows the **cut face
and interior paste**, which a shopper often cannot see when the wedge is wrapped or the wheel
is uncut. `CLAUDE.md` already treats the cut as intentional — "a whole wheel shown with a cut
wedge is acceptable for the whole-wheel SKU — the slice is intentional, revealing the interior
paste/texture." A packshot that shows paste earns its space next to the product; one that shows
an identical wrapped wedge does not. **Choose the image on that basis**, per record.

**0.20 inch of slack is thin.** Any block growing eats it — a name wrapping to two lines, a
recognition cue running long. Asiago Stagionato d'Allevo is the stress case. This makes the
series filmstrip (§2) load-bearing rather than nice-to-have: the talker with a packshot is a
composition that *just* fits, so it must be validated against all four records before export,
not after.

If it turns out not to fit under a real record, the cheapest recovery is presentation, not
deletion — Packshot as a smaller inline block beside the Name rather than a full-width band.
Add that as a declared presentation on the block (§1) rather than a separate layout.

### Blocks change with the layout — three layers, not two

Rick: *"the blocks I'm referring to will change with the layout or template suggestion."*

That means the table above is **not a fixed vocabulary**. Separate three things that are easy
to conflate:

| Layer | What it is | Example |
|---|---|---|
| **Block** | The semantic content unit. Stable across every layout. | "Name" — always the cheese name + Italian name, always bound to `name` / `italianName` |
| **Presentation** | How that block *renders* in a given layout. | G renders Name as a reversed-type band on brand green; H sets it vertically down a left rail; I demotes it below the badges |
| **Layout / template** | Which blocks are present, which presentation each uses, and where they sit | `sign-3x4/short`, or talker preset G |

So switching G → H is **not** a reposition. The Name block changes *form* — different box
ratio, different type treatment, different reading direction — while binding to exactly the
same fields. A composer that treats layouts as "the same blocks in different places" will model
G, H and I wrongly.

Three consequences for the build:

1. **The block set is per-template, not global.** The talker has no Packshot block at all. The
   short case sign binds Description to `shortDescription`, the long one to `longDescription` —
   same block, different template. The palette must show the blocks *this* template supports,
   and grey out the rest with a reason.

2. **A block declares its available presentations.** In code that is an argument, not a new
   builder: `nameBlock(x, y, w, s, { as: "band" | "rail" | "stack" })`. Adding layout J later
   means adding a presentation, not forking the block. Keep the presentation list on the block
   so the sidebar can offer it as a dropdown (§5b) — that makes G/H/I hybrids possible without
   writing a fourth preset, which is what Rick asked for when he said keep all layouts.

3. **Switching layout must preserve content configuration.** This is the behaviour that makes
   the tool worth using: change the look, keep every decision about *what* is shown. Field
   bindings, show/hide, per-record overrides all survive a G → H switch; only presentation and
   position change. Warn on switch, but warn about *position loss*, not content loss — and
   offer to keep manual position tweaks where the block exists in both layouts.

The export must therefore carry the presentation choice alongside the origin, or a pasted
manifest reproduces the right content in the wrong form.

### This does not match the current builders — and that is the finding

`sign-templates.js` groups slots for *rendering* convenience, not editorially:

- `rail(x, y, w, s)` = milk + region + minAge → Rick's model splits this into **Origin** and
  **How to verify**
- `foot(x, y, w, s)` = DOP badge + mountain + tricolore + origin text + QR → splits into
  **DOP**, **QR**, and part of **Origin**
- `wordmark(w, s)` = brand name + line → becomes **Company ID**, and is where the MT logo lands

So the composer's vocabulary and the code's vocabulary currently disagree. **Decision needed —
recommendation first:**

> **Refactor `sign-templates.js` to semantic blocks.** Replace `rail()`/`foot()`/`wordmark()`
> with `originBlock()`, `verifyBlock()`, `dopBlock()`, `companyIdBlock()`, `qrBlock()`. The
> composer then edits the same nouns the code uses, the export is a direct mapping, and there
> is one vocabulary instead of two.
>
> **Blast radius: the 4 shipped templates** (`shortTemplate`/`longTemplate` × 3×4/4×5) and the
> 10 proofed case signs re-render. Positions should be preserved exactly — this is a regrouping,
> not a redesign — so diff a before/after render of all 10 and confirm pixel parity before
> accepting it.
>
> The alternative is a mapping layer in the composer only, leaving shipped code untouched.
> Safer today, but it means every future change is made twice and the export gets messy where
> a block spans two builders. Not recommended, but it is the lower-risk path if the 10 proofed
> signs are close to print.

**"Company ID" is new** and resolves an open question: it is where the MT logo goes (§6),
alongside the wordmark. That is a more natural home than either the foot row or the header cap,
because it groups every identity mark in one draggable unit.

**"DOP minimum-aging floor" is a new field**, not currently on the sign records. It is also
where handoff item 2 stops being academic: this block is designed to print the DOP floor
*next to* the actual age, so Asiago Vecchio would read "9 months" beside a stated 10-month
floor. **That contradiction becomes visible to a shopper.** Do not ship this block for Vecchio
until Stefano resolves it.

### Blocks still export as parametric expressions

The composer produces literal numbers; `sign-templates.js` stores expressions:

```js
const s = w / 300;                  // scale factor off the 3x4 base
...verifyBlock(pad, 202 * s, inner, s)
```

Two properties depend on this and must survive:

1. **One definition drives every size.** `shortTemplate(SIGN_SIZES[0])` and `[1]` produce the
   3×4 and 4×5 from the same code. Bake in literals and you hand-tune each size forever.
2. **Blocks are reused across templates.** A block appears in several. Flatten it and a change
   has to be made in four places.

So a dragged block origin of `(17, 236)` at base size exports as `(pad, 236 * s)`. Round to
whole units — sub-unit precision is noise at 1/100 inch. And when a dragged x lands within ±1
of `pad`, **export the identifier `pad`, not `17`**; same for a width at `inner`. That is the
difference between an export you paste and one you clean up by hand.

**Block internals are not draggable.** If an internal arrangement is wrong, that is a change to
the block builder in code, not a composer action. Resisting this is what keeps every sign in the
family looking related.

---

## 2. Save composition → copy across the series

Two things travel together, and they behave differently. Say so in the UI.

**Layout is inherently shared.** One manifest renders all four Asiagos; only the record data
differs. There is no per-cheese arrangement to copy — moving a block moves it for the series by
construction.

**Content configuration can differ per card.** The sidebar (§5b) lets a block be shown, hidden,
or bound differently per record — Fresco carries no mountain mark, Montagna does. *That* is what
"copy across the series" genuinely copies.

So **Save composition** does three things:

1. Locks the block arrangement as the template manifest.
2. Applies the current per-block content configuration to all four records, listing exactly what
   it will change before it does — never silently overwrite a per-card override.
3. **Validates across the series and refuses to export clean if any record overflows.**

That third item is the one with real value. Asiago Fresco's name is short; Asiago Stagionato
d'Allevo's is not. A verify-block position that looks right under Fresco can push Stagionato's
name into the flavor line, and you would not find out until the proofs came back.

**Build it as: edit one, see all four.** A live filmstrip of the other three rendering through
the same manifest as blocks move, overflow flagged in red. Export while a record overflows only
with an explicit warning block in the comment header.

Series for the first cut: `asiago-fresco-dop`, `asiago-fresco-montagna`, `asiago-stagionato-dop`,
`asiago-vecchio-dop`.

---

## 3. Canvas and coordinates

- **100 canvas units per inch.** 3×4" = 300×400, 4×5" = 400×500, talker 2.5×3.5" = 250×350.
- **Edit at base size, `s = 1`.** For the case-sign family that is the 3×4 (`w: 300`); for the
  talker family the 2.5×3.5 (`w: 250`). Never let the user drag on a scaled canvas — dragging
  at 4×5 and dividing back out introduces rounding drift.
- **Screen zoom is display-only** and must not touch exported values. Offer 100% / 150% / 200%.
- **Guides, always visible, never exported:** bleed at 12.5 units outside the trim, safe area
  at 12 units inside it. A slot crossing the safe line is a print defect — flag it, in red.
- `1 pt = 1.389 units` (`PT` in the source). Font sizes are typographic points; the editor
  reads and writes them as points, not units.

---

## 4. Slot roles — what may be dragged

`sign-templates.js` already tags every slot with a `role`. Honour it:

| `role` | Meaning | Editor treatment |
|---|---|---|
| `lock` | Brand-fixed furniture — accent bar, wordmark, "Minimum age" label | Draggable but **visually marked**, and a confirm on first move. These are the pieces that make every sign look like the same brand. |
| `var` | Bound to the sign record — name, flavor, description, QR | Freely draggable and resizable. The main target of this tool. |
| `brand` | Conditional trust marks — DOP badge, mountain mark | Draggable within the foot group only. Respect `showIf`: render the badge ghosted when the current record doesn't carry it. |

The `ground` shape (full-bleed background) is not draggable. Exclude it from hit-testing
entirely or every empty-space click selects it.

---

## 5. Behaviours

**Drag and resize.** Pointer events, not HTML5 drag-and-drop — the native API is awkward for
canvas work and has poor touch behaviour. Eight resize handles, corners preserve nothing (slot
boxes are not aspect-locked; `fit: "contain"` on images handles that at render time).

**Snapping**, with a hold-to-disable modifier:
- to `pad` / `inner` edges (the most common intent by far)
- to sibling slot edges and centrelines
- to the safe-area rectangle
- to a 5-unit grid as a fallback

**Nudge** with arrow keys, 1 unit, 10 with Shift. Faster than the mouse for final polish and
the reason people trust a tool like this.

**Overflow detection** — the whole point of the series filmstrip. The renderer already carries
the contract: `fit: "shrink"`, `clamp: n`, `maxChars: n`. The editor must honour all three and
mark a slot when its bound content exceeds the box at the specified size. `maxChars` is a
character-count guard, `clamp` a line count — they are different checks, do both.

**Z-order** is in the grammar (`z`). Expose it, but as a simple send-forward / send-back on the
selected slot rather than a layers panel. There are rarely more than three overlapping.

**Undo/redo**, at least 20 deep. Non-negotiable in a direct-manipulation tool.

**Layout presets.** G (green cap), H (left rail), I (badge-forward) load as starting points —
and per §1 they are *presentation sets*, not just arrangements. Switching mid-edit re-presents
every block: content configuration survives, position does not. Warn about the position loss
specifically, and offer to keep manual tweaks for blocks that exist in both layouts.

Because presentation is per-block (§1), a **hybrid is a first-class result, not a special
case** — G's cap with H's rail treatment on Origin is just two dropdown choices. That is what
"keep all layouts" buys: the three presets stop being a choice of three and become a starting
vocabulary.

---

## 5b. The inspector sidebar — content per block

Rick: *"there can be a sidebar with drop downs per block/field to fill the content."*

Layout is on the canvas; **content is in the sidebar.** Select a block, the sidebar shows that
block's fields. Nothing on a sign face is ever free-typed into the canvas — that is the
Studio Director contract from `CHEESE_SIGNS_SPEC.md` and it holds here.

**Every field control is a dropdown over the record, not a text input.** The options are the
binding paths that exist on the sign record, so a field can only ever show something the data
actually contains. This is the guardrail that keeps the four cards consistent and keeps typos
off a printed piece.

Per block, the sidebar carries:

| Control | Behaviour |
|---|---|
| **Show / hide** | Drop the block from this template. Respects `showIf` — a `showIf`-gated block shows a third state, "auto (per record)", which is the default and the correct choice for DOP and mountain marks. |
| **Field dropdowns** | One per field in the block. Options are valid binding paths from the record — e.g. Origin's label offers `region.label`, `region.sub`, `origin`. Selecting rebinds the field. |
| **Live value preview** | Beside each dropdown, the value for the currently selected record, so the effect of a rebind is immediate. |
| **Per-record override** | Marks this configuration as specific to the selected cheese rather than the series. Used sparingly; flagged visibly, and listed by name when Save copies across the series (§2). |
| **Presentation** | Which form this block takes in the current layout — band / rail / stack / inline, from the list the block declares (§1). Changing it re-renders the block in place and is how G/H/I hybrids get made. |
| **Asset picker** | For image fields — opens the library (§6b). Defaults to **bind to record** where a binding exists (`region.icon`), with a specific asset as the deliberate exception. |
| **Size / weight** | Font size in points and weight, from the Brand Kit's allowed set only. Not a free numeric field — a type scale, or the family stops looking like a family. |

Two behaviours that matter more than they look:

- **An empty binding must be visible, not blank.** `milk.treatment` is empty on all four Asiagos
  right now. A field bound to it should render a labelled placeholder in the editor and simply
  not print — never silently collapse, or Rick will lay out a composition around a field that
  vanishes at proof time.
- **Show the binding path on hover.** When a card looks wrong, the first question is always
  "what is that field actually bound to." Answer it without a round trip to the JSON.

---

## 6. The logo slot (new)

Not present anywhere in the sign family today — `grep -n logo src/lib/sign-templates.js`
returns nothing, so none of the 10 proofed case signs carry one either. Adding it is a
family-wide change, not a talker detail.

```js
{ id: "brand_logo", role: "brand", kind: "image", fit: "contain",
  x: ..., y: ..., w: 34 * s, h: 34 * s, z: 6,
  asset: "$brand:primary", label: "Monti Trentini mark" }
```

Resolve `$brand:primary` through `brandAssetUrl(resolved, ref, preset)` — the Cloudinary path,
per §6b-D — against `identity.logo.primary` = `monti-trentini/library/tswf07fmciwdpp13facm`
(PNG, oval, "MT Official oval logo_trim"). `brand/monti-logo-transparent.png` (2363×2363,
transparent) is the on-disk fallback for offline editing only, never the shipped source.

Do **not** wire `$brand:wordmark`, `$brand:favicon` or `$brand:seal` — verified empty in the
Cloudinary account on 2026-08-13 and again 2026-08-25. They resolve to nothing by design.
The two SVGs under `monti_asiago_campaign/brand_svgs_raw/` are Casa Finco heritage marks, not
the MT logo — do not substitute them.

Placement is Rick's open decision (foot row beside the badges, or header cap). Ship the slot
draggable and let him settle it in the tool — that is precisely what this tool is for.

---

## 6b. Sign asset library — maps, icons, accent mini-graphics

A browsable palette panel in the composer: pick an asset, drag it onto the canvas, it becomes
an `image` slot. Three categories, and they have **genuinely different rules** — do not
collapse them into one flat grid.

### The hard rule for all three

Dropping an asset creates a slot with a **token reference**, never a raw path or data URI:

```js
{ id: "region_icon", kind: "image", asset: "$icon:valsugana", ... }
```

The `$icon:` indirection is what lets an icon recolour with the Brand Kit and be swapped in one
place. An export containing an inlined `<svg>` or a file path is a bug — it severs the asset
from the brand system. This is the single most important constraint in this section.

### A. Icons — exists, reuse it

`src/lib/sign-icons.js` (JS, 5.2 KB) with `design/cheese-signs/icons.py` as its Python twin —
the header comment says they are kept identical on purpose so the print proof and the app never
diverge. **The composer must read the JS module, not re-draw anything.**

| Key | Frame | Notes |
|---|---|---|
| `cow` | 120×82 | Milk icon |
| `region:valsugana` | 120×82 | Dolomite peaks, valley floor, river |
| `region:altopiano-asiago` | 120×82 | Tabletop plateau, pasture fence |
| `region:trentino-veneto` | 120×82 | PDO milkshed |
| `dop` | 100×100 | Badge, gated by `showIf: "designation"` |
| `mountain` | 100×100 | Product of the Mountain, `showIf: "mountainMark"` |
| `italy` | 60×100 | Country silhouette |

Two frames, deliberately: 120×82 for rail illustrations, 100×100 for badges. **Preserve them.**
The rail reads as one family precisely because every illustration shares a frame and a 2.6
stroke weight. A new icon at a different weight will look wrong next to the others and it will
not be obvious why.

Colour comes from `paintIcon(svg, { primary, accent, ink, paper })` — token substitution, not
baked fills. The palette must render swatches through the live Brand Kit so what Rick sees is
what prints.

**Minimum legible size: 0.4 inch** (40 canvas units), stated in the icons.py header as the size
they were drawn to read at. Warn below it. This is a print piece; there is no zooming in.

Region icons are bound, not placed: `bindsAsset: "region.icon"` pulls the key from the record,
so the same slot shows a different illustration per cheese. The palette should make this
obvious — dropping a *specific* region icon hard-codes it and breaks the series. Offer
"bind to record" as the default and a specific icon as the deliberate exception.

### B. Maps — exists, and has a provenance rule

`design/asiago-shelf-talkers/build-dop-zone-map.py` generates SVG paths from **official ISTAT
province boundaries** (openpolis/geojson-italy), simplified with Ramer–Douglas–Peucker at
**three tolerances: slide, card mini-map, country inset.** Method documented in
`.claude/skills/accurate-maps/SKILL.md`.

**Never generate a map with an image model, and never trace one by hand.** A generative map is
wrong in the detail, and a wrong border is fatal on a piece whose entire argument is the legal
certification of origin. This rule already governed the provenance cards; it governs the
library too.

Two things the palette must get right:

- **Serve the correct tolerance for the slot size.** Scaling a slide-tolerance path down to a
  0.6" card mini-map wastes path data and renders muddy; scaling a card path up to a slide
  shows the simplification as visible faceting. Pick by target size, automatically, and say
  which one was chosen.
- **Zone boundaries carry a caveat.** The Asiago DOP zone is defined at *comune* level, but the
  current build works from *province* boundaries — which is why Padova and Treviso render
  hatched rather than solid. Surface that in the palette as a note on the asset, so nobody
  ships it believing the outline is exact. Resolving it needs the disciplinare's comune list
  (handoff item, not a composer item).

### C. Accent mini-graphics — new, nothing exists yet

This is the one Rick is actually asking to create. Today the only decorative element in the
grammar is `tricolore`, and it is a `shape` with `fill: "$tricolore"`, not an asset.

Proposed starting set — small, structural, brand-derived, **not decorative clip art**:

| Asset | Use |
|---|---|
| `accent:rule-thin` / `accent:rule-thick` | Section dividers at brand weight |
| `accent:tricolore-bar` | The existing tricolore, promoted to a reusable asset |
| `accent:corner-mark` | Corner tick to anchor a composition |
| `accent:wheel-silhouette` | Wheel/wedge outline as a watermark or scale cue |
| `accent:leaf` / `accent:alpine-sprig` | Mountain-provenance flourish, matched to the icon stroke weight |
| `accent:quote-mark` | For the `recognitionCue` line if it is set as a quote |

**A warning worth heeding.** A library of decorative bits is where brand discipline erodes
fastest, and a 2.5×3.5" talker has less room for ornament than anything else in the family. The
existing signs read as a system because they are almost entirely type, rule, icon and badge —
nothing else. Keep this set small, make every entry structural rather than ornamental, and hold
the same 2.6 stroke weight as the icon family so accents and icons never look like they came
from different places.

Suggest capping the initial set at six and requiring a reason to add a seventh.

### D. Delivery — Cloudinary, through the existing resolver

Every image on a sign comes from **Cloudinary**, resolved through `src/lib/images.js` →
`cldImage()` in `src/lib/cloudinary.js`. Per `CLAUDE.md`: *Cloudinary is the database, the Media
Hub is the front door.* The composer does not get its own image path.

The resolver already takes a **preset** — `brandAssetUrl(resolved, ref, preset = "card")`,
`codeImageUrl(resolved, config, code, preset = "card")`. Use it; do not hand-build URLs.

**The preset distinction is the thing to get right, and it is not cosmetic:**

| Context | Preset | Why |
|---|---|---|
| Editor preview, palette swatches, series filmstrip | small / `card` | Four records rendering live as blocks move. Optimised derivatives keep it responsive. |
| Print export | **print-grade, explicit** | `f_auto` / `q_auto` are *wrong here*. Lossy re-compression and web formats are fine on screen and visible on a printed card. Request explicit format and quality. |

Size the derivative to the slot, not the original. The talker packshot is 0.96 in tall — at
300 DPI that is ~288 px, at 600 DPI ~576 px. Delivering the 2000 px master into a one-inch box
wastes bandwidth in the editor and gains nothing in print. Ask Cloudinary for the size the slot
needs; that is what the transformation layer is for.

Two practical notes:

- **Cloudinary URLs load fine from `file://`.** An `<img src="https://res.cloudinary.com/…">`
  is not subject to CORS for display. This is why §8's inlining rule applies to *JSON* only —
  do **not** base64 the logo or packshots into the HTML. They come down over https like
  everything else, and inlining them would fork them from the Media Hub, which is exactly the
  duplication `CLAUDE.md` exists to prevent.
- **Offline is a degraded mode, not the target.** If the composer is opened without a network,
  images fail; render a labelled placeholder box at the correct slot dimensions so composition
  work can still continue. `brand/monti-logo-transparent.png` on disk is a reasonable local
  fallback for the logo specifically, since it is already in the repo.

### Palette behaviour

- Three tabs — **Icons · Maps · Accents** — search across all.
- Swatches painted through the live Brand Kit, not static previews.
- Drag onto canvas creates an `image` slot at the asset's natural frame ratio, `fit: "contain"`.
- Show the token (`$icon:cow`) on hover, so it is obvious what lands in the export.
- Flag on drop: below minimum legible size, crossing the safe area, or hard-coding a region
  icon that should be bound.
- `file://` note (§8 applies): the composer cannot fetch `sign-icons.js` as a module from disk
  in every browser. Inline the icon set into the HTML at build time, with the same
  "snapshot: YYYY-MM-DD" discipline as the record data, and a comment pointing at
  `src/lib/sign-icons.js` as the source of truth.

---

## 7. Export

Two buttons, because they serve different consumers:

**Copy JS snippet** — the primary path. Emits the slot array in the source file's own idiom:
`N * s` expressions, `pad`/`inner` identifiers, builder calls preserved, same key order and
formatting as the existing templates. Rick or Claude Code pastes it into `sign-templates.js`.
Include a comment header: the layout preset it came from, canvas size, timestamp, and any
series overflow warnings that were live at export.

**Download JSON** — flat manifest with literals resolved. For diffing, archiving, and a future
data-backed store. Not for pasting into the source file.

Structure the internal model so a data-backed store (`signs-layouts.json` or Blobs) can be
added later without rework — but do not build it now. Templates stay code-versioned.

---

## 8. The file-protocol gotcha

The editor opens from disk (`file://`), so **`fetch('../src/data/montitrentini/signs.json')`
will fail on CORS.** Do not spend an hour on this at build time.

Inline a snapshot of the four Asiago records into the HTML as a `const`, with a comment
recording the date and the source path, and a visible "data snapshot: YYYY-MM-DD" line in the
UI footer so it can never silently drift. Add a paste-JSON box so fresher records can be
dropped in without a rebuild.

**Images are not affected and must not be inlined.** Cloudinary URLs load fine from `file://` —
CORS does not gate `<img>` display. Do not base64 the logo or packshots into the HTML; that
would fork them from the Media Hub. See §6b-D.

So the rule is narrow: **inline the JSON, fetch the images.**

---

## 9. Non-goals

- **No new slot kinds.** `text`, `image`, `shape`, `qr`, `showIf` cover everything. If the
  editor seems to need a new kind, that is a signal the design changed, not the tool.
- **No renderer changes.** The editor draws its own preview; the print path is untouched.
- **Does not write `signs.json`.** Reads records, never edits copy. `recognitionCue` is added
  by hand as a data change (handoff open item 3).
- **Not the in-app editor.** Standalone tool for settling layouts. Port later, if ever.
- **No auth, no persistence, no server.** One file, opened from disk.

---

## 10. Build order

0. **Settle the block-vs-builder fork in §1 first.** Everything downstream assumes an answer.
   Recommendation: refactor to semantic blocks, with a before/after render diff of all 10
   proofed case signs to prove pixel parity.
1. Static render of one template manifest to a positioned preview, blocks outlined and named.
   Prove the grammar reads correctly before anything is draggable.
2. Block selection and drag, with snapping and the safe-area guide. Internals stay locked.
3. Resize where a block supports it, arrow-key nudge, undo/redo.
4. Inspector sidebar (§5b): show/hide and field dropdowns over record bindings.
5. The series filmstrip and overflow detection (§2). **This is the feature that makes the tool
   worth building** — not the dragging.
6. Asset library (§6b): Icons tab first — it reuses `sign-icons.js` and needs no new artwork.
   Maps second. Accents last, since that set has to be drawn before it can be shipped.
7. Export: JS snippet first, JSON second.
8. Load G / H / I as presets. Add the Company ID block, carrying the logo, to all three.

Steps 1–2 are a usable tool. Step 5 is the one with real value. Step 6C is the only step
needing new design work rather than wiring.

---

## 11. Open items this does not resolve

Carried from `HANDOFF_2026-08-25_asiago-shelf-talkers.md` — the composer helps decide 4 and 5,
and cannot touch 1, 2 or 3.

| # | Item | Owner |
|---|---|---|
| 1 | Pasteurized vs raw milk unknown on all 4 Asiagos — `milk.treatment` empty | Stefano |
| 2 | Vecchio ships at 9 months; consortium defines Vecchio as over 10 | Stefano |
| 3 | `recognitionCue` not yet a field on the 4 Asiago records; comp copy is placeholder | Rick |
| 4 | Layout choice G / H / I / hybrid — **the composer exists to settle this** | Rick |
| 5 | Logo placement, foot row vs header cap — **likewise** | Rick |
| 6 | Request the real vector logo from Monti Trentini Marketing. Not blocking. | Rick |
