#!/bin/bash
# COMMIT USAGE TAXONOMY — double-click to commit + push the expanded usage tags (12 dispatch paths).
# Commits AND pushes in one step — Netlify auto-deploys (~1-2 min).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy usage taxonomy (12 tags) ──"

rm -f .git/index.lock

git add -A \
  src/lib/media.js \
  netlify/functions/media-list.js \
  netlify/functions/media-update.js \
  docs/BUILD_LOG.md

git commit -m "feat(media): usage taxonomy covers all dispatch paths (12 tags)

Add Email / Campaign, Print / Sell-sheet, Web / Marketing to the usage taxonomy
(Event kept once, Lifestyle separate). Updated the single source media.js USAGE
and both functions' USAGE_IDS (media-list, media-update) in lockstep."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Test: Media hub left rail now lists all 12 usage views."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
