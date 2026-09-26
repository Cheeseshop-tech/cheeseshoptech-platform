#!/bin/bash
# DEPLOY TO STAGING — double-click to push committed work to GitHub.
# Netlify auto-deploys the phase-2-6-build branch to cheeseshoptech-platform.netlify.app.

cd "$(dirname "$0")" || exit 1

# Never let git open a pager here. With more than a screenful of commits, `git log` pipes to
# `less` and parks this script waiting for a keypress, in a window that gives no sign it is
# waiting — it just looks like the deploy hung. (Hit on 2026-09-26 with 15 commits queued.)
export GIT_PAGER=cat
export PAGER=cat

BRANCH=phase-2-6-build

echo "── CheeseShop TECH · deploy to staging ────────────────────"
echo ""

# --- Preflight 1: is there anything to push? -------------------------------------------------
#
# `git push` with nothing to send prints "Everything up-to-date" and EXITS 0. The old version of
# this script treated that exit code as success and announced "Pushed. Netlify is building",
# which is indistinguishable from a real deploy. On 2026-09-25 that cost an hour: the commit
# button had silently not run, deploy reported success, and the work sat uncommitted while
# everyone believed it was live. Count the commits instead of trusting the exit code.
AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null)

# --- Preflight 2: is work sitting uncommitted? -----------------------------------------------
#
# This script only ever pushes COMMITTED work. Modified-but-uncommitted files are invisible to
# it, so without this check a dirty tree deploys nothing and looks like it deployed everything.
DIRTY=$(git status --porcelain --untracked-files=no)

if [ -n "$DIRTY" ]; then
  echo "  ⚠ UNCOMMITTED CHANGES — these will NOT be deployed:"
  echo ""
  git --no-pager status -s --untracked-files=no | sed 's/^/      /' | cat
  echo ""
  echo "  Run the matching COMMIT <FEATURE>.command first if these were meant to ship."
  echo ""
fi

if [ "$AHEAD" = "0" ] || [ -z "$AHEAD" ]; then
  echo "  NOTHING TO PUSH. HEAD is level with origin/$BRANCH."
  echo ""
  if [ -n "$DIRTY" ]; then
    echo "  You have uncommitted work (listed above) but zero commits queued."
    echo "  That means the commit step did not run. Nothing has been deployed."
  else
    echo "  Working tree is clean and everything is already on origin."
    echo "  Whatever you are looking for is either already live, or was never committed."
  fi
  echo ""
  read -r -p "Press Return to close…"
  exit 0
fi

echo "  $AHEAD commit(s) about to go live:"
echo ""
git --no-pager log "origin/$BRANCH..HEAD" --oneline | sed 's/^/      /' | cat
echo ""

if git push origin "$BRANCH"; then
  echo ""
  echo "  Pushed $AHEAD commit(s). Netlify is building — live in ~1–2 min at:"
  echo "  https://cheeseshoptech-platform.netlify.app/?client=montitrentini"
  if [ -n "$DIRTY" ]; then
    echo ""
    echo "  ⚠ Reminder: the uncommitted files listed at the top did NOT go with it."
  fi
else
  echo ""
  echo "  PUSH FAILED — read the error above. Nothing was deployed."
  echo "  Ask Claude for help; do not re-run blindly."
fi

echo ""
read -r -p "Press Return to close…"
