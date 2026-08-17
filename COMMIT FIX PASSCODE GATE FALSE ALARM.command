#!/bin/bash
# COMMIT FIX PASSCODE GATE FALSE ALARM — 2026-08-17
# Double-click to commit and push.
#
# REAL CODE CHANGE — Agency Console UI only. Netlify will auto-build and redeploy on push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: fix the permanent red 'Passcode gate' false alarm"
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
  "src/components/home/agency-console.jsx" \
  "COMMIT FIX PASSCODE GATE FALSE ALARM.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "fix(agency-console): stop the Integration Health panel's permanent red passcode alarm

Rick noticed: 'Passcode gate' showed a red ENV MISSING flag on the Agency Console. Real
cause: that check POSTed an empty passcode to gate.js and read its status code -- 500 meant
'env var missing.' Since the passcode env vars were deliberately deleted today (real
Identity replaced passcode auth, see docs/HANDOFF_2026-08-17_identity-write-guard-fix.md),
gate.js will 500 forever now. The row was alarming on a subsystem that's SUPPOSED to be
off.

Renamed to 'Auth (Identity)' and pointed the check at Netlify's public Identity settings
endpoint instead (no auth needed, same presence-only posture as every other probe on this
panel) -- the thing that's actually live now. Also fixed the HubSpot CRM row's stale
're-enter passcode' copy to 'sign in' -- same root cause, different row."
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
echo "✅ Pushed. Netlify will auto-build and redeploy from this push."
echo
read -n 1 -s -r -p "Press any key to close..."
