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
- Product Catalog RULE: only product photos WITH item numbers render (code
  must resolve to an item record — stale codes hidden); names, spec lines,
  descriptions all from items.json; search indexes item name + description;
  stats show distinct products; new Download PNG + Share (native sheet,
  link always copied) alongside Copy share link"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify on prod: Product Catalog shows only coded products, 'Alpeggio Cheese' (not Asiago di Alpeggio), spec lines on tiles, Download PNG + Share in the lightbox."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
