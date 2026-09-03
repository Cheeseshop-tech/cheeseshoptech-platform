#!/bin/bash
# Double-click to commit + push: image manifest un-frozen (103->242), live-syncable without secrets.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/media-list.js" \
  "scripts/sync-images.mjs" \
  "src/data/montitrentini/images.json" \
  "docs/BUILD_LOG.md"

git commit -m "fix(images): un-freeze the image manifest, wire it to live Cloudinary (103->242)

Root cause: Product Catalog reads item identity/copy LIVE (items-get at runtime) but reads
PHOTOS from a static bundle (images.json) that only updates when someone with the Cloudinary
Admin API secret manually reruns sync-images.mjs + redeploys. That hadn't happened in weeks —
manifest had 103 images, Cloudinary actually holds 242. The other 139 were fully visible/
editable in the Media Hub (which lists live) but invisible everywhere else.

- media-list.js: also returns version/bytes/modified (already on the Cloudinary resource,
  just not mapped through) so it can fully back the manifest.
- sync-images.mjs: new --live mode, auto-selected when Admin API secrets aren't set. Rebuilds
  the manifest from the already-deployed media-list function instead of the Admin API directly
  — no secret needed anywhere but Netlify. Direct Admin API mode unchanged/still preferred when
  secrets are available.
- images.json regenerated: 103 -> 242 images, 50 with a confirmed item code.
- Restored 23 item-code links that existed only in the old local bundle and were never
  actually written to Cloudinary context (predate the Media Hub item-linking feature) — 4 known
  orphan/bad codes correctly stayed unlinked. Also wrote 5 already-resolved links from this
  session (Lagorai x2, Provolone, Piave x2) that were confirmed but not yet pushed.
- BUILD_LOG: full writeup incl. wiring review findings (media-update has no caller auth,
  VITE_IMAGES_BACKEND live adapter is an unimplemented stub, no scheduled manifest refresh)."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
