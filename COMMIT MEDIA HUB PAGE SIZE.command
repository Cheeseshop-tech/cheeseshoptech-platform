#!/bin/bash
# COMMIT MEDIA HUB PAGE SIZE — first paint = 12 tiles, 50 per "Load more"
# Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Media Hub page size (12 / 50)"
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
  "src/components/media/media-hub.jsx" \
  "docs/BUILD_LOG.md" \
  "COMMIT MEDIA HUB PAGE SIZE.command"
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
git commit -m "perf(media-hub): first paint = 12 tiles, 50 per Load more

- INITIAL_PAGE=12 for the fastest possible page-open (was 30)
- PAGE=50 for every subsequent Load more click (fewer round trips once interactive)
- fetch effect's maxResults now tracks the same 12/50 split so Load more never
  waits on a bigger fetch than it needs"
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
echo "✅ Pushed. Media Hub page size fix is on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
