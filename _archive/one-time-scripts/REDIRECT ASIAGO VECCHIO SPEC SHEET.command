#!/bin/bash
# Re-homes the Asiago Vecchio Scheda from item 03073 (7 oz Exact Weight Wedge) onto item 03003
# (Whole Wheel) -- where its own specs point: 1 per carton, 360-day shelf, EAN 2003003.
#
# Everything this prints is also written to _archive/logs/redirect-specsheet.log so the output
# survives the window closing. The passcode is read silently and is never written anywhere.

cd "$(dirname "$0")" || exit 1
LOG="_archive/logs/redirect-specsheet.log"
mkdir -p "$(dirname "$LOG")"

ASSET="monti/03073-specsheet"
TO="03003"
CAPTION="Asiago Vecchio DOP Whole Wheel — spec sheet"

{
  echo "===== run at $(date) ====="
  echo "node: $(node -v 2>&1)"
} > "$LOG"

echo "Redirect Asiago Vecchio spec sheet  ->  whole wheel card"
echo
printf "Agent Gate passcode (input hidden): "
read -r -s AGENT_GATE_PASSCODE
echo; echo

if [ -z "$AGENT_GATE_PASSCODE" ]; then
  echo "No passcode entered -- nothing run." | tee -a "$LOG"
  echo; read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
export AGENT_GATE_PASSCODE

echo "--- DRY RUN (nothing written yet) -------------------------------"
echo
node scripts/reassign-asset-code.mjs --asset "$ASSET" --to "$TO" --caption "$CAPTION" 2>&1 | tee -a "$LOG"
status=${PIPESTATUS[0]}
echo "[dry-run exit: $status]" >> "$LOG"
echo

if [ $status -ne 0 ]; then
  unset AGENT_GATE_PASSCODE
  echo "Dry run failed -- nothing was written. The error above is saved in $LOG"
  echo; read -n 1 -s -r -p "Press any key to close..."; exit 1
fi

echo "-----------------------------------------------------------------"
printf "Apply this change to the live library? [y/N] "
read -r ANSWER
echo
echo "[answered: $ANSWER]" >> "$LOG"

case "$ANSWER" in
  [yY]*)
    node scripts/reassign-asset-code.mjs --asset "$ASSET" --to "$TO" --caption "$CAPTION" --apply 2>&1 | tee -a "$LOG"
    status=${PIPESTATUS[0]}
    echo "[apply exit: $status]" >> "$LOG"
    ;;
  *)
    echo "Cancelled -- nothing written." | tee -a "$LOG"
    status=99
    ;;
esac

unset AGENT_GATE_PASSCODE

echo
if [ $status -eq 0 ]; then
  echo "DONE. Now run COMMIT SPEC SHEET REDIRECT RESULT.command"
else
  echo "Not applied. Full output saved to $LOG -- Claude can read it."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
echo
