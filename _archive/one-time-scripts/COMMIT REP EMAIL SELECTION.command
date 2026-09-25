#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/campaigns/campaign-detail.jsx" "COMMIT REP EMAIL SELECTION.command"
git commit -m "Let you pick reps directly and email that list, no territory needed

Rick: \"lets update the campaign Rep selection since I dont have acctual
territory assignments yet for each rep let me pikc the reps and send the
email to the list I pick in the campaign.\"

The Rep Territory Assignments tab's HubSpot rep roster already listed every
rep with an individual Send-email icon, but only one at a time, and only
after wading toward Step 1/2 for context. Added a checkbox on every rep row
plus a small bulk-action bar above the list (Select all shown / Clear /
Email selected (N)) that opens ONE compose with every checked rep's address
in \"to\" -- same composeUrl()/Gmail-identity trick the per-row Send icon
already uses. Fully independent of territory/account assignment -- works the
moment the distributor's reps load from HubSpot, which is the point: Rick
doesn't have per-rep territories mapped yet, so this is the fallback that
doesn't wait on that.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
