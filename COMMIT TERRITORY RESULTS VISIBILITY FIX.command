#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/campaigns/campaign-detail.jsx" "docs/HANDOFF_2026-09-21_rep-territory-assignments.md" "COMMIT TERRITORY RESULTS VISIBILITY FIX.command"
git commit -m "Fix: rep territory Step 2 results vanishing right after Lock in territory

Rick reported: \"I cant see results from the territory assignment.\" Root cause:
lockInTerritory() saved the account assignments, then immediately cleared
checkedStates/checkedCities — but Step 2 (the account list with per-account rep
dropdowns) only renders while a territory is checked, so the just-assigned
results disappeared the instant the save succeeded. The success message even
says \"adjust any single account below,\" but below was empty.

Fix: stop clearing the territory checkboxes on a successful lock-in. Only the
rep picker resets now, so Step 2 stays open and shows exactly what was just
assigned.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
