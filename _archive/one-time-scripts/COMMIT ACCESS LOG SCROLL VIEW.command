#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add \
  src/components/home/agency-console.jsx \
  docs/BUILD_LOG.md \
  "COMMIT ACCESS LOG SCROLL VIEW.command"

echo "Committing..."
git commit -m "feat(auth): Access log panel — scrollable 10-row window + full-screen expand

Compact view now sits in a fixed-height scroll window (~10 rows) instead of growing the
console page taller as logins accumulate. New Expand button opens the same table in a
near-full-screen dialog for scanning the whole recorded window at once. Newest-first was
already correct server-side; both views now share one table render path.

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
