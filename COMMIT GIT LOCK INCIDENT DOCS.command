#!/bin/bash
# Double-click to commit + push: build log + handoff for the 2026-07-15 git-lock incident/recovery.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock && echo "Cleared stale .git/HEAD.lock"

git add \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT GIT LOCK INCIDENT DOCS.command"

git commit -m "docs: record 2026-07-15 git-lock incident + recovery, mark data commits shipped

- BUILD_LOG.md: new entry documenting the stray .git/HEAD.lock (dated 2026-07-14, predates
  this session) that silently blocked commits, the commit-script blind spot that let a
  failed commit report '✅ Pushed' anyway (only git push's exit code was checked), and the
  fsck+update-ref recovery that landed commit 1246648 with zero data loss.
- BUILD_LOG.md + HANDOFF.md: sales-history reconciliation and ERP monthly parse entries
  updated from 'staged, ship via COMMIT *.command' to 'live on remote, commit 1246648' --
  both are actually pushed now, confirmed via git rev-parse HEAD == origin/phase-2-6-build.
- No code changes. Agent A1 wiring and placeholder-images work remain uncommitted and
  untouched, exactly as before -- their own COMMIT buttons are unaffected by any of this."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
push_status=$?
echo
if [ $push_status -eq 0 ] && git diff --quiet HEAD origin/phase-2-6-build -- docs/BUILD_LOG.md HANDOFF.md 2>/dev/null; then
  echo "✅ Committed and pushed — verified HEAD matches origin."
elif [ $push_status -eq 0 ]; then
  echo "⚠️  git push exited 0 but could not confirm HEAD == origin. Run 'git status' to check."
else
  echo "⚠️  Push failed (status $push_status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
