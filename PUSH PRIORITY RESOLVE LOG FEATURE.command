#!/bin/bash
# Double-click this file to push the "Mark resolved + lookback log" feature on the
# Priority — response needed card. You don't need to type anything — this window will
# do it and tell you when it's done. See docs/HANDOFF_2026-09-21_priority-resolve-and-log.md.
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
  echo "   Then live-verify per the handoff doc's Deploy steps section."
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
