#!/bin/bash
# COMMIT CAMPAIGN MANAGEMENT — retitle "Campaigns" -> "Campaign Management", add the new-campaign
# template form + tab (campaign definitions were read-only until now). Double-click to commit and
# push. This push will also carry the still-pending Integration Health tenant-fix commit
# (a8e71c5), if it hasn't landed on origin yet.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Campaign Management (rename + new-campaign form/tab)"
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
  "netlify/functions/campaign-defs.js" \
  "src/lib/campaigns.js" \
  "src/components/campaigns/campaigns-page.jsx" \
  "src/components/campaigns/new-campaign-form.jsx" \
  "src/App.jsx" \
  "docs/BUILD_LOG.md" \
  "COMMIT CAMPAIGN MANAGEMENT.command"
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
git commit -m "Campaign Management: retitle + new-campaign template form and tab

Rick: campaign updates/details + call outreach for enrichment lives here, so
title it Campaign Management, and add a form + tab to create a new campaign.

Rename: 'Campaigns' -> 'Campaign Management' in the sidebar nav (App.jsx) and
the page h1/subtitle (campaigns-page.jsx). Pill sub-nav labels and dashboard
widget copy left alone -- those describe the campaigns themselves.

New write path: campaign DEFINITIONS had no write path at all until now --
only hardcoded SEEDS (mock mode) or a read-only Make webhook fetch. Added
netlify/functions/campaign-defs.js (same requireReadAuth/requireWriteAuth +
Blobs pattern as campaign-state.js, but a server-side read-modify-write
upsert keyed by campaign id, since this store only ever grows one campaign
at a time from a form). getCampaigns() now merges seeded/webhook defs with
these custom ones.

New form: src/components/campaigns/new-campaign-form.jsx. Picking a type
previews that type's checklist template (task count + how many required to
reach Ready to launch) before creating, since the new campaign's checklist
is seeded from exactly that template. Enrichment campaigns can pick which
existing campaign the call pass clears contacts for. On success the
campaign opens straight into detail view.

Build verified clean (2052 modules)." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
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
echo "✅ Pushed. Once Netlify rebuilds, sign in as admin and check:"
echo "   1. Sidebar says 'Campaign Management', not 'Campaigns'."
echo "   2. The tab row has a '+ New campaign' entry; creating one there opens"
echo "      it straight into detail view with its checklist already seeded."
echo
read -n 1 -s -r -p "Press any key to close..."
