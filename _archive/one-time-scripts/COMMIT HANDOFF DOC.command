#!/bin/bash
cd "$(dirname "$0")" || exit 1
LOG="_archive/logs/commit-handoff.log"; mkdir -p "$(dirname "$LOG")"
exec > >(tee "$LOG") 2>&1
echo "===== run at $(date) ====="
F="docs/HANDOFF_2026-09-18_catalog-crash-and-spec-sheet-redirect.md"
if [ -z "$(git status --porcelain -- "$F")" ]; then
  echo "Nothing to commit."; echo; read -n 1 -s -r -p "Press any key to close..."; exit 0
fi
git add "$F"; echo "[add exit: $?]"
git commit -F - <<'MSG'
Close out the 2026-09-18 handoff: catalog fix verified live

Records the final state -- a0615a8 deployed, Product Catalog rendering 107
items, and the Asiago Vecchio Scheda confirmed on the 03003 whole wheel
card. Adds a "start here" section for the next session: reading order, and
the non-negotiables this repo has learned the hard way (a filename is not
an item number; never regenerate items-seed.json; media edits route through
the Media Hub; every change gets a commit button; every button logs; open
the page before saying it works).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01N8eQjXXZQwwzWpZdkCZMNk
MSG
st=$?; echo "[commit exit: $st]"
[ $st -ne 0 ] && { echo "COMMIT FAILED -- see $LOG"; read -n 1 -s -r -p "Press any key to close..."; exit 1; }
git push; echo "[push exit: $?]"
rm -f "COMMIT CATALOG FIX.command"
echo; echo "DONE -- pushed."; echo
read -n 1 -s -r -p "Press any key to close..."
