#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add src/data/montitrentini/images.json "PUSH IMAGE MANIFEST UPDATE.command" docs/HANDOFF_2026-09-17_media-roles-and-spec-sheets.md

git commit -F .commit-msg-image-manifest.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-image-manifest.txt

read -n 1 -s -r -p "Press any key to close..."
echo
