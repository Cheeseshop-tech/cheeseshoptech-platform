#!/bin/bash
# COMMIT PROJECT STATUS PANEL AND ROADMAP UPDATE — 2026-08-17
# Double-click to commit and push.
#
# REAL CODE CHANGE — new Agency Console panel (House dashboard) + a docs-only roadmap update.
# Netlify will auto-build and redeploy on push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Project status panel (House Command Center) + roadmap delivery-mechanism update"
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
  "src/components/home/agency-console.jsx" \
  "src/lib/project-status.js" \
  "docs/PROJECT_ROADMAP.md" \
  "docs/BUILD_LOG.md" \
  "COMMIT PROJECT STATUS PANEL AND ROADMAP UPDATE.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "feat(agency-console): add CheeseShop TECH project status panel to the House Command Center

Rick asked to surface the daily-accountability status (docs/PROJECT_ROADMAP.md) directly
inside the app instead of only as an external status page. Added a new admin-only
'Project status' panel to the Agency Console (the section that always renders for the
House/admin tenant) showing all four active threads -- Security & Auth, Scale-to-10,
Ecommerce, Monti ops -- each with a status badge, progress bar, and its 'Next concrete
action' line, plus an 'on the radar' callout (business model crossroads, this panel itself
as the admin view of the Progress/Onboarding tab spec).

This is the Agency Console (admin) view called for first in
docs/PROGRESS_TAB_SPEC_2026-08-17.md. Data source is a new hand-maintained module,
src/lib/project-status.js, kept in sync with PROJECT_ROADMAP.md by hand rather than parsed
at build time -- the doc is a running narrative log (corrections, timestamps, superseded
sections), not clean structured data, so parsing it reliably was judged too fragile for v1.
Read-only, no write-back to the doc from the UI, matching the spec's v1 scope.

Also includes docs/PROJECT_ROADMAP.md's delivery-mechanism update: the daily email is not
automated (Cowork supports only one connected Google account at a time, and
hello@cheeseshoptech.com is itself a Gmail account, so connecting it would drop the Monti
sales@ connector) -- delivery is on-demand via browser automation, Rick-prompted only, no
scheduled task."
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
echo "✅ Pushed. Netlify will auto-build and redeploy from this push."
echo
read -n 1 -s -r -p "Press any key to close..."
