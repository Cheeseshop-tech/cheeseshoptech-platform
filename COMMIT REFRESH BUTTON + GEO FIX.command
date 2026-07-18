#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add \
  src/components/home/agency-console.jsx \
  netlify/functions/_write-log.js \
  docs/BUILD_LOG.md \
  "COMMIT REFRESH BUTTON + GEO FIX.command"

echo "Committing..."
git commit -m "feat(auth): animated Refresh button + fix blank city/state in Access log

Refresh button on the Access log panel now spins on click and flashes green ('Updated') for a
beat once fresh data lands, instead of silently swapping the table underneath you.

Also fixes why city/state was blank for every logged attempt: callerIp() returned the raw
x-forwarded-for header verbatim, which is often a comma-separated proxy chain rather than a
single IP -- ipwho.is flatly 404s on a multi-IP string. Now takes just the first (client) IP.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Netlify will redeploy automatically."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
