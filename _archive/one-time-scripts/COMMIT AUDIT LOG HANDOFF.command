#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add docs/HANDOFF_2026-09-17_agent-cloudinary-writes-bypass-audit-log.md "COMMIT AUDIT LOG HANDOFF.command"

git commit -F .commit-msg-write-audit-handoff.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-write-audit-handoff.txt

read -n 1 -s -r -p "Press any key to close..."
echo
