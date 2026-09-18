#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add -A "_archive/one-time-scripts"
git add scripts/validate-item-standards.mjs \
  docs/ITEM_STANDARDS_VALIDATION_2026-09-18_live.md \
  docs/ITEM_STANDARDS_VALIDATION_2026-09-18_offline.md \
  "COMMIT REPORT SPLIT.command"
git add -- docs/ITEM_STANDARDS_VALIDATION_2026-09-18.md 2>/dev/null || true

git commit -F .commit-msg-report-split.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-report-split.txt

read -n 1 -s -r -p "Press any key to close..."
echo
