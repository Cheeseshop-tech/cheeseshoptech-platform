#!/bin/bash
# COMMIT CLAUDE MD NOTES — double-click. Commits AND pushes, one step.
#
# Two files, named explicitly. No `git add -A`.
#   CLAUDE.md                     three Remember entries from the 2026-09-25/26 session
#   COMMIT CLAUDE MD NOTES.command  this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT CLAUDE MD NOTES  —  commits and pushes"
echo "======================================================================"
echo ""

git add "CLAUDE.md" "COMMIT CLAUDE MD NOTES.command" || {
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

git commit -m "CLAUDE.md: the three things the 2026-09-25 session cost an hour to learn

TRAP - stale .git/index.lock. 'The commit button doesn't work' is almost
always this. Claude's sandbox creates the lock with a plain git status
and the FUSE mount refuses the unlink, so Claude leaves a lock it cannot
remove and every subsequent git add/commit dies instantly. Fix is Rick
running rm on it; prevention is Claude using --no-optional-locks for
every read-only check against the mounted repo.

A script's exit code is not evidence the work shipped. git push with
nothing to send exits 0, and the deploy script read that as success -
printing 'Pushed. Netlify is building' four times over work that never
left the laptop. Generalized into a rule: every button that reports
success must assert the state it claims to have produced. Same class as
the inventory sync writing a canonical file without validating it.

The people spine exists - five HubSpot properties, both Territory lists
verified identical string-for-string, plus the two UI traps that forced
a rebuild (write-once internal values; the options table living on the
Field type tab). Records that the fields are UNPOPULATED, so nothing
should read them yet - guardrail 4 in PEOPLE_DATA_OWNERSHIP.md, the rule
territory-book violated." | cat

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
  echo "  Done and pushed."
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
