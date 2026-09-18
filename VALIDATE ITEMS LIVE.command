#!/bin/bash
# Runs the item-standards check against the LIVE Media Hub item store.
#
# Why this matters: the offline run reads the repo's items-seed.json snapshot, which cannot see
# item records that exist only in Media Hub. That is exactly how the phantom item "04108" stayed
# invisible to every offline audit on 2026-09-18. Only a live run gives a trustworthy result.
#
# The passcode is read silently and lives only in this shell's memory for the length of the run.
# It is never written to a file, never committed, and never appears in your shell history.

cd "$(dirname "$0")" || exit 1

echo "Item standards — LIVE validation"
echo
printf "Agent Gate passcode (input hidden): "
read -r -s AGENT_GATE_PASSCODE
echo
echo

if [ -z "$AGENT_GATE_PASSCODE" ]; then
  echo "No passcode entered — nothing run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

export AGENT_GATE_PASSCODE
node scripts/validate-item-standards.mjs --live
status=$?
unset AGENT_GATE_PASSCODE

echo
if [ $status -eq 0 ]; then
  echo "✅ No HIGH findings against the live item store."
else
  echo "⚠️  HIGH findings above. Full report: docs/ITEM_STANDARDS_VALIDATION_<today>.md"
fi
echo
read -n 1 -s -r -p "Press any key to close..."
echo
