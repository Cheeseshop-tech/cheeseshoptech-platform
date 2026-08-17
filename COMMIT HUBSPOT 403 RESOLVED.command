#!/bin/bash
# COMMIT HUBSPOT 403 RESOLVED — 2026-08-17
# Double-click to commit and push. Docs only, no code changes.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: HubSpot 403 — resolution + Netlify redeploy lesson"
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
  "docs/HANDOFF_2026-08-17_hubspot-403-root-cause.md" \
  "docs/HANDOFF_2026-08-16_crm-hubspot-close-out.md" \
  "COMMIT HUBSPOT 403 RESOLVED.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: HubSpot 403 RESOLVED — real cause was a Service Key, not a rogue credential

Booth->HubSpot sync confirmed live: contact 504097748710 updated in HubSpot, verified
independently via the HubSpot MCP connection.

The 'unidentified third credential' flagged as a security item in the prior handoff is
identified and benign: HUBSPOT_TOKEN was pointing at a HubSpot Service Key
('CheeseShop TECH Platform', id 42938322, created 2026-06-17) -- a credential system under
Development -> Keys -> Service Keys, entirely separate from Legacy Apps / Private Apps,
which is the only place this investigation (and the 2026-08-16 handoff) ever checked.
Rick found it himself by noticing the Service Keys list existed.

Fix: swapped HUBSPOT_TOKEN to the CheeseShop TECH Private App token, then manually
triggered a Netlify deploy. That second step was required and is the other correction in
this commit -- pasting a new env var value does NOT trigger a build; Netlify Functions
bake env vars in at publish time, confirmed via the live bundle hash changing and the
build log re-bundling crm-push.js. The 2026-08-16 handoff's 'HUBSPOT_TOKEN is read
per-request and does not [need a redeploy]' is corrected in place -- true of the code,
not of the platform.

Open, not urgent: two live 'CheeseShop TECH'-named credentials now exist (the Private App
and the original Service Key). Pick one going forward."
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
echo; echo "✅ Pushed. HubSpot 403 resolution is documented and on GitHub."; echo
read -n 1 -s -r -p "Press any key to close..."
