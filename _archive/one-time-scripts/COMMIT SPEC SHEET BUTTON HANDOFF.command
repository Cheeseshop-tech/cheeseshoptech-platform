#!/bin/bash
set -e
cd "$(dirname "$0")"

# Clear any stale git lock from an interrupted process before staging.
rm -f .git/index.lock .git/HEAD.lock

git add "docs/HANDOFF_2026-09-17_spec-sheet-button-and-pdf-thumbnails.md"

git commit -F ".commit-msg-specsheet-button.txt"
git push

rm -f ".commit-msg-specsheet-button.txt"
rm -- "$0"

echo ""
echo "Done — spec sheet button + PDF handoff pushed to phase-2-6-build."
read -n 1 -s -r -p "Press any key to close..."
