#!/bin/bash
# Double-click to commit + push: Media Hub surfaces the 71 legacy monti/ packshots.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/media-list.js" \
  "src/lib/media.js" \
  "src/lib/clientConfig.js" \
  "src/lib/studio-director.js" \
  "src/components/media/media-hub.jsx" \
  "src/components/media/media-picker.jsx" \
  "config/clients/client.schema.json" \
  "config/clients/montitrentini.json" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md"

git commit -m "feat(media-hub): surface legacy monti/ packshots via cloudinaryLegacyFolders

71 per-SKU packshots live at legacy monti/<itemcode> in Cloudinary (filename = item
code, no context/tags) — media-list only queried the tenant folder monti-trentini/,
so they never appeared in the Media Hub.

- media-list.js: optional legacy= param (comma list); fetches each legacy prefix,
  filters to the EXACT folder (Admin-API prefix is a string match — 'monti' also
  matches 'monti-trentini/...'), dedupes, and derives sku from the filename
  (monti/01021 -> sku 01021, only when context has none) so packshots auto-link
  to their item records.
- media.js: listAssets takes legacyFolders, appends &legacy=.
- media-hub.jsx / media-picker.jsx / studio-director.js: pass
  resolved.cloudinaryLegacyFolders.
- client.schema.json: new optional cloudinaryLegacyFolders string[];
  clientConfig.js resolves it (default []); montitrentini.json sets [\"monti\"].

Assets deliberately NOT moved/renamed: campaign materials and the pricing tool's
codeImageUrl fallback reference monti/<code> delivery URLs. One-folder migration
is a separate deliberate session.

Legacy packshots land untagged in the products bucket (approved-for-press default):
visible in All/Products, not in usage tabs or the Product Catalog gate until tagged.

Build clean (vite build), validate:clients clean, node --check on the function clean."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "Verify: Media Hub → Products tab should jump ~98 → ~169 assets (the 71 packshots),"
  echo "each showing its item code as SKU and linking to its item record."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
