#!/bin/bash
# Double-click to commit + push: tag-driven edit fields + Production/Cheese-making tag.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/media.js" \
  "src/components/media/media-hub.jsx" \
  "netlify/functions/media-list.js" \
  "netlify/functions/media-update.js" \
  "COMMIT TAG DRIVEN FIELDS.command"

git commit -m "feat(media-hub): tag-driven attribute fields + production tag

- the 'Product Catalog' usage tag now decides an asset's edit fields:
  product photos get SKU + item record (weight/pack/milk/age/short/long);
  everything else (cow, pasture, press shot) gets ONE description field —
  no product-centric noise
- new usage tag: production (Production / Cheese making) — lib taxonomy +
  both function whitelists + a new left-rail view
- asset description stored in Cloudinary context (description=...), mapped
  back by media-list; alt now mapped from live backend too (was mock-only)
- view mode: non-product photos show their description; item spec box gated
  to product-tagged assets; item-record write-through skipped when the
  product tag is removed
- hidden fields still round-trip on save (context is replaced wholesale, so
  sku/alt/description always post together — nothing gets wiped)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: edit a cow/pasture photo → only Name/Usage/Approval/Description; edit a packshot → full item fields; Production view in the rail."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
