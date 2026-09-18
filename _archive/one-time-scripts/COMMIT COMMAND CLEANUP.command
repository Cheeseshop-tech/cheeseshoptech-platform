#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

# Explicit paths only. `git add -u` would also sweep in src/data/montitrentini/images.json,
# which carries an unrelated uncommitted change from an earlier session -- not ours to commit.
git add -A "_archive/one-time-scripts"
git add "COMMIT COMMAND CLEANUP.command" scripts/validate-item-standards.mjs docs/ITEM_STANDARDS_VALIDATION_2026-09-18.md

git commit -F .commit-msg-command-cleanup.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-command-cleanup.txt

read -n 1 -s -r -p "Press any key to close..."
echo
