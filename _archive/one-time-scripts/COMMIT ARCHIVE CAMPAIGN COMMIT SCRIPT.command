#!/bin/bash
# Double-click this file to commit the housekeeping move of the (already-run) campaign
# comments/status commit script into _archive/one-time-scripts/, per the standing convention.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing: archive the already-run campaign comments/status commit script…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "COMMIT ARCHIVE CAMPAIGN COMMIT SCRIPT.command" \
  "_archive/one-time-scripts/COMMIT CAMPAIGN COMMENTS STATUS AND ARCHIVE.command"

git commit -m "chore: archive the campaign comments/status/archive commit script

Confirmed landed (HEAD == origin/phase-2-6-build at 9699975) — moving it
out of the repo root per the standing convention (see
_archive/README.md / commit-button-rule).

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
  echo "✅ Committed and pushed."
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
