#!/bin/bash
# Double-click this file to commit and push: adds account-by-account rep assignment (address/
# phone/email + a per-account dropdown) on top of the territory checkboxes, so a rep's
# scattered accounts in another rep's territory stay correct. Follow-up to 9cde8c3 and the
# checkbox-builder revision.
cd "$(dirname "$0")" || exit 1

echo "Committing account-by-account rep assignment…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "netlify/functions/campaign-state.js" \
  "src/lib/campaigns.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-21_rep-territory-assignments.md" \
  "COMMIT REP TERRITORY ACCOUNT ASSIGNMENT.command"

git commit -m "feat(campaigns): rep territory assignments — account-by-account override

Same-day follow-up, per direct feedback: a rep's accounts are sometimes
scattered into another rep's broad territory, which a stored state/city
filter can never represent correctly. Ran engineering:system-design before
changing the data model — see docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md
'Revision 2' for the reasoning.

Two steps now, one source of truth:
- Step 1 (territory checkboxes + Lock in) is now a BULK-WRITE convenience
  into accountAssignments, not a stored geometric rule.
- Step 2 (new): the moment a territory opens, every account in it shows its
  address/phone/email and its OWN 'Responsible rep' dropdown, saved
  immediately and independently of step 1.

- netlify/functions/campaign-state.js: repVisits gains accountAssignments
  {companyId: repEmail} (capped, email-validated); legacy reps[] still
  accepted read/write so nothing already saved is lost.
- src/lib/campaigns.js: new accountAssignmentScope() feeds mergeCampaign()'s
  audience.companyIds (exact scope) from the assignment map, preferred over
  the old deriveRepFilter()-based approximation; that path stays as a
  fallback only for untouched legacy data.
- campaign-detail.jsx: RepVisitsPanel restructured into explicit Step 1 /
  Step 2, per-rep badges now derived from real assignments instead of a
  separately-entered states list.

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
