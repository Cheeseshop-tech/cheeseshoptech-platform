#!/bin/bash
# Double-click this file to push the story-block targeting narrowing (why-trentino,
# sustainability, retail-partnership now point at the specific retail sub-categories that
# actually fit each angle, instead of all four identically).
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Pushing to GitHub (this is what makes Netlify deploy the change)…"
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
  echo "No signals republish needed for this one — story blocks live in brand-kit.json,"
  echo "which only takes effect through this deploy, not the live-signal publish path."
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
