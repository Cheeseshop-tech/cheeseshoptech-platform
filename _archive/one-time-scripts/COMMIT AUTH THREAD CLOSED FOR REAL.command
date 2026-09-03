#!/bin/bash
# COMMIT AUTH THREAD CLOSED FOR REAL — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Security & Auth thread closed for real -- verified live"
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
  "CLAUDE_CODE_BRIEF.md" \
  "COMMIT AUTH THREAD REOPENED TEAM LEVEL VARS.command" \
  "COMMIT AUTH THREAD CLOSED FOR REAL.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: close Security & Auth thread for real -- verified live, add guardrail #8

Rick deleted PORTAL_PASSCODE, PORTAL_HOUSE_PASSCODE, PORTAL_ADMIN_PASSCODE, and VITE_AUTH_MODE
at the TEAM level (Team settings -> Environment variables -- separate from the project-level
page checked all night), from his phone, across two redeploy passes (VITE_AUTH_MODE didn't
delete on the first attempt).

Verified against the LIVE APP, not just the dashboard: admin.cheeseshoptech.com now shows the
real 'Sign in to your portal' email+password screen (RequireAuth/login-screen.jsx), not the
passcode screen. Confirmed with a genuinely new JS bundle hash on each redeploy, ruling out
cache. Real per-user Netlify Identity is now, for the first time, what's actually gating the
live app -- the invite-only registration, ken.cha0528 removal, and Stefano's invited account
(client/tenant:montitrentini) from earlier tonight are now the real, functioning front door,
not correctly-configured background setup sitting behind an unrelated passcode screen.

Added CLAUDE_CODE_BRIEF.md guardrail #8: Netlify env vars exist at two separate layers
(project-level and team-level/shared), on two different dashboard pages with no visual link.
Checking only one is not sufficient. Also note that the dashboard's own SPA can show stale
cached data mid-session -- when a change doesn't seem to have landed, hard-reload before
concluding it failed, and when it matters, verify against the live app directly rather than
trusting the dashboard alone."
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
