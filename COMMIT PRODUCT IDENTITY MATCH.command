#!/bin/bash
# Double-click to commit + push: product NAME in item truth + bulk photo→item matching +
# Product Catalog = coded products only, with Download PNG + Share.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/items.js" \
  "src/components/media/items-panel.jsx" \
  "src/components/media/media-hub.jsx" \
  "src/components/catalog/buyer-catalog.jsx" \
  "src/components/layout/app-shell.jsx" \
  "vite.config.js" \
  "config/clients/montitrentini.json" \
  "config/clients/demo.json" \
  "config/clients/_template.json" \
  "scripts/build-items-seed.mjs" \
  "scripts/match-photos-to-items.mjs" \
  "src/data/montitrentini/items-seed.json" \
  "src/data/montitrentini/images.json" \
  "docs/BUILD_LOG.md" \
  "COMMIT PRODUCT IDENTITY MATCH.command"

git commit -m "feat(catalog): product name = item-truth identity + bulk photo matching + PNG/share

- item record gains NAME (the identity every surface displays; 'Asiago di
  Alpeggio' image titles are dead — the record says Alpeggio Cheese)
- Media Hub: Name field in the Items dialog + asset-editor item box + view box
- seed now merges source/item-reference.json: 71 catalog SKUs + 41
  identity-only items = 112 records; trailing weights lifted into the
  weight field, names title-cased
- scripts/match-photos-to-items.mjs (new): conservative bulk matcher —
  SKU tokens in filenames, single-SKU product-name matches, bad-code fixes;
  round-trips media-update so tags/context never get wiped; --write pushed
  11 sku links to Cloudinary context + fixed 20742->20724 (Alpeggio);
  images.json now 47 coded photos (was 36)
- Product Catalog = ITEM-DRIVEN MIRROR of the price-list item numbers:
  one row per item record (112), photos + short/long descriptions attach
  from Cloudinary by item number; items without photos render a 'No photo
  yet' tile; multi-photo items get a lightbox thumb strip; search covers
  name/item #/descriptions; stats = Items / With photos / Photos; new
  Download PNG + Share (native sheet, link always copied) alongside Copy
  share link; freehand edit panel removed — identity edits live in
  Media Hub -> Items
- dashboard card title casing: 'Product catalog' (matches the Media hub card)
- footer BUILD STAMP: vite bakes the build time into the sidebar footer
  ('build 2026-07-04 22:16 UTC') — one glance answers 'am I on the latest
  deploy?'; kills the stale-cache false alarms"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify on prod: Product Catalog lists ALL 112 items (price-list mirror), 'Alpeggio Cheese' (not Asiago di Alpeggio), 'No photo yet' tiles on unlinked items, Download PNG + Share in the lightbox."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
