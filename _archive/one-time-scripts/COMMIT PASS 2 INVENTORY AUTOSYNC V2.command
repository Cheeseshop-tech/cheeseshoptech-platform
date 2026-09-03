#!/bin/bash
# Pass 2 of 3 — inventory auto-sync v2 data (was sitting staged-but-uncommitted).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock
git reset -q

echo "Staging..."
git add \
  src/data/montitrentini/inventory.json \
  "src/data/montitrentini/source/availability_2026-07-23_v2.csv" \
  src/archive/backup_2026-07-21_inventory_autosync \
  src/archive/backup_2026-07-23_inventory_autosync

echo "Committing..."
git commit -m "inventory: auto-sync 2026-07-23 v2 + autosync backups

Regenerated inventory.json from availability_2026-07-23_v2.csv (client sent a
corrected sheet after the morning sync): reservations applied against
availability — e.g. Piave Vecchio PDO >6mo 18 -> 13 cases (5 reserved).
Source CSV committed alongside per convention; autosync backup folders for
07-21 and 07-23 swept into src/archive (same pattern as the 07-16/07-18 sweeps).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017hEScbCoKJY28Po86fWj7h"

if [ $? -eq 0 ]; then
  echo "✅ Pass 2 committed. Run PASS 3 next."
else
  echo "❌ Commit failed — see error above."
fi
echo ""
echo "Press any key to close..."
read -n 1
