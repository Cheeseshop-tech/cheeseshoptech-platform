#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock

git add \
  src/data/montitrentini/source/pricelist-2026-03-live.json \
  src/data/montitrentini/catalog.json \
  src/data/montitrentini/items-seed.json \
  src/data/montitrentini/signs.json \
  scripts/build-items-seed.mjs \
  docs/GAP_LISTS_2026-09-18.md \
  docs/CATALOG_INTEGRITY_AUDIT_2026-09-18.md \
  "COMMIT LIVE PRICE LIST CANONICAL.command"

git commit -F .commit-msg-live-pricelist.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-live-pricelist.txt

read -n 1 -s -r -p "Press any key to close..."
echo
