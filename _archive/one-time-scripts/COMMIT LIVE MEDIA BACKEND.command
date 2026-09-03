#!/bin/bash
# COMMIT LIVE MEDIA BACKEND — double-click to commit + push the media-list function update.
# (Adds usage[] mapping so the live Cloudinary backend feeds the tag tabs.) Netlify auto-deploys.
# NOTE: this only takes effect once you set the Cloudinary env vars in Netlify (see chat).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy live media backend ──"

rm -f .git/index.lock

git add -A \
  netlify/functions/media-list.js \
  docs/BUILD_LOG.md

git commit -m "feat(media): media-list returns usage[] for the live Cloudinary backend

Extends the media-list Netlify function to map Cloudinary tags -> usage[] (the
USAGE taxonomy) and recognize the 'library' upload subfolder, so the Media Hub's
tag tabs + counts work against real assets. Activates with VITE_MEDIA_BACKEND=
cloudinary + CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET set server-side in Netlify."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Set the Cloudinary env vars in Netlify (see chat), then it goes live."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
