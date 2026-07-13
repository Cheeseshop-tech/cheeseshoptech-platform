# Handoff — Line-Card Template + Product Catalog UI (2026-07-09)

For: the next session, run inside the CST Agency Build repo · Owner: Rick Posada
Read first: `docs/TEMPLATE_ENGINE_SPEC.md` §10 (tokenized manifest engine), then this.
State: **nothing shipped in this repo yet.** Design proven out-of-band as PDF/PNG; port is the work.

---

## Where this came from

The `product-line-card/v1` layout was designed and proven outside the app, as a print
deliverable (Monti Trentini four-item line card, Letter portrait). Rick approved the format
and wants two things:

1. Save it as a **first-class template** in the Content Studio template library.
2. Reuse the row as the **UI layout of the Product Catalog** — so the catalog page and the
   exported line card are the same layout at two sizes.

Reference renders (source of truth for the visual target) live in the design project folder,
not this repo:

- `MontiTrentini_FourCheeses_LineCard.pdf` — the approved four-item card
- `MontiTrentini_FourCheeses_LineCard_email.png` — 1200px raster, email body
- `MT_SalesSheet_Template/render_linecard.py` + `linecard.json` — the reportlab reference
  renderer and its content shape. **This is the spec, not code to port** — the app renders
  HTML through `SlideRenderer`, not reportlab.

---

## The layout, in manifest terms

A line card = header lockup + N repeated **product rows** + footer bar. One row:

| Zone | Content | Binds to |
|---|---|---|
| Image frame (square, left) | product packshot, white-trimmed | Media Hub image slot, `tag: "product"` |
| Title | product name | `catalog.json` → `products[].name` |
| Subtitle (tracked caps) | `ITEM 03023 · WHOLE WHEEL 17–19 LB · AGED 5 MONTHS` | `skus[].code` + `skus[].packing` + `marketing.age` |
| Blurb (serif italic, ≤4 lines, auto-fit) | 40–45 words | `items.js` short description |
| Spec bar (dark green, full row width) | 4 tracked-caps cells | `skus[].code`, pack, aging, certification |
| Cert emblem (right, on title line) | DOP/PDO seal — **only when earned** | `marketing.badge` |

Design decisions already made and validated — carry them forward:

- **Certification is conditional, never decorative.** Caciotta rows carry no PDO mark and no
  consortium copy anywhere on the sheet. A `badge` of `null` must render nothing, not a
  placeholder. (The print sheets substitute a "Casa Finco — the farmhouse line" band for the
  consortium band on non-DOP items.)
- **Packshots are auto-trimmed.** Source photos have heavy white padding; the wheel floats
  small inside its frame unless the whitespace is cropped first. In print this was a PIL
  bbox-trim pass. In-app the equivalent is a Cloudinary transform — `e_trim` then `c_pad` to
  square — applied at the `cldUrl` preset level, **not** per-component.
- **The emblem sits on the title line, right-aligned.** First attempt overlapped it on the
  packshot's lower-left; it collided with the wheel and read as damage.
- Row height 143pt on a 612×792 canvas; hairline divider `#D8D2C4` between rows, not after
  the last.

---

## Blockers found in the code (fix these first)

These are the reason this is a handoff and not a patch. Each was verified by reading the
current source on `d240626`.

### 1. `SlideRenderer` is hard-wired to 16:9

`src/components/presentations/slide-renderer.jsx:17` sets `className="relative aspect-video …"`.
Every template in `SLIDE_TEMPLATES` is `canvas: { w: 960, h: 540 }`, so nothing has exercised
the other path. A Letter-portrait line card (612×792) will render squashed.

**Fix:** drive the aspect ratio from the manifest, not a Tailwind class.

```jsx
// slide-renderer.jsx — SlideRenderer()
const tpl = typeof slide === "string" ? null : getSlideTemplate(slide.t);
const cw = tpl?.canvas?.w || 960, ch = tpl?.canvas?.h || 540;
<div
  className={"relative w-full overflow-hidden " + className}
  style={{ containerType: "inline-size", aspectRatio: `${cw} / ${ch}`, background: tk.colors.cream }}
>
```

Audit the two other `aspect-video` sites once this lands — they are thumbnail chrome, not the
renderer, and are probably fine to leave 16:9 for deck thumbs:
`slide-studio.jsx:238`, `presentations-page.jsx:157`.

### 2. `pick` and `fills` are declared but never consumed

`product-range/v1` already declares `pick: 0|1|2` and `fills: "name1"` on its image slots — the
mechanism for "bind this slot to catalog position N and auto-fill the linked text slot from its
metadata." **Grep finds no consumer anywhere in `src/`.** It was specced in
`TEMPLATE_ENGINE_SPEC.md` and never wired.

This is the single highest-leverage piece of this build: the line card is four rows of
`pick: 0..3`, and without it every row is hand-filled in the slot panel. Wire it once and both
`product-range/v1` and `product-line-card/v1` come alive.

**Where:** the composer (`slide-studio.jsx`), at the moment a template is added — resolve the
tenant catalog, map `pick: n` → `catalog.products[n]`, and pre-fill the image slot's public_id
plus every slot named by a `fills:` reference. Keep it a *seed*, not a binding — the user must
still be able to override any slot.

### 3. The "Product Catalog" page is a media browser, not a product catalog

