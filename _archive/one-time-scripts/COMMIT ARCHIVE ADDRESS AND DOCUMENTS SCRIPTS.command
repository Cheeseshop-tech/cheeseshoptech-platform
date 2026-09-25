#!/bin/bash
# Double-click this file to commit and push: archive the now-landed COMMIT scripts for address
# verification and campaign documents (both confirmed pushed — see git log).
cd "$(dirname "$0")" || exit 1

echo "Archiving the address-verification and campaign-documents commit scripts…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "_archive/one-time-scripts/COMMIT ADDRESS VERIFICATION.command" \
  "_archive/one-time-scripts/COMMIT CAMPAIGN DOCUMENTS.command" \
  "COMMIT ARCHIVE ADDRESS AND DOCUMENTS SCRIPTS.command"

git commit -m "chore(scripts): archive landed address-verification + campaign-documents commit scripts

Both confirmed live on phase-2-6-build (commits db22f95, 2bf53e8).
Moved out of the repo root so it doesn't accumulate one-off commit
buttons for features that already shipped.

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
