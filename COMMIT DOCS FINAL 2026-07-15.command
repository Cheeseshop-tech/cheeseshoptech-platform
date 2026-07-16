#!/bin/bash
# Double-click to commit + push: BUILD_LOG/HANDOFF marked current — everything from today shipped.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock && echo "Cleared stale .git/HEAD.lock"

git add \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT DOCS FINAL 2026-07-15.command"

git commit -m "docs: close out 2026-07-15 — all four session commits confirmed shipped

- HANDOFF.md: push-state header now lists all four commits landed today (1246648 data,
  2d8dbcb incident docs, b386bf9 Agent A1, 038247c placeholder images) and states nothing
  is uncommitted. Added a dedicated placeholder-images section (was previously only
  referenced in passing) and a commit hash on the Agent A1 section.
- BUILD_LOG.md: Agent A1 entry updated from 'uncommitted on disk' to shipped @ b386bf9; new
  entry for the placeholder-image thumbnail work shipped @ 038247c.
- No code changes."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
push_status=$?
echo
if [ $push_status -eq 0 ]; then
  head_now=$(git rev-parse HEAD)
  remote_now=$(git rev-parse origin/phase-2-6-build 2>/dev/null)
  if [ "$head_now" = "$remote_now" ]; then
    echo "✅ Committed and pushed — HEAD matches origin/phase-2-6-build ($head_now)."
  else
    echo "⚠️  git push exited 0 but HEAD ($head_now) != origin ($remote_now). Check manually."
  fi
else
  echo "⚠️  Push failed (status $push_status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
