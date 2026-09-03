#!/bin/bash
# COMMIT HUBSPOT 403 ROOT CAUSE — 2026-08-17
# Double-click to commit and push. Docs only, no code changes.
#
# NOTE: "FIX GIT LOCK AND PUSH.command" only runs `git push`. It does NOT add or commit,
# so it reports "Everything up-to-date" and exits clean when nothing is staged. Use THIS
# file to actually land these docs.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: HubSpot 403 root cause (docs only)"
echo "=============================================="
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "docs/HANDOFF_2026-08-17_hubspot-403-root-cause.md" \
  "docs/HANDOFF_2026-08-16_crm-hubspot-close-out.md" \
  "COMMIT HUBSPOT 403 ROOT CAUSE.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: root-cause the booth->HubSpot 403 — wrong app's token, not a missing scope

The 2026-08-16 handoff blamed a missing crm.objects.contacts.write scope. That was our
own hardcoded hint string, not HubSpot's diagnosis. Captured the raw response from a real
commit: category MISSING_SCOPES, requiredScopes null.

Portal 246062426 has exactly TWO private apps and BOTH already carry contacts.write and
companies.write:
  - Timely-Needle (unrelated app)        41408674  pat-na2-eb78c
  - CheeseShop TECH (renamed from
    'CheeseShop TECH-read-only')         44465792  pat-na2-eab5f

Neither matches the pat-na2-2aed1d25 fingerprint recorded for the production token, and
neither logs any API calls. So HUBSPOT_TOKEN authenticates as a third, unidentified
credential with read but not write access. Fix is swapping the env var, not adding scopes.

Two bugs kept this hidden:
  - crm-push.js appends 'Add the scope on the SAME private app...' to EVERY 403
  - booth-tool.jsx renders only res.hint / res.requiredScopes, dropping res.error and
    res.category, so HubSpot's own sentence never reached the screen

- docs/HANDOFF_2026-08-17_hubspot-403-root-cause.md — new, full evidence + actions
- docs/HANDOFF_2026-08-16_crm-hubspot-close-out.md — 4.1 marked SUPERSEDED

Open: identify and revoke the unknown third credential (full CRM read)."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   Check your connection, then re-run this file to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. HubSpot 403 root-cause docs are on GitHub."
echo
read -n 1 -s -r -p "Press any key to close..."
