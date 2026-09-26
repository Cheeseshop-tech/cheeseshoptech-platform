#!/bin/bash
# COMMIT DEPLOY GUARD — double-click. Commits the deploy-script fix AND pushes, in one step.
#
# Two files, named explicitly. No `git add -A`.
#   DEPLOY TO STAGING.command   the fix that stops it reporting success when nothing shipped
#   COMMIT DEPLOY GUARD.command this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT DEPLOY GUARD  —  commits and pushes"
echo "======================================================================"
echo ""

git add "DEPLOY TO STAGING.command" "COMMIT DEPLOY GUARD.command" || {
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

git commit -m "deploy: refuse to report success when nothing was pushed

git push with nothing to send prints 'Everything up-to-date' and exits 0.
The old script treated that exit code as success and printed 'Pushed.
Netlify is building' - a message indistinguishable from a real deploy.

On 2026-09-25 that hid a commit button that had never run. Deploy was run
four times, reported success every time, and the work sat uncommitted
throughout. The actual cause turned out to be a stale .git/index.lock
that made every git write fail instantly - but the deploy script's
cheerful success message is what kept it hidden that long.

Now it counts commits with rev-list instead of trusting the exit code,
lists uncommitted files before doing anything, and when a dirty tree
meets zero commits ahead it says plainly that the commit step did not
run and nothing was deployed. It also cannot claim Netlify is building
unless a push actually moved commits." | cat

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
  echo "  Done. Netlify is building — live in ~1-2 min at:"
  echo "  https://cheeseshoptech-platform.netlify.app/?client=montitrentini"
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
