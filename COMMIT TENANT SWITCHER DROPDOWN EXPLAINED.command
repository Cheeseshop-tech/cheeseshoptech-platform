#!/bin/bash
# COMMIT TENANT SWITCHER DROPDOWN EXPLAINED — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Roadmap update — 'MT admin password / CST tools dropdown' report closed"
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
  "COMMIT TENANT SWITCHER DROPDOWN EXPLAINED.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: explain and close the 'MT admin password, still full CST admin access' report

Rick logged in expecting to test as a restricted Monti Trentini admin and still saw full CST
admin tools through a dropdown selector. Traced it: that dropdown is the tenant switcher in
src/App.jsx (~line 153), a <select> gated only by RoleGate roles=[\"admin\"], independent of
which tenant/client URL is open -- by design, so CST staff can preview any tenant
(canAccessTenant() in src/lib/auth.js gives admins access to every tenant on purpose).

Confirmed login-screen.jsx is real email + password only in production -- there is no passcode
field live anywhere (PasscodeGate stays dead code, per the VITE_AUTH_MODE finding earlier
today). So whatever Rick believed he entered as 'the MT admin password' could not have been
processed as a distinct MT-admin identity -- what actually granted the access was his own
already-remembered rick.posada@outlook.com owner session, the same 'logs in from memory'
browser behavior flagged earlier this session. An owner session will always show the tenant
switcher and admin tools, regardless of tenant URL -- that's correct behavior for an owner
account, not a leak.

No code or config fix needed. Closed as a testing-method issue: to see what a genuinely
restricted user (Stefano, or a real MT client-admin) would see, sign out fully first (LogOut
icon, top-right, next to the tenant switcher) before testing -- a lingering owner session
outranks any other input every time."
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
