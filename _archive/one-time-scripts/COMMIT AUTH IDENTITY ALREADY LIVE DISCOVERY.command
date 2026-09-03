#!/bin/bash
# COMMIT AUTH IDENTITY ALREADY LIVE DISCOVERY — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Roadmap correction — Netlify Identity was already live, not dormant"
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
  "COMMIT AUTH IDENTITY ALREADY LIVE DISCOVERY.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: correct roadmap -- Netlify Identity was already live, not dormant

Live-checked Netlify's Identity panel directly (not just docs/code) while debugging why
Rick kept getting 'all access no matter what browser.' Root cause: VITE_AUTH_MODE was never
actually set in Netlify, so src/App.jsx (const Gate = ... ? PasscodeGate : RequireAuth) has
been resolving to RequireAuth -- real per-user Identity -- this whole session, not the
passcode gate all of today's PORTAL_* env var work assumed was live.

Identity itself is NOT dormant: registration is already Invite only with email confirmation
required, and three real accounts exist, all created 2026-06-06 -- Rick (admin/owner), a
Richard/sales@montitrentini-usa.com test account (tenant:montitrentini), and one unexplained
admin-role account, ken.cha0528@gmail.com, not referenced anywhere in this project's docs or
memory. Flagged to Rick directly rather than assumed benign.

This reframes the remaining work from an 11-step 'enable everything' checklist down to three
items: identify/remove the unknown account, invite Stefano with role client+tenant:
montitrentini, and leave VITE_AUTH_MODE unset (that's what's correctly keeping the app on
real Identity rather than the weaker passcode fallback). The PORTAL_HOUSE_PASSCODE /
PORTAL_PASSCODE work done earlier today was real and correctly built, just currently inert.

Also flagged, unresolved: the original 8/13 incident narrative ('shared the house passcode
with Stefano') doesn't cleanly square with Identity having been the active gate since June --
left as an open question for Rick rather than silently reconciled.

UPDATE same session: Rick did not recognize ken.cha0528@gmail.com (a web search for the exact
address/username turned up nothing useful either -- personal Gmail addresses don't have a public
footprint) and deleted the account via Identity -> Users. That closes the unexplained-admin item.
The one remaining step on this thread is inviting Stefano (stefano@montitrentini-usa.com) via
Identity -> Invite users, role client + tenant:montitrentini once he accepts."
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
