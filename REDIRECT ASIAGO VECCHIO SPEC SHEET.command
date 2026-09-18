#!/bin/bash
# Re-homes the Asiago Vecchio Scheda from item 03073 (7 oz Exact Weight Wedge, 12/case) onto
# item 03003 (Whole Wheel, 16-18 lb, 1/carton) — where it actually belongs.
#
# The sheet Monti sent describes 1 per carton, a 360-day shelf life, and EAN part number
# 2003003. Those are the whole wheel's specs. It was filed against 03073 because the file is
# named "03073-specsheet.pdf", and a filename is not an item number.
#
# This shows you the exact change first and asks before writing anything.
# The passcode is read silently: never written to a file, never committed, never in your history.

cd "$(dirname "$0")" || exit 1

ASSET="monti/03073-specsheet"
TO="03003"
CAPTION="Asiago Vecchio DOP Whole Wheel — spec sheet"

echo "Redirect Asiago Vecchio spec sheet  →  whole wheel card"
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

echo "--- DRY RUN (nothing written yet) -------------------------------"
echo
node scripts/reassign-asset-code.mjs --asset "$ASSET" --to "$TO" --caption "$CAPTION"
status=$?
echo

if [ $status -ne 0 ]; then
  unset AGENT_GATE_PASSCODE
  echo "Dry run failed — nothing was written."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo "-----------------------------------------------------------------"
printf "Apply this change to the live library? [y/N] "
read -r ANSWER
echo

case "$ANSWER" in
  [yY]*)
    node scripts/reassign-asset-code.mjs --asset "$ASSET" --to "$TO" --caption "$CAPTION" --apply
    status=$?
    ;;
  *)
    echo "Cancelled — nothing written."
    status=0
    ;;
esac

unset AGENT_GATE_PASSCODE

echo
if [ $status -eq 0 ]; then
  echo "Done. Next: review the images.json diff, then run COMMIT ASIAGO SPEC SHEET REDIRECT.command"
else
  echo "⚠️  The write failed — see the error above. Nothing was committed."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
echo
