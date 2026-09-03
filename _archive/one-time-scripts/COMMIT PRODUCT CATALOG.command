#!/bin/bash
# Double-click to commit + push: Image Catalog → Product Catalog + item-truth wiring.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/App.jsx" \
  "src/components/catalog/buyer-catalog.jsx" \
  "config/clients/montitrentini.json" \
  "config/clients/demo.json" \
  "config/clients/_template.json" \
  "COMMIT PRODUCT CATALOG.command"

git commit -m "feat(catalog): rename Image Catalog -> Product Catalog + wire to item truth

- label/title renamed everywhere: App.jsx page title, page headers, and the
  three client configs (montitrentini, demo, _template)
- the catalog page now loads the Media Hub item-truth doc from Cloudinary
  ({tenant}/copy/items.json via loadItems) and renders from it:
  - grid tiles show the item spec line (weight / pack / milk / age) when a
    record exists, category otherwise
  - lightbox: spec line under the title, long/short description pulled via
    descriptionFor (freehand description only when no item record exists),
    'Item code' -> 'Item number', certification row when present
  - Edit details: the freehand Description field is replaced by a pointer to
    Media Hub -> Items for SKU-linked images (never freehand item copy)
- verified live before wiring: 71/71 items in monti-trentini/copy/items.json
  carry item numbers + short descriptions; long descriptions still open"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify on prod: dashboard card + page say 'Product Catalog'; open a packshot (e.g. an Asiago) → spec line + description from the item record; a non-SKU photo still shows its freehand description."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
