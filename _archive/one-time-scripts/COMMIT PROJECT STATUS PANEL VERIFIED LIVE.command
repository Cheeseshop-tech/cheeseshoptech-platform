#!/bin/bash
# COMMIT PROJECT STATUS PANEL VERIFIED LIVE — 2026-08-17
# Double-click to commit and push.
#
# DOCS ONLY — no app code changes. Records that the new House Command Center "Project status"
# panel (commit 6446101) was live-verified via browser, and locks in the on-demand-update sync
# routine (roadmap doc -> project-status.js -> build -> live-verify -> then send the update).

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: project status panel verified live + on-demand update sync routine"
echo "=============================================="
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "docs/PROJECT_ROADMAP.md" \
  "docs/BUILD_LOG.md" \
  "COMMIT PROJECT STATUS PANEL VERIFIED LIVE.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: confirm House Command Center project status panel live + lock sync routine

Live-verified via Claude-in-Chrome (not just a green Netlify deploy): commit 6446101 published,
the 'CheeseShop TECH -- project status' panel renders on cheeseshoptech.com's Agency Console
with all four threads, correct status badges, next-action text, and the on-the-radar callout.
Auth (Identity) integration-health row also confirmed showing its renamed label live.

Also records the routine for future on-demand updates (Rick prompting 'send the update'):
check what changed -> update PROJECT_ROADMAP.md -> sync project-status.js by hand -> build +
COMMIT script if code changed -> live-verify -> only then compose/send the update, so the
in-app panel and the emailed status never disagree."
if [ $? -ne 0 ]; then
  echo; echo "❌ COMMIT FAILED (or nothing to commit)."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo; echo "❌ PUSH FAILED — commit exists locally but did NOT reach GitHub."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo
echo "✅ Pushed. (Docs only -- no rebuild needed, but Netlify will still redeploy from the push.)"
echo
read -n 1 -s -r -p "Press any key to close..."
