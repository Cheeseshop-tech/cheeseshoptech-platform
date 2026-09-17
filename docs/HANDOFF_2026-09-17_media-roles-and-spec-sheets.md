# Handoff — Photo roles, ordering & spec sheets on the Buyer Catalog

**Written:** 2026-09-17 · **Status:** 📋 SPEC — not built yet. Written after Rick asked (mid photo-cleanup
session): *"I want to add alternate photo options so a single item can have multiple photos or files.
This way we can add more info to the catalog like visual map references and beauty shots and social
shots. Behind the Main catalog folder so you can conveniently access all info like spec sheets."*

## The good news: multi-photo already works today

Before building anything new, it's worth being precise about what's already true, because it's more
than expected:

- `buyer-catalog.jsx` groups every Cloudinary asset that shares an item's `code`/`sku` context field
  into one array (`imagesByCode`, `src/components/catalog/buyer-catalog.jsx:58-62`).
- The grid card, list row, and lightbox all already handle `imgs.length > 1`: the card shows `imgs[0]`
  plus an "N photos" caption, and the lightbox renders a clickable thumbnail strip under the hero image
  that flips `heroIdx` through every photo on the item (`buyer-catalog.jsx:283-303`).
- So **the day-to-day version of "give an item multiple photos" needs zero code changes** — it's just
  "upload another Cloudinary asset with the same `code=<sku>` context value, tag it `product-catalog`
  + an approval tag, re-run `sync-images.mjs`." That's what this session did tonight for item `01174`
  (kept the existing wedge/log shot as-is and added a second, retail-packaged shot alongside it — see
  `PUSH IMAGE MANIFEST UPDATE.command`).

What's genuinely missing is three things, in order of how much they'd change:

## Gap 1 — no explicit "which photo is the hero" ordering

`imagesByCode` pushes assets in whatever order the manifest array has them (Cloudinary Admin API
listing order — effectively upload/creation order, not curated). `imgs[0]` is always treated as the
card thumbnail and the lightbox's default hero. Today that's fine because almost every item has one
photo. The moment an item has 3-4 (a hero shot + a beauty shot + a social crop + a map-reference
photo), whichever one happens to sort first becomes the card thumbnail — not necessarily the one
Rick wants buyers to see first.

