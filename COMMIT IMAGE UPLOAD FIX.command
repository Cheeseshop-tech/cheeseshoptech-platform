#!/bin/bash
# COMMIT IMAGE UPLOAD FIX — double-click to commit + push the file-picker fix.
# Fixes JPEG/PNG showing grayed-out in the upload dialog (explicit accept extensions).
# This one commits AND pushes in a single step (small hotfix) — Netlify auto-deploys.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy image-upload fix ─────"

rm -f .git/index.lock

git add -A \
  src/components/brand/brand-management.jsx \
  src/components/media/media-hub.jsx

git commit -m "fix(upload): explicit image accept extensions so the file picker highlights JPEG/PNG

accept=\"image/*\" alone left valid images grayed-out in the macOS picker.
List explicit png/jpeg/webp/svg/gif MIME types + extensions on the brand
image-slot and media-hub file inputs."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min at:"
  echo "https://cheeseshoptech-platform.netlify.app/?client=montitrentini"
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
