#!/bin/bash
# DEPLOY TO STAGING — double-click to push committed work to GitHub.
# Netlify auto-deploys the phase-2-6-build branch to cheeseshoptech-platform.netlify.app.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · deploy to staging ────────────────────"
echo "Commits about to go live:"
git log origin/phase-2-6-build..HEAD --oneline
echo ""
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1–2 min at:"
  echo "https://cheeseshoptech-platform.netlify.app/?client=montitrentini"
} || echo "Push failed — ask Claude for help."
echo ""
read -r -p "Press Return to close…"