**Fix:** give `sync-images.mjs` an explicit sort key. Cheapest option — no new tagging convention,
reuse what's already there: sort each code's images so the one tagged `hero` (an existing usage tag
already recognized by `netlify/functions/media-list.js`'s `USAGE_IDS`) comes first, then everything
else in existing order. If nothing is tagged `hero`, keep current behavior (first-listed wins), so
this is purely additive — no re-tagging required for the ~60 single-photo items already live.

```js
// sync-images.mjs, after building `images`:
const heroFirst = (a, b) => (b.tags?.includes("hero") ? 1 : 0) - (a.tags?.includes("hero") ? 1 : 0);
```
(Actual implementation should sort within `imagesByCode` groups, not the flat array — see
`buyer-catalog.jsx:58-62`, that's the natural place since it already does the grouping.)

## Gap 2 — no vocabulary for *what kind* of extra photo this is

Rick's ask specifically names three flavors: **beauty shots**, **social shots**, **visual map
references**. Good news again: `netlify/functions/media-list.js` already has a `USAGE_IDS` taxonomy
for exactly this (`hero, story-block, lifestyle, food-styling, production, social, press, event,
brand-asset, email-campaign, print, web-marketing`) — it's just never been threaded through to the
Buyer Catalog, only to the internal Media Hub. `food-styling` ≈ beauty shot, `social` already exists
as-is. "Map reference" doesn't have a home yet — add `map-reference` to `USAGE_IDS` (media-list.js)
and to whatever mirror list lives in `src/lib/media.js`.

**Fix:**
1. Add `map-reference` to `USAGE_IDS`.
2. `sync-images.mjs` (Admin API mode) already reads `r.tags` — thread the usage-taxonomy tags through
   onto each manifest record as e.g. `usage: tags.filter(t => USAGE_IDS.includes(t))`.
3. `getBuyerCatalog()` (`src/lib/catalog.js:14-33`) passes `usage` through in its per-image map, same
   as it does `bgRemoved` today.
4. In the lightbox thumbnail strip (`buyer-catalog.jsx:283-303`), show a small label/tooltip on each
   thumbnail using its `usage` (e.g. "Social", "Beauty", "Map reference") so a buyer — or Rick,
   reviewing — can tell at a glance which is which, instead of them all looking identical.

This is additive and low-risk: an asset with no usage tag renders exactly as today.

## Gap 3 — spec sheets / documents live nowhere near the photos

Cloudinary can hold a PDF spec sheet as a `resource_type: raw` asset, but `sync-images.mjs`'s Admin
API mode only calls `resources/image` (`scripts/sync-images.mjs`, the `listPrefix()` helper) — a PDF
tagged with the same `code` today is invisible to the manifest entirely, gated or not. There's also no
UI slot for "here's the spec sheet PDF for this item" anywhere near the Buyer Catalog's item lightbox.

**Update, same day, confirmed in code:** this gap is bigger than first scoped — it's not just the
Buyer Catalog. `netlify/functions/media-list.js` (Media Hub's own read path) *also* only calls
`resources/image` (single `grep` for `resource_type` in that file turns up nothing else). So a raw
PDF is currently invisible to Media Hub too, not only to the manifest/Buyer Catalog. That matters
now specifically: Rick handed off 14 "Precut EW" spec sheet PDFs this same session (from a newly
connected `Precut EW Spec` Downloads folder), covering item codes `01174, 02091, 03044 (two dated
saves, both rev2 — 08-27 and 08-21, kept as separate assets pending Rick's call on which supersedes),
03073, 04182, 20424, 20480, 20481, 30014, 30015, 30016, 30017`, plus two codes not in the current
active catalog at all (`01114`, `20482` — same "unlisted SKU" situation as `01286` from the photo
batch earlier tonight, tagged `draft` + `new-sku-pending` instead of `product-catalog`+approved).
All 15 were uploaded straight to Cloudinary as `resource_type: raw` under `monti/<code>-specsheet`
(public raw-upload URL pattern: `https://res.cloudinary.com/sofcvmwa/raw/upload/<version>/monti/
<code>-specsheet`), tagged `spec-sheet` plus the standard `product-catalog`/approval tags for the
12 known-active codes. **They are correctly stored and tagged, but genuinely invisible in both Media
Hub and the Buyer Catalog until this gap is closed** — worth knowing before assuming "it's in
Cloudinary with the right tags" means "Rick can see it somewhere in the app," which is true for
photos but not yet true for documents.

**Update, later same day — CODE COMPLETE, pushed:** built and regenerated the manifest. What
actually landed, for the next person reading this instead of re-deriving it:

- `netlify/functions/media-list.js`: `fetchPage()`/`listPrefix()` now take a `resourceType`
  param (`"image"` default); PAGED mode's cursor walks `main:image:` → `main:raw:` →
  `legacy:<idx>:image:` → `legacy:<idx>:raw:` → next legacy idx, so an existing client that only
  ever paged through images still sees them first. FULL mode does an extra raw pass per prefix and
  merges it in. `mapResource(r, resourceType)` now stamps `kind: resourceType === "raw" ?
  "document" : "image"`.
- `scripts/sync-images.mjs` (Admin API mode): same `resourceType` param on its own `listPrefix()`,
  same double pass (main + each legacy folder), `kind` carried onto each manifest record. LIVE mode
  (`--live`) just passes through whatever `kind` media-list.js already resolved.
- **Gotcha found the hard way:** the tenant's own item-records file lives as a *raw* Cloudinary
  asset at `monti-trentini/copy/items.json` (see `src/lib/items.js`) — the very definition of "not
  a spec sheet." The naive raw-resource pass picked it straight up as a stray "document" tile with
  no SKU/format, both in the manifest and in Media Hub's asset grid. Fixed with an explicit
  `isInternalRawDoc()` guard (matches `/copy/items.json` at the end of the public_id) in both
  `media-list.js` and `sync-images.mjs`, so it's excluded before it ever becomes an asset record.
  Worth remembering if another internal raw-JSON store gets added later — same guard, same reason.
- `src/lib/catalog.js`: `getBuyerCatalog()` passes `kind` through; new `cldDocDownload(cloud, im)`
  helper builds a raw-delivery download URL (`.../raw/upload/fl_attachment/<publicId>.<ext>`) since
  `cldImage()`'s transform strings only ever target `image/upload` and 404 against a raw asset.
- `buyer-catalog.jsx`: `imagesByCode` now excludes `kind:"document"` (so a PDF can never land in
  `imgs[0]` and get treated as a photo); a parallel `docsByCode` feeds a `docs` array alongside
  `imgs` on every row. Grid card and list row both show a small "N spec sheets" line when present;
  the lightbox detail pane gets a "Spec sheet(s)" section with a plain download link per PDF.
- `media-hub.jsx`: `AssetTile` and `AssetDialog` both check `asset.kind === "document"` and render
  a file icon / "Open <FORMAT>" link instead of an `<img>` (which 404s against a raw asset — same
  root cause as the Buyer Catalog problem). The PNG-download button is hidden for documents; a
  plain "Download <FORMAT>" button replaces it. `deleteAsset()` now gets `resourceType: "raw"` for
  a document so "Delete file" actually targets the right Cloudinary resource type instead of
  silently missing (default was always `"image"`).
- Manifest regenerated: 346 images, 86 with a gated `code` — 13 of the 15 spec sheets came in
  gated (already tagged `product-catalog` + `approved-for-press`); `01114` and `20482` are still
  `draft`/ungated on purpose (see below).

**Still open — needs Rick, not code:** `01114` and `20482` are spec sheets for item numbers that
don't exist in the active catalog (same situation as `01286` from the photo batch). This session
hit a safety gate on further *direct* Cloudinary writes (tag/approval changes, editing the shared
`items.json`), so promoting these two — and adding `01286` — to a real, catalog-visible item is
Rick's to finish, and the RIGHT place to do it is exactly where the standing rule says: Media
Hub → open the asset → set usage to include Product Catalog + approval to Approved for Press, and
add the corresponding row on the Items tab (name + specs) for `01114`, `20482`, and `01286`. A few
clicks each; no code or manifest regen needed afterward beyond a normal Media Hub save.

**Fix (bigger, do this last):**
1. `sync-images.mjs`: add a second `listPrefix()` pass with `resource_type=raw` over the same
   folder(s) (`monti-trentini` + the legacy `monti` folder from `cloudinaryLegacyFolders`), gated by
   the same `product-catalog` + approval-tag rule. Give these manifest records `kind: "document"`
   (default `kind: "image"` on the existing ones, via `??` so nothing already in the manifest needs
   touching) alongside `publicId/format/code/sku/title`.
2. `getBuyerCatalog()`: pass `kind` through.
3. `buyer-catalog.jsx`: split `imgs` for a row into `photos = imgs.filter(i => i.kind !== "document")`
   and `docs = imgs.filter(i => i.kind === "document")`. Photos keep behaving exactly as today (grid
   thumbnail, lightbox strip). `docs`, if any, render as a small "Spec sheet" list under the
   description in the lightbox detail pane (`buyer-catalog.jsx` right column, near the existing
   "Download original" button) — plain download links via `cldDownload`-style URL building
   (`resource_type=raw` download URLs don't need the image transformation presets `cldImage` builds,
   just `https://res.cloudinary.com/<cloud>/raw/upload/<version>/<publicId>`).
4. Tagging convention going forward: a spec sheet PDF gets `code=<sku>` context (same as photos) +
   `product-catalog` + an approval tag, uploaded as `resource_type: raw`. No new tag vocabulary
   needed — `kind` is derived from Cloudinary's own `resource_type`, not from a tag.

## Suggested build order

1. Gap 1 (hero ordering) — smallest, fixes an already-live rough edge as soon as any item gets a
   second photo (which just happened for `01174` tonight).
2. Gap 2 (usage labels on alternates) — makes the multi-photo lightbox actually legible instead of
   an unlabeled row of look-alike thumbnails.
3. Gap 3 (spec sheets) — the only one that needs a genuinely new fetch path (`resource_type=raw`) and
   a new manifest field (`kind`); do it once 1–2 are proven out, since it touches `sync-images.mjs`'s
   Admin API listing loop directly.

None of these three require a schema migration or backfill — every field they add is optional/derived
with a safe default, so the ~60 items with exactly one untagged photo today render identically before
and after.

## Not in scope here

- A real "folder per item" reorganization inside Cloudinary (e.g. `monti/01174/hero.jpg`,
  `monti/01174/social-1.jpg`, `monti/01174/spec-sheet.pdf`) is NOT required for any of the above — the
  `code` context field is what links assets to an item, not the public_id path, and re-parenting ~300
  existing assets into subfolders is a separate, purely-organizational cleanup with its own blast
  radius (every public_id changes → every cached URL changes). If Rick wants that for easier manual
  browsing in the Cloudinary console specifically, treat it as its own follow-up, not bundled with the
  Gap 1-3 work above.
- No change is needed to `src/lib/images.js`'s `imageForCode()` (singular) — that's the older reader
  used by Proposals/Pricing/Quote Builder, which intentionally only ever wants one photo per SKU. Only
  the Buyer Catalog's own `imagesByCode` grouping needs the ordering/labeling work above.
