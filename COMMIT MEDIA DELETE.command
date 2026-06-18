#!/bin/bash
# COMMIT MEDIA DELETE — admin-clearance delete button in the Media Hub.
# New media-delete Netlify function + deleteAsset seam + admin-gated Delete button (with confirm).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit Media Hub admin delete ──"

rm -f .git/*.lock          # clear stale index.lock AND HEAD.lock

git add -A \
  netlify/functions/media-delete.js \
  src/lib/media.js \
  src/components/media/media-hub.jsx

git commit -m "feat(media-hub): admin-clearance delete button

New media-delete Netlify function (Cloudinary Admin API destroy, secret server-side,
invalidate=true). media.js: canDeleteMedia()=admin-only + deleteAsset() seam (mock no-op).
AssetDialog: destructive Delete button gated to admin, window.confirm guard, removes the
asset from grid/recent/dialog on success. Build verified clean."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed — Netlify will rebuild." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
