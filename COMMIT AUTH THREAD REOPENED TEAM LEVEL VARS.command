#!/bin/bash
# COMMIT AUTH THREAD REOPENED TEAM LEVEL VARS — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Auth thread reopened -- team-level env vars were never checked"
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
  "COMMIT AUTH THREAD REOPENED TEAM LEVEL VARS.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: reopen Security & Auth thread -- missed Netlify's team-level env vars

Major correction. Everything documented earlier tonight about Identity being the live gate
since June was based on checking only the PROJECT-level Netlify env vars page
(cheeseshoptech-platform -> Environment variables). Netlify also has a separate TEAM-level
(shared, cross-project) set of env vars at Team settings -> Environment variables, never
checked. It has its own PORTAL_PASSCODE / PORTAL_HOUSE_PASSCODE / PORTAL_ADMIN_PASSCODE, and
VITE_AUTH_MODE set to 'passcode', last updated 2 months ago.

Found by testing live rather than trusting the dashboard: loading admin.cheeseshoptech.com
directly showed the real passcode-entry screen, which should have been impossible if
VITE_AUTH_MODE were truly unset. PasscodeGate has been the actual live gate this whole time,
not RequireAuth.

Practical effect: the three PORTAL_* vars deleted from the project level earlier tonight were
shadow copies only. The team-level ones -- the real ones -- were never touched, so the house
passcode originally given to Stefano on 8/13 may still work right now. The Identity work done
tonight (invite-only confirmed, ken.cha0528 removed, Stefano invited with role
client/tenant:montitrentini) is all still real and correctly configured, it just hasn't been
what's actually gating access.

Remaining real steps: delete the three PORTAL_* vars at the TEAM level too, resolve
VITE_AUTH_MODE there (delete or set to identity) so RequireAuth actually becomes live, redeploy,
then re-verify by loading admin.cheeseshoptech.com directly rather than trusting the dashboard
alone. Not yet done -- Rick was away from his computer when this was found. Not urgent enough
to rush from a phone (Stefano is a known, cooperative contact, not an active threat)."
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
