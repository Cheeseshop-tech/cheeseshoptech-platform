#!/bin/bash
# COMMIT DIALOG FIX — asset edit dialog now fits the screen (Save/Cancel always reachable).
# Commits AND pushes; Netlify auto-deploys.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit asset-dialog height fix ──"

rm -f .git/index.lock

git add -A src/components/media/media-hub.jsx

git commit -m "fix(media): asset edit dialog fits viewport (Save button reachable)

Cap the dialog at 88vh with internal scroll, and shrink the preview image while
editing (26vh) so the form + Save/Cancel footer stay on screen."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed — live in ~1-2 min." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
