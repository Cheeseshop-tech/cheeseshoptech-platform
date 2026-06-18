#!/bin/bash
# COMMIT MEDIA UPLOAD DIALOG — double-click to commit + push the Media Hub upload dialog.
# Adds name + usage-tag step on upload (Asset Library step 1). Commits AND pushes; Netlify deploys.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy Media Hub upload dialog ──"

rm -f .git/index.lock

git add -A \
  src/lib/cloudinary.js \
  src/lib/media.js \
  src/components/media/media-hub.jsx \
  docs/ASSET_LIBRARY_SPEC.md \
  docs/BUILD_LOG.md

git commit -m "feat(media): upload Asset-details dialog + Recent tab (Asset Library step 1)

Media Hub upload now opens an Asset details dialog: per-file Name + multi-select
Usage tags (Product Catalog, Hero, Story block, Lifestyle, Food styling, Social,
Press/PR, Event, Brand asset) instead of silently uploading filenames. Name ->
Cloudinary caption; usage -> Cloudinary tags. lib/media.js owns the USAGE list;
uploadAsset extended with displayName + usage; usage shows as badges on tiles +
in the asset dialog.

Adds a Recent tab (newest-first) so freshly uploaded + tagged assets are easy to
find; persisted in localStorage per tenant (cap 60) so they survive reloads while
the hub is mock-backed. Product Catalog stays product-only (view over the manifest,
not Media Hub uploads)."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Test: Media hub -> Recent tab; Upload -> name + usage -> Upload -> see it in Recent."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
