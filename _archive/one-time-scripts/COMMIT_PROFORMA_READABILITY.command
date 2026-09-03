#!/bin/bash
# Double-click to commit + push the Pro Forma readability fix (self-healing).
# 1) Clears any stale .git/index.lock left by a sandbox/crashed git process
# 2) Stages everything, commits, pushes (triggers the Netlify deploy)
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

if [ -f .git/index.lock ]; then
  rm -f .git/index.lock && echo "Removed stale .git/index.lock" || echo "Could not remove lock — run: sudo rm '.git/index.lock'"
fi

echo "Staging changes..."
git add -A
echo "Committing..."
git commit -m "Pricing tool: darken Pro Forma print text to #333/#1f1f1f, print-color-adjust:exact, rename tab to 'Pro Forma'; land staged backlog"
echo
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. Netlify is building — live in ~1-2 min. Then reprint the Pro Forma."
else
  echo "Push failed (status $status). If it asks for a GitHub login, sign in and run again."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
