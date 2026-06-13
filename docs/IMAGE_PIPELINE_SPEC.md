# Unified Image Pipeline — Spec (Phase F5)

**Written:** 2026-06-13 · **Status:** designed, approved to spec; build = next focused session
**Goal (Rick's words):** "one mind and body" — a solid, uniform, wired image source every screen grabs from.

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

## Open questions

- **(Rick/Claude)** Run sync as a build-time script (committed `images.json`, simplest) or a live
  Netlify function (no rebuild, but needs caching)? Lean build-time for the pilot; live later.
- **(Rick)** Confirm masters move to R2 and Cloudinary holds only web-sized copies (cuts Cloudinary
  storage + makes every transform faster) — this is the storage half of the same unification.
