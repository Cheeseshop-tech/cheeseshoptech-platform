#!/bin/bash
# Double-click to commit + push: read endpoints now require a passcode (wiring-audit P0 #1 + #3).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock && echo "Cleared stale .git/HEAD.lock"

# git add -A on the specific paths stages modifications AND the crm.js deletion in one pass.
git add -A \
  "netlify/functions/_write-guard.js" \
  "netlify/functions/crm-hubspot.js" \
  "netlify/functions/crm-summary.js" \
  "netlify/functions/items-get.js" \
  "netlify/functions/media-list.js" \
  "netlify/functions/inventory.js" \
  "netlify/functions/history.js" \
  "netlify/functions/crm.js" \
  "src/lib/crm.js" \
  "src/lib/media.js" \
  "src/lib/items.js" \
  "src/lib/pricing.js" \
  "src/lib/history.js" \
  "src/components/crm/crm-page.jsx" \
  "src/components/home/agency-console.jsx" \
  "src/components/media/media-hub.jsx" \
  "docs/WIRING_AUDIT_2026-07-15.md" \
  "docs/BUILD_LOG.md" \
  "docs/AUTH_AND_ROLES.md" \
  "docs/PROPOSAL_BUYER_EMAIL_GATE_SPEC.md" \
  "COMMIT READ ENDPOINT GUARD.command"

git commit -m "security: read endpoints now require a passcode (wiring-audit P0 #1 + #3)

- New requireReadAuth() in _write-guard.js: same model as the 2026-07-06 write
  guard, but reads also accept the base client tier (PORTAL_PASSCODE). Tiers
  mirror gate.js exactly; returns admin | client-admin | client.
- Guarded: crm-hubspot, crm-summary, items-get, media-list, inventory (after
  the OPTIONS branch, x-portal-passcode added to CORS), and history GET + POST.
  history POST now also logs itself via logWrite() per the BUILD_LOG standing rule.
- Deleted netlify/functions/crm.js (dead Make proxy, P0 #3) and its dead
  fallback branch in src/lib/crm.js — non-mock CRM always means crm-hubspot now.
- Frontend reads replay the unlock passcode via writeAuthHeader(): media.js,
  items.js, pricing.js, history.js, crm.js, crm-page, agency-console.
- 401s surface the sign-out/re-enter-passcode fix (RELOGIN_MSG) instead of
  empty data; buyer proposal links degrade to catalog names, never break.

OPERATOR NOTE: browsers unlocked BEFORE this deploy have no stashed passcode -
their reads 401 until the user signs out and re-enters the passcode."
commit_status=$?
if [ $commit_status -ne 0 ]; then
  echo
  echo "⚠️  Commit failed (status $commit_status) — nothing pushed. Fix and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

echo
echo "Pushing (triggers Netlify deploy)…"
git push
push_status=$?
echo
if [ $push_status -eq 0 ]; then
  head_now=$(git rev-parse HEAD)
  remote_now=$(git rev-parse origin/phase-2-6-build 2>/dev/null)
  if [ "$head_now" = "$remote_now" ]; then
    echo "✅ Committed and pushed — HEAD matches origin/phase-2-6-build ($head_now)."
    echo "   Reminder: every already-unlocked browser must sign out and re-enter its passcode."
  else
    echo "⚠️  git push exited 0 but HEAD ($head_now) != origin ($remote_now). Check manually."
  fi
else
  echo "⚠️  Push failed (status $push_status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
