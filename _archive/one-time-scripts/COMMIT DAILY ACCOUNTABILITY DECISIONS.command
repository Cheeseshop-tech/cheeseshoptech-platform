#!/bin/bash
# COMMIT DAILY ACCOUNTABILITY DECISIONS — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: lock in today's accountability-system decisions"
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
  "COMMIT DAILY ACCOUNTABILITY DECISIONS.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: lock in daily-accountability decisions -- send time + next build thread

Rick made two decisions this evening on the accountability system built earlier today:
daily email send time = 7:00 AM local (once the send account is connected), and the next
active build thread = the in-app Progress/Onboarding tab (over Scale-to-10's pricing
decision and Ecommerce Phase 2). Progress tab promoted from 'spec'd, not built' to active
build in the roadmap. Also documents the visual status page (cst-project-status.html) sent
and persisted as a Cowork artifact this evening -- the immediate 'visible map' deliverable
and a live preview of what the in-app tab should look like.

Daily email itself is still blocked on Rick connecting a real CheeseShop TECH mailbox
(hello@cheeseshoptech.com) via Settings -> Connectors -- confirmed unchanged (still
sales@montitrentini-usa.com) as of this evening's check."
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
echo "✅ Pushed. Doc-only change -- no rebuild needed."
echo
read -n 1 -s -r -p "Press any key to close..."
