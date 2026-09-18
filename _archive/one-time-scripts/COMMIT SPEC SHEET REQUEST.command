#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add \
  docs/CLIENT_DATA_REQUEST_2026-09-18_spec-sheets.md \
  docs/GAP_LISTS_2026-09-18.md \
  docs/PRODUCT_NAMING_STANDARD_2026-09-18.md \
  docs/ITEM_STANDARDS_VALIDATION_2026-09-18.md \
  scripts/validate-item-standards.mjs \
  "VALIDATE ITEMS LIVE.command" \
  src/components/catalog/buyer-catalog.jsx \
  package.json \
  CLAUDE.md \
  "_archive/one-time-scripts/COMMIT LIVE PRICE LIST CANONICAL.command" \
  "docs/Item Preparedness Tracker.xlsx" \
  "docs/Precut Line Readiness 2026-09-18.docx" \
  "COMMIT SPEC SHEET REQUEST.command"

git commit -F .commit-msg-spec-sheet-request.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-spec-sheet-request.txt

read -n 1 -s -r -p "Press any key to close..."
echo
