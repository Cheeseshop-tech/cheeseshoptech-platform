#!/bin/bash
# COMMIT INTEGRATION HEALTH TENANT FIX — Integration health's Test buttons were probing "Demo
# Client" instead of Monti Trentini (alphabetical pick), understating real Media/Pricing status.
# Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Integration health — tenant fix"
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
  "docs/BUILD_LOG.md" \
  "COMMIT INTEGRATION HEALTH TENANT FIX.command"
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
git commit -m "Integration health: Test buttons were probing Demo Client, not Monti Trentini

Found live-testing right after the previous deploy: Media showed 'reachable
(demo)' and Pricing showed 'reachable, no data yet (demo)' -- both genuinely
reachable, but understated. testClient = clients[0] picked up Demo Client, not
Monti Trentini, because listClients() returns clients alphabetically and
demo < montitrentini. Demo has no real Cloudinary assets or published
inventory, so it can never show the TRUE live status those seams have for the
one real tenant.

Fix: testClient now explicitly skips demo/_template and picks the first real
client. Build verified clean (2051 modules)."
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
echo "✅ Pushed. Once Netlify rebuilds, re-test Media and Pricing data — both"
echo "   should now say '(montitrentini)' and Pricing should show LIVE."
echo
read -n 1 -s -r -p "Press any key to close..."
