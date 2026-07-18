#!/bin/bash
# COMMIT MEDIA DISPATCH + LOAD FIX — image dispatch/background audit fixes + Media Hub pagination
# Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Image dispatch audit fixes + Media Hub load-time fix"
echo "=============================================="
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "netlify/functions/media-list.js" \
  "src/lib/media.js" \
  "src/components/media/media-hub.jsx" \
  "src/lib/cloudinary.js" \
  "src/lib/images.js" \
  "src/lib/catalog.js" \
  "scripts/sync-images.mjs" \
  "scripts/validate-images.mjs" \
  "package.json" \
  "docs/BUILD_LOG.md" \
  "docs/IMAGE_DISPATCH_AUDIT_2026-07-18.md" \
  "COMMIT MEDIA DISPATCH + LOAD FIX.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "fix(media): dispatch/background audit gate + Media Hub load-time fix

- sync-images.mjs: a SKU's code only counts in the manifest when the asset carries the
  product-catalog tag AND is approved (gatedCode) — closes the live 20724 cow-photo class
  of bug, both Admin API and --live modes now also read cloudinaryLegacyFolders themselves
- validate-images.mjs (new): npm run validate:images — standing tag/dispatch/duplicate-SKU report
- cloudinary.js/images.js/catalog.js: bg-removed tag -> bgRemoved manifest field -> transparent
  delivery preset, automatic per-asset once tagged, no call-site changes needed
- media-list.js/media.js/media-hub.jsx: paged=1 mode + listAssetsPage() — Media Hub streams
  page 1 immediately instead of blocking on the whole tenant asset set; MediaPicker/Studio
  Director unchanged (still full-fetch, unaffected)
- docs/IMAGE_DISPATCH_AUDIT_2026-07-18.md: full audit + fix notes"
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   Check your connection, then re-run this file to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Media dispatch/background fixes + Media Hub load-time fix are on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
