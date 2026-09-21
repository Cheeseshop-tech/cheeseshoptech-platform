#!/bin/bash
# Double-click this file to commit and push: Rep Territory Assignments — live HubSpot reps
# paired to states/cities, auto-populating Target Prospects; wired into the New Campaign
# template so future distributors don't need a bespoke build.
cd "$(dirname "$0")" || exit 1

echo "Committing Rep Territory Assignments…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "netlify/functions/campaign-state.js" \
  "netlify/functions/campaign-defs.js" \
  "src/components/campaigns/new-campaign-form.jsx" \
  "src/lib/campaigns.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-21_rep-territory-assignments.md" \
  "COMMIT REP TERRITORY ASSIGNMENTS.command"

git commit -m "feat(campaigns): rep territory assignments — live HubSpot reps, auto-routed prospects

Ace Endico Rep Customer Visits (and any future distributor campaign): load a
distributor's reps live from HubSpot by company name, pair each rep to the
state(s)/cities they cover (HubSpot only holds the distributor HQ address,
never a rep's own territory), and Target Prospects auto-populates from the
saved assignments on every render — no separate apply step.

- netlify/functions/campaign-state.js: new repVisits {source, reps} field,
  sanitized like documents/comments.
- netlify/functions/campaign-defs.js + new-campaign-form.jsx: audience.repsFrom
  wired into the New Campaign template so a future distributor-visits campaign
  starts with this tab live, not a bespoke rebuild.
- src/lib/campaigns.js: deriveRepFilter() turns rep->region assignments into
  the same {states, cityAllowlist} shape segmentOf() already filters on;
  mergeCampaign() derives audience.filter from it automatically.
- campaign-detail.jsx: new Rep territory assignments section (RepVisitsPanel/
  RepRegionRow), new EmailInline (composeUrl) next to PhoneInline on both
  prospect rows and rep rows.

Docs: docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md,
docs/HANDOFF_2026-09-21_rep-territory-assignments.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
commit_result=$?

echo
if [ $commit_result -ne 0 ]; then
  echo "⚠️  Commit failed (exit code $commit_result) — nothing was pushed. Take a screenshot of this window and send it back."
  echo
  read -n 1 -s -r -p "Press any key to close this window…"
  echo
  exit 1
fi

git push origin phase-2-6-build
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Committed and pushed. Netlify will pick it up from here."
else
  echo "⚠️  Push failed (exit code $status) — the commit is local. Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
