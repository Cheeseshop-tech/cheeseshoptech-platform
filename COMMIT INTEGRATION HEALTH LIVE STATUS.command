#!/bin/bash
# COMMIT INTEGRATION HEALTH LIVE STATUS — Integration health panel gets real Test buttons for
# Media/Pricing/Storefront/Campaigns (not just a build-flag badge), + closes a found auth gap
# in store.js/campaigns.js. Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Integration health — live status"
echo "=============================================="
echo
read -n 1 -s -r -p "Press any key to continue, or Ctrl-C to cancel..."
echo
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock .git/objects/maintenance.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "src/components/home/agency-console.jsx" \
  "netlify/functions/store.js" \
  "netlify/functions/campaigns.js" \
  "docs/BUILD_LOG.md" \
  "COMMIT INTEGRATION HEALTH LIVE STATUS.command"
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
git commit -m "Integration health: real Test buttons, not just build-flag badges

The panel looked like it tested things but 5 of 7 rows only checked whether a
build-time flag literally equaled 'mock' -- a dead token or missing secret
still showed green. Same false-positive class as the passcode gate's false-red
alarm fixed 2026-08-17, just inverted.

Added a real Test button + probe for the 4 seams with an actual backend
function: Media, Pricing, Storefront, Campaigns -- one shared SEAM_PINGS map +
SeamStatusBadge renderer instead of copy-pasting pingCrm/pingGate's JSX four
more times. Market signals/Market news have no backend at all yet, so their
badge is unchanged -- nothing to probe. Dropped the redundant static 'CRM' row
that sat next to the already-live-tested HubSpot row (could disagree with it);
its one useful note moved into the HubSpot row.

Found along the way: store.js and campaigns.js had NO auth guard at all --
every other read function got requireReadAuth in the 2026-08-17 write-guard
migration, these two were missed. Harmless today (Shopify/Make aren't
configured) but would have been live, open reads the moment those secrets get
set. Closed with the same guard used everywhere else.

Build verified clean (2051 modules)."
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
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Netlify will rebuild. Once it's live, open the House Command"
echo "   Center and click Test on Media / Pricing data / Storefront / Campaigns."
echo
read -n 1 -s -r -p "Press any key to close..."
