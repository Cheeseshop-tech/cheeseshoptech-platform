#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/campaigns/campaign-detail.jsx" "COMMIT TERRITORY ASSIGNMENTS LIVE LIST.command"
git commit -m "Add a live \"Assignments so far\" list to Rep Territory Assignments

Rick: \"I need the assignments to populate the campaign list that builds as we
add Reps, territories, accounts so we can see a list as it build and confirm
saved.\"

RepVisitsPanel already tracked accountAssignments and derived repStats
(count + states per rep) for the small badge next to each name in the full
national rep roster, but there was nowhere that surfaced ONLY what's actually
been assigned, and no save-status indicator anywhere in this panel at all.

Added a dedicated \"Assignments so far\" block, above Steps 1/2: one row per
rep with any accounts, showing their live count + states, plus the same
RowSaveStatus chip every other panel on this page already uses (Saving... /
Saved with a checkmark). It's purely derived from state already in memory, so
it updates the instant a territory is locked in or a single account's rep
dropdown changes — no new data to persist.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
