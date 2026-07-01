#!/bin/bash
# Double-click to fix the stuck git lock and push to deploy.
# 1) Removes the stale .git/index.lock that blocks all commits
# 2) Pushes committed work to GitHub (triggers the Netlify build)
cd "$(dirname "$0")" || exit 1

if [ -f .git/index.lock ]; then
  # Only safe because no git process is running; the lock is a leftover from a crashed one.
  rm -f .git/index.lock && echo "✅ Removed stale .git/index.lock" || { echo "⚠️  Could not remove lock — run: sudo rm .git/index.lock"; }
else
  echo "No lock file present — already clean."
fi

echo
echo "Pushing committed changes to GitHub (this triggers a Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
else
  echo "⚠️  Push failed (status $status). If it asks for GitHub login, sign in and run again."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
