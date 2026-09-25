#!/bin/bash
# DEPLOY TO STAGING — double-click to push committed work to GitHub.
# Netlify auto-deploys the phase-2-6-build branch to cheeseshoptech-platform.netlify.app.

cd "$(dirname "$0")" || exit 1

# Never let git open a pager here. With more than a screenful of commits, `git log` pipes to
# `less` and parks this script waiting for a keypress, in a window that gives no sign it is
# waiting — it just looks like the deploy hung. (Hit on 2026-09-26 with 15 commits queued.)
export GIT_PAGER=cat
export PAGER=cat

echo "── CheeseShop TECH · deploy to staging ────────────────────"
echo "Commits about to go live:"
git --no-pager log origin/phase-2-6-build..HEAD --oneline | cat
echo ""
git push origin phase-2-6-build && {
  echo ""
  echo "Pushed. Netlify is building — live in ~1–2 min at:"
  echo "https://cheeseshoptech-platform.netlify.app/?client=montitrentini"
} || echo "Push failed — ask Claude for help."
echo ""
read -r -p "Press Return to close…"
