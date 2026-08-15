# Unified Image Pipeline — Spec (Phase F5)

**Written:** 2026-06-13 · **Status:** ✅ BUILT + DEPLOYED 2026-06-13 (commit `4b729af`). Pilot runs on a
build-time manifest seeded from existing data; the live Cloudinary sync (`npm run sync:images`) is
ready for Rick to run with creds to regenerate it (and to pick up BOTH Cloudinary folders).
**Goal (Rick's words):** "one mind and body" — a solid, uniform, wired image source every screen grabs from.

## What shipped (2026-06-13)
- `src/data/montitrentini/images.json` — the ONE canonical manifest (103 images, single shape).
- `src/lib/images.js` — `getImages / imageList / imageForCode / codeImageUrl` reader seam.
- Catalog is now a VIEW over the manifest; `buyer-catalog.json` deleted.
- Proposals + Pricing resolve SKU images via `codeImageUrl` (manifest-first, legacy `monti/<code>`
  packshot fallback so all 71 priced SKUs still render).
- `scripts/sync-images.mjs` (real Cloudinary Admin API sync) + `npm run media:refresh` (sync + prewarm).
- Verified live: Catalog renders 103 images from the manifest, codes intact, fast.
- **Remaining polish (optional):** run `sync:images` against Cloudinary to capture the `monti/<code>`
  packshot folder too (the 44 priced SKUs that currently use the fallback), and move masters to R2.

## Why

The same Cloudinary images are currently described in **three mismatched shapes** across the app, so
adding or fixing one photo can require edits in multiple files for it to appear everywhere — and the
surfaces drift (the Catalog ran slow `g_auto` thumbnails for days after the Media hub was fixed,
because they were separate code). The render layer is now unified (see "Done"); the **source** isn't.

| Surface | Reads from today | Shape |
|---|---|---|
| Catalog | `src/data/montitrentini/buyer-catalog.json` | `cl_id, cl_v, cl_fmt` |
| Pricing / Proposals | `client.config.json` → `images` + `sku.image` | filename leaf |
| Media hub | `functions/media-list.js` (or mock) | `publicId` |

## Done already (2026-06-13, shipped)

- **One builder.** Every image URL in the app routes through `cldImage()` in `src/lib/cloudinary.js`
  — the single source of truth for size/crop/format. Named presets (`micro/thumb/card/preview/hero/
  original`); no raw `res.cloudinary.com` URLs remain in render code. Catalog (`lib/catalog.js`),
  Proposals (`lib/proposals.js`), Pricing tool, and Media hub all delegate to it.
- **The slow-load root cause fixed:** dropped `g_auto` (content-aware crop forced a full ~45 MP
  decode per image) → pad-on-white; thumbnails 360 px; Catalog + Media hub paginate 30/page instead
  of mounting the whole folder. `npm run prewarm` pre-builds derivatives so the first viewer never waits.

## Target architecture

Two stores → one sync job → one canonical manifest per tenant → the `cldImage` builder → every screen.
(See the diagram shared in the 2026-06-13 session.)

- **Stores:** Cloudinary = web delivery; Cloudflare R2 (`cheeseshoptech-media-archive`) = masters/video.
- **Sync job (the wired process):** reads the tenant's Cloudinary folder (Admin API, server-side —
  extends the existing `functions/media-list.js`) and writes ONE `images.json` per tenant.
- **Canonical manifest — one shape:**
  ```json
  {
    "tenant": "montitrentini",
    "cloud": "sofcvmwa",
    "folder": "monti-trentini",
    "generatedAt": "2026-06-13T...",
    "images": [
      { "publicId": "monti-trentini/asiago/asiago-stagionato-pdm-1mcwrm",
        "version": 1779691532, "format": "jpg",
        "category": "Asiago", "title": "Asiago Stagionato PDM",
        "code": "03023", "sku": "03023",
        "approvalState": "approved-for-press",
        "width": 6732, "height": 6732, "bytes": 1698207 }
    ]
  }
  ```
  One record carries everything every surface needs: `publicId/version/format` for `cldImage`,
  `category/title/code` for the Catalog, `sku` for Pricing/Proposals, `approvalState` for the Media hub.

## Build steps (F5)

1. **`scripts/sync-images.mjs`** (or a Netlify function) — pull the tenant's Cloudinary resources
   (paginated, tags + context), map to the manifest shape, write `src/data/<tenant>/images.json`.
   Secrets stay server-side (`CLOUDINARY_*`), same as `media-list.js`.
2. **One reader** — `getImages(resolved)` in a small `lib/images.js` (mirrors the `pricing.js`/`catalog.js`
   seam): returns the manifest, mock-bundled now, real backend later.
