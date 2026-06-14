# Bulk-Tag Tool — spec (next build)

**Written:** 2026-06-13 · **Status:** spec / not built. **Why:** the 104 existing Cloudinary assets
predate the usage taxonomy, so they're untagged and sit only under "All". Tagging them one-by-one via
the asset Edit dialog works but is slow. This adds multi-select + apply-to-many in the Media Hub.

## Goal

Select many assets in the Media Hub grid and apply usage tags (and optionally approval) to all of
them at once — so the existing library gets filed into its dispatch views fast.

## UX

- **Select mode toggle** in the Media Hub header ("Select"). When on, each tile shows a checkbox;
  clicking a tile toggles selection instead of opening it.
- **Select-all-in-view** convenience (tags the whole current tab at once — e.g. open "All", select
  all, tag everything that's a packshot as Product Catalog).
- **Sticky bulk action bar** when ≥1 selected: shows "N selected", a usage multi-select (the 12
  tags), an optional approval set, and **Apply**. Plus Clear / Cancel.
- After apply: toast with count; selection clears; grid + counts refresh.

## Behavior — ADD, don't replace

Bulk apply should **add** the chosen usage tags to each asset, preserving existing ones (e.g. an
asset already tagged Hero shouldn't lose it when you bulk-add Product Catalog). Approval, if set,
replaces (an asset has one approval state).

Two implementation options:
1. **Client loop (v1, simplest):** for each selected asset, merge existing `usage` (already in
   state) with the new tags, then call the existing `media-update` (which replaces tags with the
   merged set + current approval). ~100 calls is fine; Cloudinary Admin API free tier ≈ 500/hour.
   Show a small progress count.
2. **Batch function (v2, if volume grows):** a `media-bulk-update` Netlify function that takes
   `{ publicIds[], addUsage[], approvalState? }` and updates server-side, fewer round-trips.

Start with option 1.

## Out of scope (for this tool)

- **SKU linking is per-asset, not bulk** (each photo depicts a different product). Leave SKU in the
  single-asset Edit dialog. A later nicety: auto-suggest a SKU by matching the publicId/filename
  against the product list.
- Video / developed content (HubSpot phase).

## Files it will touch

- `src/components/media/media-hub.jsx` — select mode, bulk action bar, apply loop.
- Reuse `updateAsset` (media.js) + `media-update` function as-is (no backend change for v1).
- `USAGE` taxonomy already final (12 tags, in media.js + both functions).

## Acceptance

Open the Media Hub → Select → pick several untagged packshots → add "Product Catalog" → Apply →
they appear under the Product Catalog view (and in the buyer Product Catalog once the manifest/catalog
reads tags). Existing tags preserved.
