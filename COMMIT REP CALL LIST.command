#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/campaigns/campaign-detail.jsx" "COMMIT REP CALL LIST.command"
git commit -m "Turn rep territory assignments into an actual working call list, per rep

Rick: \"we're not just assigning the reps regions and accounts the purpose is
we are building a working list so I can make phone calls to accounts on
behalf of the rep to coordinate sales of monti trentini products through the
rep.\"

Step 2 already showed phone/email/address per assigned account, but nothing
tracked that a call was made, what happened, or what's left to work — it was
an assignment tool, not a call list. And the accounts had no concept of
'whose book is this' as something you could actually work through.

Added: the \"Assignments so far\" rep rows are now clickable — picking a rep
opens a \"Call list\" for exactly their assigned accounts, reusing CallRow
(the same row Target Prospects' call console already uses) for every one of
them: call outcome (Left message / Callback / No answer / Bad number / Do
not contact / Reached), notes, phone/email, and the Remove button from
yesterday for anything that turns out not to belong there. Same
campaign-enrichment.js store underneath, so a call logged here is the exact
same record if you ever look at it from Target Prospects — no parallel
tracker, no data to keep in sync by hand.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