3. **Point all four surfaces at it:**
   - Catalog: `getBuyerCatalog` → derive from the manifest (drop `buyer-catalog.json`).
   - Media hub: `listAssets` → read the manifest, filter by `approvalState` + folder (drop the separate path).
   - Proposals/Pricing: resolve a SKU's image via `images.find(i => i.sku === code)` instead of `sku.image`.
   - The builder is already shared — surfaces just pass `{publicId, version, format, preset}`.
4. **Fold in prewarm** — sync writes the manifest, then warms every derivative. One command after an
   upload batch: `npm run sync && npm run prewarm` (or a single `npm run media:refresh`).
5. **Retire the drift** — delete `buyer-catalog.json` + `sku.image` lookups once the manifest is source.

## Acceptance criteria

- [ ] Adding a photo to Cloudinary + running one command makes it appear, correctly sized, on every
      relevant screen — with no per-file editing.
- [ ] There is exactly one file describing a tenant's images; no surface builds its own image list.
- [ ] First-load of any gallery is fast for a brand-new visitor (derivatives pre-warmed).
- [ ] Removing/renaming an image in Cloudinary is reflected everywhere after one sync.

## Migration plan — one image per code → typed, ordered series (not started)

**Why this section exists.** CLAUDE.md (2026-07-13) commits the image model to a *series* per SKU,
classified by type: **pack shot** · **beauty shot** · **styled photo**. Today `imageForCode()`
(`src/lib/images.js:38`) returns the **first** manifest record whose `code` or `sku` matches, and
four surfaces resolve a SKU's photo through it or through `codeImageUrl()`: Product Catalog,
Proposals, Pricing Tool, and Studio Director. Changing the return shape in place breaks all four in
the same deploy. This is the plan for not doing that.

It also fixes a live ambiguity: `IMAGE_HEALTH_2026-07-09.md` records four SKUs carrying two
packshots each, where whichever record sorts first silently wins the SKU. Type ranking makes that
outcome deliberate instead of incidental.

**Rule: additive first, destructive last and alone.** Each step below is independently deployable,
and old and new code are both valid against the manifest at every step.

### Expand — nothing reads it yet

1. **`scripts/sync-images.mjs` writes two new optional fields** per record: `type`
   (`"packshot"` | `"beauty"` | `"styled"`), derived from the Cloudinary tag, and `order`
   (integer, optional manual override). Records with no type tag get **no** `type` key — absent,
   not defaulted, so "untyped" stays distinguishable from "confirmed packshot". Existing readers
   ignore both fields; the manifest stays backward-compatible.
2. **Add `imagesForCode(resolved, code)`** to `src/lib/images.js` — returns the **ordered array**
   of records for a code: explicit `order` first, then type rank (packshot → beauty → styled),
   then untyped, then existing manifest order as the stable tiebreak. `imageForCode()` is
   untouched. Nothing calls the new function yet.

Rick's manual tagging pass in Cloudinary runs against step 1 and can proceed **ahead of and in
parallel with** any code change — untyped records still resolve exactly as they do today.

### Migrate — adapter, one surface at a time

3. **Reduce `imageForCode()` to an adapter:** `imagesForCode(resolved, code)[0] ?? null`. Same
   signature, same return type, so `codeImageUrl()` (line 151) and `isPlaceholderImage()` (line 72)
   need no edit. Behavior changes only for codes holding more than one record — verify that pass
   against the four SKUs named in `IMAGE_HEALTH_2026-07-09.md` before shipping it.
4. **Move consumers individually**, each its own deploy:
   - **Product Catalog** — first real consumer of the series (PDP gallery / ordered thumbnails).
   - **Media Hub** — group a code's records instead of listing them flat; surface `type` as a facet.
   - **Proposals / Pricing / Studio Director** — these genuinely want exactly one image. Switch them
     to an explicit `imagesForCode(...)[0]` so the single-image choice is visible at the call site
     rather than implied by a helper name.

### Contract — separate, later deploy

5. Once `grep -rn "imageForCode" src/` shows only the adapter itself, either keep it as a
   documented one-line convenience (acceptable — it is no longer load-bearing) or delete it in a
   commit that touches nothing else.

### Additional acceptance criteria

- [ ] A SKU with a pack shot, a beauty shot, and a styled photo renders all three in the Catalog,
      in that order, from one manifest.
- [ ] A SKU with a single untyped record renders exactly as it does today — no regression.
- [ ] The four double-packshot SKUs resolve to a deliberate winner, not the first match by chance.
- [ ] No commit changes `imageForCode()`'s contract and a consumer at the same time.

## Open questions

- **(Rick/Claude)** Run sync as a build-time script (committed `images.json`, simplest) or a live
  Netlify function (no rebuild, but needs caching)? Lean build-time for the pilot; live later.
- **(Rick)** Confirm masters move to R2 and Cloudinary holds only web-sized copies (cuts Cloudinary
  storage + makes every transform faster) — this is the storage half of the same unification.
