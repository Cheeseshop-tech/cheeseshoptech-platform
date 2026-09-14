#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/data/montitrentini/source/item-reference.json "COMMIT ADD SKU 0911 CRACKERS.command"

git commit -m "$(cat <<'EOF'
Add SKU 0911 (Crackers with Olive Oil Bulk 5 KG) to item-reference.json

The 2026-09-12 inventory auto-sync flagged 0911 as a code not yet in
item-reference.json. Rick confirmed it's a legit new item. Added so
future syncs stop flagging it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi
