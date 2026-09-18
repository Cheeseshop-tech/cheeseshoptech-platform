# Product ID & Image Truth — 2026-09-18

**Status:** ✅ Root cause found and fixed, verified via `audit:catalog`. Written after Rick reported
two tangled problems in the same session: (1) new Cut & Wrap items going into the assortment
without item numbers yet, and (2) spec-sheet images showing up as product images in the Price
List. This doc is the "read first" reference for both — product ID truth, and how an image gets
matched to a SKU — so the next person (human or agent) touching either doesn't have to re-derive
it.

## Part 1 — the bug: spec sheets rendering as product photos

### Root cause

`imageForCode(resolved, code)` in `src/lib/images.js` is the single function Pricing, Proposals,
Quote Builder and the Price List Creator all call to resolve "the photo for this SKU." Until
today it did:

```js
return m?.images.find((i) => i.code === code || i.sku === code) || null;
```

No filter on `kind`. That was safe as long as spec-sheet PDFs were stored as Cloudinary `raw`
resources — invisible to the image manifest entirely. But the 2026-09-17 fix that made spec
sheets *viewable* (commit `0c82a88`, "Migrate spec sheets to image-type storage so they render")
moved them onto `resource_type: image` so Cloudinary could rasterize a page-1 thumbnail. That put
each spec sheet's manifest record in the exact same `images[]` array as real photos, tagged with
the same `code` — and for **12 SKUs**, the spec-sheet record sits *earlier* in that array than the
real photo. `imageForCode()`'s unfiltered `.find()` returns the first match, so those 12 SKUs
resolved to their spec sheet's page-1 raster everywhere this function is used — including the
Price List / Pricing tool, which is exactly what Rick saw.

The manifest's own `kind` field (`"document"` vs `"image"`) was already correct — `media-list.js`
and `sync-images.mjs` derive it from the Cloudinary resource type + a PDF check, not from a tag,
specifically so a re-uploaded/migrated asset can't drift. The bug was that only
`buyer-catalog.jsx` was checking it. Every other consumer ignored it.

**Affected SKUs (confirmed via manifest inspection, all now correctly resolve to their real photo
after the fix):** `01174, 02091, 03044, 03073, 04182, 20424, 20480, 20481, 30014, 30015, 30016,
30017`.

### What was fixed (2026-09-18)

1. **`src/lib/images.js` — `imageForCode()`.** Now excludes `kind === "document"`. This is the one
   choke point, so fixing it here fixed Pricing, Proposals, Quote Builder and the Price List in a
   single change — no component-level patching needed. A SKU with only a spec sheet on file (no
   real photo yet) now correctly resolves to *no image*, not the spec sheet.
2. **`src/lib/media.js` — new `isDocumentAsset()` / `photoAssets()` helpers.** A shared,
   single-source filter for "is this a document, not a photo" — so future pickers/lists don't
   reinvent (or forget) the check `buyer-catalog.jsx` already had.
3. **`src/components/media/media-picker.jsx`** (the Content Studio / proposal image picker) — now
   filters incoming assets through `photoAssets()`. This was a second real gap: nothing stopped a
   spec-sheet PDF thumbnail from being picked as a slide or proposal image before today.
4. **`scripts/audit-catalog-integrity.mjs`** — `imagesByCode` no longer counts a document as proof
   a SKU "has a photo." A new bucket, `docsByCode`, tracks spec sheets separately, and a SKU whose
   *only* linked asset is a document now gets its own HIGH finding ("has a spec sheet/document on
   file but no real photo") instead of silently passing the "no photo linked" check the way all 12
   affected SKUs did before today. Run `npm run audit:catalog --offline` (or with
   `PORTAL_PASSCODE=<passcode>` for the live items store) any time after a media/catalog change to
   catch a repeat of this class of bug structurally.

Verified 2026-09-18: re-ran `audit:catalog --offline` after the fix — none of the 12 affected SKUs
appear in the "no photo" list (each resolves to its real photo now), and the script runs clean
(no crash, no regression in the pre-existing findings).

### What was deliberately NOT touched

Nothing in Cloudinary changed. The manifest's `kind` field was already correct; this was purely a
consuming-code bug. No re-tagging, re-upload, or `sync-images.mjs` run was needed.

## Part 2 — product ID truth: where an item number lives, and what "real" means

Per the existing architecture (`docs/DATA_OWNERSHIP_MAP.md`, `[[platform-vs-client-canonical]]`),
one fact, one authoring home, everything else joins by SKU:

| Fact | Authoring home today | Notes |
|---|---|---|
| **Active item number / is this a real SKU** | **`catalog.json`** (Price List / pricing sheet) | Per `[[cst-price-list-authoritative-for-names]]`: this is the *today* rule (not permanent architecture) — `catalog.json`'s active SKU list is more reliable than `items-seed.json`, which still carries ~26 stale/legacy codes. Treat a code as a real, live item **only if it's in `catalog.json`.** |
| Item identity + copy (pack, weight, UPC, milk type, min age, descriptions, cert) | Media Hub `items.js` / `items.json` | No pricing. |
| Pricing | Custom Price List Creator (`catalog.json`) | Never enters Media Hub. |
| Photo / spec-sheet asset | Cloudinary, joined by the `code` (a.k.a. `sku`) **context field** on the asset | This is the join key across all four surfaces — see Part 1. |

### The rule for a new Cut & Wrap item that doesn't have a number yet

This situation already has a working, established pattern — it just needed to be written down in
one place. **Per house rule, item identity is never guessed** (`docs/CUT_AND_WRAP_ITEM_GAP_2026-07-09.md`
§3: numbering conflicts and gaps stay blocked until Inventory Manager answers, not resolved by
inference).

Until Inventory Manager assigns a real item number:

1. **Do not tag the asset (photo or spec sheet) with a `code`/`sku` context value at all** — not
   even a placeholder like `tbd`. A placeholder SKU that makes it into `items.js` is exactly the
   class of bug `audit-catalog-integrity.mjs` already watches for (`PLACEHOLDER_SKU` regex —
   `tbd`, `todo`, `pending`, `n/a`, etc.) and currently has one live hit: **Aged Black Truffle 7 Oz
   EW**, still carrying `"tbd"` in `catalog.json`, open since before today.
2. **Tag it `draft` + `new-sku-pending`** instead (the existing convention, already used for
   `01114` / `20482` / `01286` — see `docs/HANDOFF_2026-09-17_media-roles-and-spec-sheets.md`).
   That keeps the asset visible and findable in Media Hub without it being live/gated anywhere
   buyer-facing.
3. **Once Inventory Manager assigns the real number:** add the row to `catalog.json` (pricing,
   even if `priceOnRequest: true` / `cost.fob: null` for now — see the "known hazard" note in
   `docs/CUT_AND_WRAP_ITEM_GAP_2026-07-09.md` §3c about `quoteLineTotal` silently returning `$0`
   for an unpriced SKU if it's quoted before pricing lands), add the identity/copy row in Media
   Hub → Items, then re-tag the asset with the real code and flip it to `product-catalog` +
   an approval tag via Media Hub's own write path (never a direct Cloudinary call — see
   `[[media-asset-edits-via-hub-rule]]`).

### Currently open (not fixed today, listed so it isn't re-discovered from scratch)

- **`tbd` placeholder SKU** — "Aged Black Truffle 7 Oz EW" in `catalog.json`. Blocked on a real
  item number from Inventory Manager (also carries a UPC collision with `03047`/Asiago Vecchio —
  see `docs/CUT_AND_WRAP_ITEM_GAP_2026-07-09.md` §3 item 1).
- **69 items in `items.js` with no photo linked at all** (pre-existing, structural, unrelated to
  today's fix — full list in the latest `docs/CATALOG_INTEGRITY_AUDIT_<date>.md`). This is photo
  *coverage*, not mis-wiring; each of those correctly resolves to no image today, not a wrong one.
- **`audit:catalog` is not wired into CI** — still a manual `npm run audit:catalog` run. Worth
  revisiting once the app is past the current hardening phase (see `[[cst-hardening-plan]]`).

## The standing rule, going forward

- **`imageForCode()` / `codeImageUrl()` (`src/lib/images.js`) is the only place that resolves "the
  product photo for this code."** Don't hand-roll a manifest `.find()` anywhere else — that
  duplication is exactly how this bug happened (one component, `buyer-catalog.jsx`, got the
  document filter; every other consumer didn't, because they never shared the logic).
- **`kind` (`"image"` vs `"document"`) is derived from Cloudinary's own resource type + a PDF
  check — never from a tag.** A tag says *purpose* (hero, social, spec-sheet); `kind` says *what
  the file physically is*. Don't add `kind`-equivalent logic anywhere based on tags.
- **Any list or picker that means "photos only" filters through `photoAssets()` /
  `isDocumentAsset()` (`src/lib/media.js`)**, not a local re-derivation.
- **Run `npm run audit:catalog --offline` after any media/catalog change** — it now structurally
  catches "a SKU's only linked asset is a document," the exact shape of today's bug, plus the
  existing placeholder-SKU and missing-photo checks.
