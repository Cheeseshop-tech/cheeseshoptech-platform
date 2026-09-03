#!/bin/bash
# COMMIT ACE FALL SHOW BOOTH INTEGRATION — 2026-09-01
# Double-click to commit and push.
#
# CODE CHANGE — run `npm run build` in Claude Code (NOT the Cowork sandbox, where node_modules
# is Linux-only and a build is only a smoke test) before trusting this in production.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: ACE Fall Show — territory scope, Rep field, Rep check-in"
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
  "src/lib/booth.js" \
  "netlify/functions/crm-outreach.js" \
  "COMMIT ACE FALL SHOW BOOTH INTEGRATION.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "feat(booth): campaign-aware territory scope, Rep field, Rep check-in flow

Three pieces from HANDOFF_2026-09-01_ace-fall-show-booth-integration.md, built in the
dependency order the handoff itself recommends:

1. TERRITORY SCOPE (booth-tool.jsx). Booth's region/state/city drill-down used to browse the
   whole national account book with no filter. It now reads live campaigns via the existing
   getCampaigns/scopeOf/segmentOf (lib/campaigns.js) and offers a Scope picker above the
   drill-down — auto-defaulting to whichever campaign's name matches /ace|fall show/i, falling
   back to the whole book everywhere else. Opt-in and additive: a tenant/campaign with no match
   sees no picker and no change in behavior.

2. REP FIELD (crm-outreach.js, booth-tool.jsx). Confirmed first that Booth's lead taxonomy has
   no rep-shaped slot (dsr/broker are contact ROLES for the buyer, not an internal rep
   assignment) — so this is additive, not a duplicate. Added a free-text Rep field to each
   account row in Territory Mode, riding the same outreach overlay the CRM console already uses
   for its note column (crm-outreach.js now whitelists `rep`, bounded to 80 chars, same
   last-writer-wins posture as `note`). Debounced save, optimistic UI.

3. REP CHECK-IN FLOW (booth-tool.jsx, booth.js). New 'Rep check-in' mode: card scan or manual
   entry -> tap which states they cover -> tap the specific accounts they cover (writes live to
   that account's new Rep field) -> a running summary -> 'Save & draft follow-up' opens a
   pre-filled ride-along email (buildRideAlong/rideAlongComposeUrl in booth.js, same
   identity-aware Gmail-compose pattern as the existing buyer recap) and runs a dry-run HubSpot
   preview. One screen, no navigation. Card OCR here deliberately skips CRM/company matching —
   the contact is a visiting rep, not one of our accounts, so there's nothing to match against.
   Persists through the same addCapture/updateCapture path as every other capture, so it rides
   Captured, the offline-retry sweep, and Sync for free — no second sync path.

Known scope cut: if a check-in card is shot offline and resolves later via the background
retry sweep while that same check-in screen is still open, the persisted record can pick up a
stray companyId from the sweep's generic CRM-matching patch (the live UI itself is guarded
against this — see syncCheckin in the sweep effect — but the underlying persisted write isn't).
Narrow edge case (needs offline-at-scan AND the screen still open when it resolves); not fixed
in this pass.

Verified in local dev (npm run build clean; clicked through territory scope switching, Rep
field save/error states, and the full check-in flow — name -> state -> link account -> Save &
draft — against temporary mock CRM data, reverted before commit). Not yet verified against the
live app / real HubSpot data — that needs Rick's own sign-in, same friction noted in the
handoff."
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
