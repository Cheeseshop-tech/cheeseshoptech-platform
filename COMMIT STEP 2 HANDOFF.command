#!/bin/bash
# COMMIT STEP 2 HANDOFF — double-click. Commits AND pushes, one step.
#
# Two files, named explicitly. No `git add -A`.
#   docs/HANDOFF_2026-09-26_people-spine-step-2.md
#   COMMIT STEP 2 HANDOFF.command   this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT STEP 2 HANDOFF  —  commits and pushes"
echo "======================================================================"
echo ""

git add "docs/HANDOFF_2026-09-26_people-spine-step-2.md" "COMMIT STEP 2 HANDOFF.command" || {
  echo "  git add failed — read above."
  echo "  If it says index.lock exists, delete that file and re-run:"
  echo "     rm \"\$(pwd)/.git/index.lock\""
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

echo "  Staged:"
git --no-pager diff --cached --stat | cat
echo ""

git commit -m "handoff: people spine step 2 — the ranked list, already pulled

Step 1 is done; all 748 companies have relationship unset. This handoff
carries the live ranking so the next session is judgment, not archaeology.

Only 76 companies have any logged engagement; the top 25 is the real
book, pulled 2026-09-26 by num_contacted_notes with last-contact date and
channel. The counts decide what order to THINK about accounts in - they
never decide the value. Guardrail 2 stands: relationship is not inferred
from touch counts, because a prospect worked hard in a campaign looks
identical to an old customer.

Flags four rows in the top six that are not prospects at all - an unnamed
record with 498 notes (the most-engaged record in the CRM, and it has no
name), two probable HubSpot sample companies, and Monti Trentini itself,
which is the client rather than an account. Those distort the ranking and
should be settled before anything below them is classified.

Records what is verified working (HubSpot read/write), what is
permanently impossible (schema writes), and that none of the unauthorized
plugin MCPs are needed for this step - so no morning time goes to
connecting Asana or Figma for a job that only touches HubSpot." | cat

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
  echo "  Done and pushed. Tomorrow: docs/HANDOFF_2026-09-26_people-spine-step-2.md"
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
