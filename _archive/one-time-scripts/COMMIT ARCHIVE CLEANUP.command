#!/bin/bash
# Double-click to commit + push: finish the repo-root cleanup (archive the leftover one-time
# commit/push helper scripts). Most of the move already landed accidentally in the previous
# dashboard commit (fe2d686) — this just picks up the rest: the 2 scripts that had just been
# run when this cleanup started, the 13 that were untracked before the move, and a stray
# LEARNING_LOG.md file.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add -A -- "_archive/"

git commit -m "chore: archive one-time commit/push helper scripts

Rick, 2026-09-03: repo root had ~148 .command scripts going back to June, almost all
one-time 'double-click to commit + push' helpers whose changes were already committed
and live (verified against git log before moving anything - nothing pending in any of
them). Moved everything task-specific into _archive/one-time-scripts/ - kept as a record
of what each session did, not meant to be re-run. Left in the root: the 4 genuinely
reusable scripts (Deploy to Staging, Push to Deploy, Review Portal, Fix Git Lock and
Push) plus whatever commit script is currently pending.

Also archived a stray docs/LEARNING_LOG.md (a 2026-08-17 session created it in the wrong
place by mistake - the real log lives outside this repo, in the Claude best Practice
manual folder). See _archive/README.md.

Most of this move landed already in the previous commit (fe2d686) because it got staged
right before that commit script ran, and a bare 'git commit' picks up the whole index,
not just what that script's own 'git add' named - same effect either way, just split
across two commits instead of one. This commit is the small remainder: the 2 scripts
that had just been run when the cleanup started, the handful that were untracked before
the move, and the LEARNING_LOG.md relocation." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01Sq1wRxnhf47JQvPZExUG6Z"

echo
echo "Pushing…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Nothing in the live app changes — this is repo housekeeping only."
  echo "   Repo root is down from ~148 .command files to 4 reusable ones."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
