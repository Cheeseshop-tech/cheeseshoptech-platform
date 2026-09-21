#!/bin/bash
# Double-click this file to commit and push: reworks Rep Territory Assignments from free-text
# state entry to a check-box territory builder (state/city/town/borough), a live matching-
# account preview, and a lock-in-to-rep dropdown — follow-up to commit 9cde8c3.
cd "$(dirname "$0")" || exit 1

echo "Committing the Rep Territory checkbox rework…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "src/components/campaigns/campaign-detail.jsx" \
  "docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-21_rep-territory-assignments.md" \
  "COMMIT REP TERRITORY CHECKBOXES.command" \
  "COMMIT REP TERRITORY ASSIGNMENTS.command"

git commit -m "feat(campaigns): rep territory assignments — checkbox builder, not free text

Follow-up to 9cde8c3, same day, per direct feedback: the first pass asked
Rick to type 'NY, NJ, PA' and 'PA: Philadelphia, Pittsburgh; ...' into free-
text fields per rep. Reworked into a proper territory builder:

- State checkboxes, each expandable to the real cities/towns/boroughs that
  state actually has accounts for (built live from the CRM's own data, not a
  static US list — a borough like Brooklyn just falls out of this since
  HubSpot stores it as a plain city value).
- A live preview list of the matching accounts, right below the checkbox
  tree, updating as boxes are (un)checked.
- An 'assign this territory to' rep dropdown + 'Lock in territory' button —
  locking in MERGES the checked boxes into that rep's existing assignment
  (union, not replace), so a rep's territory can be built up over more than
  one lock-in pass.
- The national HubSpot rep list stays visible above the builder, unchanged
  (Rick confirmed that part was already right).

Data shape is unchanged (repVisits.reps[].states/cities) — deriveRepFilter(),
mergeCampaign(), and campaign-state.js's sanitizer from the first commit did
not need to change; Target Prospects still auto-populates the moment a
territory is locked in, no separate apply step.

Docs updated: docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md,
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
