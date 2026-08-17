#!/bin/bash
# COMMIT BOOTH ERROR SURFACING — 2026-08-17
# Double-click to commit and push.
#
# CODE CHANGE — run `npm run build` in Claude Code (NOT the Cowork sandbox, where node_modules
# is Linux-only and a build is only a smoke test) before trusting this in production.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Booth — surface HubSpot's real error"
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
  "src/components/tools/booth-tool.jsx" \
  "COMMIT BOOTH ERROR SURFACING.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "fix(booth): show HubSpot's actual error, not our hardcoded scope guess

The sync failure branch rendered only res.hint, which crm-push.js builds by appending
'Add the scope on the SAME private app...' to EVERY 403 unconditionally. res.error and
res.category were returned by crm-push and passed through by booth.js, then dropped here.

Result: three sessions spent adding scopes that were already present, while the real cause
was HUBSPOT_TOKEN belonging to an unidentified third private app. See
docs/HANDOFF_2026-08-17_hubspot-403-root-cause.md.

Now shows, in order: HubSpot's verbatim message, the error category, the failing endpoint,
and a scope line ONLY when HubSpot actually names scopes. A MISSING_SCOPES category with a
null scope list now tells the reader to verify WHICH private app the token belongs to,
instead of asserting a missing scope."
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
echo; echo "✅ Pushed. Remember: run npm run build in Claude Code to verify."; echo
read -n 1 -s -r -p "Press any key to close..."
