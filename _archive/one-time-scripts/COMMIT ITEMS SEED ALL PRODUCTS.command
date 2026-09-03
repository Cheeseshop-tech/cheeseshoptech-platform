#!/bin/bash
# Double-click to commit + push: item records seeded for ALL products from catalog.json.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "scripts/build-items-seed.mjs" \
  "src/data/montitrentini/items-seed.json" \
  "src/lib/items-seeds.js" \
  "src/lib/items.js" \
  "COMMIT ITEMS SEED ALL PRODUCTS.command"

git commit -m "feat(media-hub): seed item records for ALL products from catalog.json

- scripts/build-items-seed.mjs: catalog.json -> items-seed.json (71 SKUs / 34
  products): weight from packing, pack size from pieces-per-case + form, milk
  type + min age + short description from marketing block, DOP/PDO/IGP/BIO
  certification detected from product name
- items-seeds.js: tenant folder -> seed map (monti-trentini wired)
- loadItems() fills BLANK fields from the seed at load time — anything saved
  through the Media Hub always wins; missing items created from seed wholesale
- result: every product photo with a linked SKU shows the spec line + short
  description immediately, no hand-typing; re-run the script when catalog
  changes"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: Media Hub → Items should list ~71 items; any SKU-linked photo shows specs."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
