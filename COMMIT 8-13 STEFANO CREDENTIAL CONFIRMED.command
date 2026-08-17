#!/bin/bash
# COMMIT 8-13 STEFANO CREDENTIAL CONFIRMED — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Roadmap update — 8/13 Stefano credential confirmed + passcode vars removed"
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
  "COMMIT TENANT SWITCHER DROPDOWN EXPLAINED.command" \
  "COMMIT 8-13 STEFANO CREDENTIAL CONFIRMED.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: close the 8/13 Stefano-credential question + record passcode var removal

Two closures on the auth thread tonight:

1. Rick deleted all three dead passcode env vars from Netlify (PORTAL_PASSCODE,
   PORTAL_HOUSE_PASSCODE, PORTAL_ADMIN_PASSCODE_MONTITRENTINI) via Options -> Delete on each,
   then triggered a manual redeploy. Verified directly: redeploy (683cdcf) published clean in
   47s, and the env vars page filtered to 'PORTAL' now returns zero results. The passcode
   system isn't just inert anymore -- it no longer exists as configuration.

2. Rick confirmed the credential he gave Stefano on 8/13 was the CheeseShop TECH house
   passcode (PORTAL_HOUSE_PASSCODE), never his own real Netlify Identity email+password.
   That closes the open question flagged earlier today about what Stefano actually received --
   Rick's own real account was never shared, and the passcode he was given is now provably
   dead (deleted, not just unused). Whether that passcode ever functioned as a real login given
   PasscodeGate has been dead code since June is left as an open historical curiosity, not a
   blocker.

Also explains and closes the 'logged in with the MT admin password, still had full CST admin
tools via the dropdown' report from earlier this evening -- traced to the tenant switcher in
App.jsx (~line 153, RoleGate roles=[\"admin\"]) correctly reflecting Rick's own real owner
session, not a bug. No code fix needed there, just a testing-method note (sign out fully
before testing what a restricted user would see).

Remaining real step, unchanged: invite Stefano to real Identity."
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
