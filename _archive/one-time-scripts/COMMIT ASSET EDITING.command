#!/bin/bash
# COMMIT ASSET EDITING — double-click to commit + push: Media Hub asset editing (the WRITE half).
# Adds media-update function + asset edit dialog + ownership map. Reuses existing CLOUDINARY_* env.
# Commits AND pushes in one step — Netlify auto-deploys (~1-2 min).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy Media Hub asset editing ──"

rm -f .git/index.lock

git add -A \
  netlify/functions/media-update.js \
  src/lib/media.js \
  src/components/media/media-hub.jsx \
  docs/DATA_OWNERSHIP_MAP.md \
  docs/BUILD_LOG.md

git commit -m "feat(media): asset editing (WRITE half) + data ownership map

Media Hub becomes the asset control plane: open an asset -> Edit -> rename,
re-tag usage, link a SKU, add alt text, set approval. Persists via a new
media-update Netlify function (server-side Cloudinary Admin API update of
tags + context; reuses existing CLOUDINARY_* env, no new secrets). media.js
updateAsset() is the seam. Adds docs/DATA_OWNERSHIP_MAP.md: three domains,
one authoring home each, SKU as join key; product copy stays with the SKU,
not on assets. Replaces the old approval-only quick buttons."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Test: Media hub -> open an asset -> Edit -> change name/usage/SKU -> Save."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
