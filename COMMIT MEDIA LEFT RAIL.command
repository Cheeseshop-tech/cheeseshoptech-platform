#!/bin/bash
# COMMIT MEDIA LEFT RAIL — double-click to commit + push: Media Hub views as a left nav rail.
# Commits AND pushes in one step — Netlify auto-deploys (~1-2 min).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy: Media Hub left nav rail ──"

rm -f .git/index.lock

git add -A \
  src/components/media/media-hub.jsx \
  docs/BUILD_LOG.md

git commit -m "feat(media): usage views as a left nav rail with counts

Replace the horizontal tab row with a vertical left rail (file-explorer style):
Recent / All, divider, then the usage views, each with a per-view count. Chosen
over a dropdown (keeps all views scannable) and the wrapping row (busy at 11)."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Test: Media hub -> views now run down the left with counts."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
