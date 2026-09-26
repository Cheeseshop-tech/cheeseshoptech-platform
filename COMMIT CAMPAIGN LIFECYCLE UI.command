#!/bin/bash
# COMMIT CAMPAIGN LIFECYCLE UI — double-click. Tests, commits, pushes.
#
# Files, named explicitly. No `git add -A`.
#   src/lib/campaign-stages.js                      the display-mode table + next-action logic
#   scripts/test-campaign-stages.mjs                63 tests
#   src/components/campaigns/campaign-detail.jsx    Section folding + the next-action bar
#   package.json                                    test:stages wired into npm test
#   docs/CAMPAIGN_UI_REDESIGN_2026-09-26.md         diagnosis, the table, the decisions
#   COMMIT CAMPAIGN LIFECYCLE UI.command            this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT CAMPAIGN LIFECYCLE UI  —  tests, then commit, then push"
echo "======================================================================"
echo ""

if ! npm test; then
  echo ""
  echo "  TESTS FAILED — nothing committed, nothing pushed."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Tests pass. Staging…"
echo ""

git add \
  "src/lib/campaign-stages.js" \
  "scripts/test-campaign-stages.mjs" \
  "src/components/campaigns/campaign-detail.jsx" \
  "package.json" \
  "docs/CAMPAIGN_UI_REDESIGN_2026-09-26.md" \
  "COMMIT CAMPAIGN LIFECYCLE UI.command" || {
  echo "  git add failed — read above."
  echo "  If it says index.lock exists, delete that file and re-run:"
  echo "     rm \"\$(pwd)/.git/index.lock\""
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

git --no-pager diff --cached --stat | cat
echo ""

git commit -m "campaigns: make the detail page change shape as the campaign moves

Rick, 2026-09-26: \"once all are checked and approved it remains a long
list still visible and you have to scroll past it to get to the next
stage functions.\"

He was describing an 18-row launch checklist sitting permanently at
position 2 of 9, above the call console he uses every day at position 6.
Verified: the page was IDENTICAL at every status. Only three things in the
whole detail view reacted to status - the badge tone, one description
string, and whether Results showed an empty state. A lifecycle dashboard
with no lifecycle.

THE TABLE. src/lib/campaign-stages.js maps (section, status) to one of
four display modes. Read the `launched` column: the call console rises to
primary, Results beside it, and the four build-time sections fold to four
one-line summaries. That is the page Rick was scrolling to reach.

`summary` NEVER hides data - it folds a section to one line showing its
own state (\"Launch readiness - 34 of 38 done, all required ✓\"), one click
from open. Nothing becomes unreachable; it just stops costing a screen.

Auto-fold with a REMEMBERED OVERRIDE (Rick's call): a section folds itself
when its stage passes, but the moment he opens or closes one by hand that
choice sticks for the campaign and the rule stops arguing. The override is
tri-state, not boolean, so \"never touched\" stays distinguishable from
\"explicitly closed\" - with a boolean the rule could never tell whether it
was still allowed to act.

Rep roster stays EXPANDED at launched, by Rick's explicit decision: on an
enrichment campaign it is live working data, not build-time setup - reps
get added and territories fill in DURING the calls.

THE NEXT ACTION. The five equal status pills became one stated next step.
Before, when the checklist cleared, the card turned green and a pill Rick
had to find became un-disabled - the system knew the answer and waited to
be told, the same shape as the deploy script that knew nothing had shipped
and printed \"Pushed\". Status is still a human assertion (the 2026-08-03
gate decision stands); what changed is the page saying so plainly, and
naming the blocker instead of greying out in silence. The pills remain
behind a \"Set status manually\" disclosure for moving backwards.

Ordering is CSS `order` on a flex column, so the JSX still reads as a
build-time sequence while the page renders as a stage-appropriate
workspace. No restructure.

63 tests. The ones that matter guard against a section VANISHING: every
section is reachable at some status, `hidden` never means gone forever, an
UNKNOWN section defaults to visible rather than hidden, and an unknown
status shows everything rather than guessing. That failure mode is how
the per-campaign fields feature spent an hour being real and invisible.

Also corrected while wiring: the checklist summary read r.required, which
does not exist on readinessOf() - it is requiredTotal. Would have rendered
NaN.

Diagnosis, the full table and the four decisions:
docs/CAMPAIGN_UI_REDESIGN_2026-09-26.md

NOT in this pass, deliberately: remembering the last campaign-type pill,
landing on the pill that has work, and empty states that point outward.
Those are what actually fix the \"we don't have an enrichment campaign\"
perception - two enrichment campaigns exist and the landing tab is
hardcoded to Email. Scoped out by Rick; listed in the doc." | cat

if [ $? -ne 0 ]; then
  echo ""
  echo "  Commit failed or nothing to commit — read above. Not pushing."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Pushing…"
echo ""

if git push origin phase-2-6-build; then
  echo ""
  echo "  Done. Netlify is building — live in ~1-2 min."
  echo ""
  echo "  TO VERIFY: open a campaign at 'building' — the checklist should be"
  echo "  at the top, expanded. Then open one at 'launched' — the call"
  echo "  console should be at the top and the checklist folded to one line."
  echo "  Click that line to reopen it; it should stay open after that."
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
