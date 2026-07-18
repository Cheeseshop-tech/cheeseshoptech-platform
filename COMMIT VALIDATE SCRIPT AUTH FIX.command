#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add scripts/validate-images.mjs scripts/sync-images.mjs docs/BUILD_LOG.md "COMMIT VALIDATE SCRIPT AUTH FIX.command"

echo "Committing..."
git commit -m "fix(scripts): send portal passcode header on live media-list reads

sync-images.mjs --live and validate-images.mjs both called media-list.js
with no auth header. That endpoint has required x-portal-passcode on every
read since the 2026-07-16 wiring-audit P0 #1 fix; neither script was
updated, so both have silently 401'd for two days. Both now read
PORTAL_PASSCODE from the environment and send it as x-portal-passcode.

Also logs the first live validate:images run (312 assets scanned, 41
qualifying, all missing bg-removed, 78 item#-without-tag, 20 tag-without-
item#, 8 duplicate item numbers) in docs/BUILD_LOG.md."

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Validate-script auth fix is on GitHub."
    echo "   Netlify will deploy it automatically."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
