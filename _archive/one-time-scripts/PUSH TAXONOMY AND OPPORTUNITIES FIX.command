#!/bin/bash
# Double-click this file to push the 6-category buyer taxonomy (Distributor partner /
# Supermarkets / Cheese shops / Deli-sandwich shop / Food service / Independent specialty
# markets), the Opportunities-card dedupe fix, and today's data refreshes.
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Pushing 3 commits to GitHub (this is what makes Netlify deploy the change)…"
echo

# Self-heal any stranded sandbox lock first (harmless if none exist).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git push origin phase-2-6-build
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building now — live in ~1–2 minutes."
  echo "   Check: https://app.netlify.com/sites/cheeseshoptech-platform/deploys"
  echo
  echo "IMPORTANT — one more step once the deploy finishes:"
  echo "the live signal data was temporarily rolled back to the OLD 3-category tags"
  echo "(distributor/retail/foodservice) so the Opportunities card wouldn't go empty"
  echo "while the old code was still live. After this deploy is done, ask Claude to"
  echo "re-publish src/data/montitrentini/signals.json (the new-taxonomy version) so"
  echo "the live data matches the new code again."
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
