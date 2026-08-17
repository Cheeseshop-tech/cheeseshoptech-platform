#!/bin/bash
# COMMIT STEFANO INVITED AUTH THREAD CLOSED — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Security & Auth upgrade thread fully closed"
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
  "COMMIT 8-13 STEFANO CREDENTIAL CONFIRMED.command" \
  "COMMIT STEFANO INVITED AUTH THREAD CLOSED.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: close the Security & Auth upgrade thread -- Stefano invited for real

Stefano invited to real Netlify Identity (stefano@montitrentini-usa.com), accepted, and
confirmed with role client / tenant:montitrentini on his Identity user page. First save
attempt only persisted his Name field (the Roles combobox needs each role confirmed as a
chip -- Enter after typing -- before Save); redone and verified correct.

That was the last open item on this thread. Recapping everything closed today: Identity
was already live and invite-only (never dormant, VITE_AUTH_MODE was never set); the unknown
ken.cha0528@gmail.com admin account was found and removed; the 'MT admin password, still
full CST admin tools via the dropdown' report was traced to Rick's own real owner session
(App.jsx's tenant switcher, RoleGate roles=[\"admin\"]) working as designed, not a bug; all
three dead PORTAL_* passcode env vars were deleted from Netlify and redeployed, confirmed
gone; and Rick confirmed the 8/13 credential given to Stefano was that now-dead passcode,
never his own real login.

Security & Auth upgrade moves from priority thread #1 to Live."
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