`src/components/catalog/buyer-catalog.jsx` renders a square-tile grid over `lib/catalog.js`,
which per its own header comment is "a VIEW over the ONE canonical manifest (`lib/images.js`)" —
i.e. **images**, keyed by `publicId`, with `title`/`category`/`bytes`. It does not know a
product from a SKU. The h1 says "Product Catalog"; the data says image library.

The actual product record lives in two other places:

- `src/data/<tenant>/catalog.json` → `products[]` with `name`, `category`, `marketing.{blurb,badge,age,milk}`, `skus[].{code,packing,pack,availability}`
- `src/lib/items.js` → the per-tenant copy record: item number, pack size, weight, UPC, **short description, long description, certification**. Rick's header note (2026-07-03) already declares this the source: *"Slides, blogs, emails, and social posts pull descriptions from here."*

**Decide before building** (this is a naming/IA call, not a code call): does the line-card row
layout become a third view mode on `buyer-catalog.jsx` (`grid | list | card`), or does a new
product-catalog page get built over `catalog.json` + `items.js` and the image browser get
renamed to what it is (Media Library)? The second is more honest and matches the data. The
first is cheaper.

Note the naming hazard already flagged in `CST_POSITIONING_BRIEF.md`: two components render an
h1 "Content Studio". Don't add a third ambiguous name here.

---

## Build slices (suggested order)

**Slice 1 — portrait canvas.** Fix `SlideRenderer` aspect ratio (blocker 1). Add a throwaway
612×792 manifest with one shape slot; confirm it renders portrait in the composer preview and
the DeckViewer. Ship this alone — it unblocks every non-16:9 template forever.

**Slice 2 — `product-line-card/v1` manifest.** New entry in `src/lib/slide-templates.js`.
Canvas `{ w: 612, h: 792 }`. Slots: `ACCENT_BAR`, logo TL, sheet title/subtitle, then four row
groups `row{n}_image | row{n}_title | row{n}_subtitle | row{n}_blurb | row{n}_specbar |
row{n}_seal`, then footer shape + three footer text slots. Row 1 top edge y=158, pitch 143.
Paint with existing tokens only — `$accent` `#00963F`, `$primary` `#064E22`, `$cream`, `$display`,
`$ui`. Add a `sample` block using the four approved SKUs (03023, 02206, 20228, 20141) so the
template previews correctly before any data is bound.

Seal slot must be `role: "brand"` with `asset: "$seal"` and honor the per-slide `__off` map that
`SlideInner` already reads — that gives you conditional certification for free (turn it off on
the caciotta rows) without new renderer code.

**Slice 3 — wire `pick` / `fills`** (blocker 2). Then `product-range/v1` and the line card both
seed themselves from the tenant catalog.

**Slice 4 — Cloudinary trim preset.** Add a `packshot` preset in `src/lib/cloudinary.js`:
`e_trim` → `c_pad,ar_1:1,b_white` → `w_600`. Point every `tag: "product"` image slot at it.
Verify against the four reference wheels — `e_trim` is threshold-sensitive on the caciotta
rind, which is nearly white at the edge.

**Slice 5 — catalog UI.** Only after the IA decision above.

---

## Verify

```bash
npm run dev          # Monti tenant → Content Studio → add slide → "Product Line Card"
                     # expect: portrait preview, 4 rows, DOP seal on rows 1–2 only
npx vite build --outDir /tmp/cst_check --emptyOutDir --logLevel warn
```

Visual check against `MontiTrentini_FourCheeses_LineCard.pdf` — the app render should be the
same layout, painted from the Brand Kit rather than hard-coded hexes. Any place the app render
needs a literal hex to match the PDF is a token that's missing from `brand-tokens.js`; add it
there rather than in the manifest.

---

## Watch-outs

- **Export reality.** `TEMPLATE_ENGINE_SPEC.md` §10 says HTML render is source, PPTX/PDF/PNG
  are derived. A print line card needs 300dpi and CMYK-safe blacks; the browser render is 96dpi
  sRGB. The email PNG (1200px) derives fine. A true print PDF does not — keep the reportlab
  renderer as the print path until an export story exists, and don't promise print output from
  the app.
- **Fonts.** Brand fonts Cora + Futura PT are Adobe Fonts/Typekit — they resolve in the app
  (licensed web project) but not in any headless renderer. The print path substitutes Gelasio
  (metric-compatible with Georgia) and Jost. Two renderers, two font stacks, same design. Don't
  "fix" the substitution.
- **SKU facts are load-bearing and have been wrong before.** The bundled template copy for
  02206 previously carried the wrong weight *and* the wrong item number. Verify item number,
  weight, and aging against the Cloudinary filename/label or the availability sheet — never
  against placeholder copy. Confirmed as of 2026-07-09: 20228 & 20141 are 3 kg / 6.6 lb;
  02206 is 28–30 lb; 03023 is 17–19 lb.
- **There is no item 02023.** It surfaced as a request and is a transposition of 03023. If it
  appears in a spec or a signal, it's a typo.
- Uncommitted on disk at handoff time: `src/data/montitrentini/inventory.json` (M),
  `source/availability_2026-07-09.csv` (A), `src/archive/backup_2026-07-09_inventory_autosync/` (??).
  That's the inventory auto-sync, unrelated to this work — commit or stash before starting.
