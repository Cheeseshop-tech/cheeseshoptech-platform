#!/bin/bash
# COMMIT MEDIA TABS — double-click to commit + push: Media Hub tabs now mirror the usage tags.
# Commits AND pushes in one step — Netlify auto-deploys (~1-2 min).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit + deploy: tabs mirror tags ────"

rm -f .git/index.lock

git add -A \
  src/components/media/media-hub.jsx \
  src/lib/media.js \
  docs/BUILD_LOG.md

git commit -m "feat(media): Media Hub tabs mirror usage tags (saved views)

Tabs switched from storage folders (products/brand/raw) to the usage taxonomy:
Recent, All, Product Catalog, Hero, Story block, Lifestyle, Food styling, Social,
Press/PR, Event, Brand asset. Each tab filters the asset pool by tag client-side
(whole set fetched once). Mock sample assets given usage tags so tabs populate in
mock mode; uploads now land in a neutral 'library' subfolder (tags drive placement,
not folders)."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1-2 min."
  echo "Test: Media hub -> tabs now read Recent / All / Product Catalog / Hero / ..."
} || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
