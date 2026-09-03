#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add -u "COMMIT APP HEALTH REVIEW.command"
git add "COMMIT CLEANUP.command"

echo "Committing..."
git commit -m "chore: remove superseded COMMIT APP HEALTH REVIEW.command

Folded into COMMIT MONITORING.command's file list and already committed via that script.
Rick approved removing the now-redundant standalone copy.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
