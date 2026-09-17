#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add docs/HANDOFF_2026-09-17_media-roles-and-spec-sheets.md "COMMIT SPEC SHEETS HANDOFF.command"

git commit -F .commit-msg-specsheets.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-specsheets.txt

read -n 1 -s -r -p "Press any key to close..."
echo
