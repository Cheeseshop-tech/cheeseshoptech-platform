#!/bin/bash
# Sweep commit — 2026-07-16 session close.
# Contents: updated FIX GIT LOCK script (now clears HEAD.lock too, after it blocked
# today's commit), the PROPOSAL PRICING NAME JOIN commit button (kept per convention),
# and today's inventory autosync backup.
cd "$(dirname "$0")" || exit 1

git add "FIX GIT LOCK AND PUSH.command" \
        "COMMIT PROPOSAL PRICING NAME JOIN.command" \
        "COMMIT SWEEP 2026-07-16.command" \
        "src/archive/backup_2026-07-16_inventory_autosync/"

git commit -m "chore: sweep 2026-07-16 — HEAD.lock fix in lock script, commit buttons, autosync backup"
if [ $? -ne 0 ]; then
  echo "✗ COMMIT FAILED (nothing staged, or git error above). Nothing was pushed."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

git push
if [ $? -eq 0 ]; then
  echo "✅ Committed and pushed."
else
  echo "⚠️  Commit succeeded but push failed — double-click FIX GIT LOCK AND PUSH.command or run: git push"
fi
read -n 1 -s -r -p "Press any key to close…"
