#!/bin/bash
# COMMIT MEDIA UPLOAD RESIZE — auto-downscale oversized images before Cloudinary upload.
# Fixes Media Hub uploads stalling on 15 MB+ photos (unsigned preset ~10 MB cap).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit media upload auto-resize ──"

rm -f .git/index.lock

git add -A src/lib/cloudinary.js

git commit -m "fix(media-hub): downscale oversized images client-side before upload

Big phone/DSLR masters (15-40 MB) exceeded the unsigned preset cap (~10 MB) and
stalled the browser POST — the hub showed 'uploading' forever. uploadAsset() now
runs downscaleForUpload() first: shrinks the longest edge to 2560px and re-encodes
(PNG stays PNG to keep transparency; others -> JPEG) before posting. Non-images,
SVG/GIF, and already-small files pass through; any failure falls back to the
original so uploads are never blocked. Delivery transforms resize further at view."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed — Netlify will rebuild." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
