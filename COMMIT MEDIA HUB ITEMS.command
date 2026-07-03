#!/bin/bash
# Double-click to commit + push: Media Hub Items — item identity + copy record (NO pricing).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/items.js" \
  "src/components/media/items-panel.jsx" \
  "src/components/media/media-hub.jsx" \
  "netlify/functions/items-get.js" \
  "netlify/functions/items-save.js" \
  "docs/MEDIA_HUB_ITEMS.md" \
  "COMMIT MEDIA HUB ITEMS.command"

git commit -m "feat(media-hub): Items — source of truth for item identity + copy (no pricing)

- item record per SKU, fields in price & inventory sheet order: item number,
  pack size, weight, UPC, short description, long description, certification;
  pricing strictly excluded (stays in the Custom Price List Creator)
- storage: one raw JSON per tenant at {tenant}/copy/items.json in Cloudinary;
  items-save fn (signed upload, overwrite+invalidate), items-get fn
  (version-aware read, cache-proof); reuses existing Cloudinary env
- Items tab first in the Media Hub rail: searchable list (item #, UPC, desc),
  editor with copy buttons on both descriptions; photos linked by SKU
- asset dialog: weight / pack size / short + long description editable on any
  photo with a linked SKU — writes through to the SAME item record (one truth)
- consumer API: descriptionFor(doc, sku, 'short'|'long') for slides / blogs /
  emails / social; v1 doc migration (cards -> descriptions, pricing dropped)
- tiles: usage tag badges removed from the grid (clutter); still in the dialog"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: Media Hub → Items → create a test item → reload page (should persist to Cloudinary)."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
