#!/bin/bash
# Double-click to commit + push: HANDOFF note for the House-admin login diagnosis (2026-07-13).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add "HANDOFF.md"

git commit -m "docs(handoff): House-admin login diagnosis — Media Hub / Content Engine not visible

Not a bug. Site runs in passcode mode (VITE_AUTH_MODE=passcode); Media Hub and Content Engine
are admin-gated (NAV tools -> [admin]; Media Hub is a card inside Content Engine for admins,
not a sidebar tab). Two causes: (1) a stale 'client' unlock persists in localStorage
['cs-portal-unlocked'] and is never re-prompted, so /?app=1 renders as client with Content
Engine + tenant switcher hidden — only the House passcode (PORTAL_HOUSE_PASSCODE) returns admin;
(2) Media Hub has no admin sidebar tab by design (2026-07-02 reorg).

FIX (procedure, no code change): sign out (clears the unlock) -> cheeseshoptech.com/?app=1 ->
enter House passcode -> Content Engine -> Media Hub card. Shortcut: localStorage.clear() in
console, reload /?app=1. If Content Engine still absent, verify PORTAL_HOUSE_PASSCODE is set in
the Netlify site's env."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. (Docs-only change — no functional deploy impact.)"
else
  echo "⚠️  Push failed (status $status). If it mentions a lock, run FIX GIT LOCK AND PUSH.command."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
