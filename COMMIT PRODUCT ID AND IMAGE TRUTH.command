#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add \
  src/lib/images.js \
  src/lib/media.js \
  src/lib/studio-director.js \
  src/components/media/media-picker.jsx \
  scripts/audit-catalog-integrity.mjs \
  docs/PRODUCT_ID_AND_IMAGE_TRUTH_2026-09-18.md \
  docs/CATALOG_INTEGRITY_AUDIT_2026-09-18.md \
  CLAUDE.md \
  "COMMIT PRODUCT ID AND IMAGE TRUTH.command"

git commit -F .commit-msg-product-id-image-truth.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-product-id-image-truth.txt

read -n 1 -s -r -p "Press any key to close..."
echo
