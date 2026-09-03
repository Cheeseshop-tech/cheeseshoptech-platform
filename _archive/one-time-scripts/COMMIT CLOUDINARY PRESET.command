#!/bin/bash
# COMMIT CLOUDINARY PRESET — double-click to commit + push the upload-preset config.
# Adds VITE_CLOUDINARY_UPLOAD_PRESET=st_unsigned to netlify.toml so image uploads work.
# Commits AND pushes in one step — Netlify auto-deploys (~1-2 min).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy Cloudinary upload preset ──"

rm -f .git/index.lock

git add -A netlify.toml docs/ASSET_LIBRARY_SPEC.md

git commit -m "build(cloudinary): set unsigned upload preset (st_unsigned) for image uploads

Adds VITE_CLOUDINARY_UPLOAD_PRESET to netlify.toml [build.environment] so the
browser-side unsigned uploads (brand kit slots, media hub) actually save. The
preset name is public by design (it ships in the client bundle), so it lives in
version control rather than the dashboard. Also commits the Asset Library spec."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Then test: ?app=1 -> house passcode -> Brand kits -> edit -> Upload a logo."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
