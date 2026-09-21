#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/campaigns/campaign-detail.jsx" "COMMIT PROSPECT REMOVE BUTTON.command"
git commit -m "Add a Remove button + explanation for non-prospect contacts in the call console

Rick: \"give me a remove button with a explanation for contacts that are not
prospects but a different industry contact.\"

campaigns.js already had a 'not-a-prospect' call outcome meaning exactly this
(wrong trade, closed, duplicate — never a real prospect), and it already drops
a row out of the outstanding/remaining count. But there was no direct way to
apply it — a rep had to open a row, find it in an 8-option outcome dropdown,
and there was nowhere that showed WHY a company got disqualified without
opening it, or a dedicated place to review what had been removed.

Added, in CallRow (Target Prospects / Call console):
- A one-click Remove button in the row header, prompting for a short reason
  before it does anything (nothing removes silently). Confirming sets the
  outcome to not-a-prospect and appends the reason to the existing call-note
  field, so any notes a rep already captured are kept, not overwritten.
- The reason shows right in the collapsed row (no need to open it) once
  removed.
- A Restore button in its place once removed, undoing it back to not-called.

And in ProspectPanel:
- A dedicated \"Removed\" tab, split out of the existing \"Worked\" tab so
  genuinely-disqualified rows aren't mixed in with real captured/cleared
  contacts — a reviewable log of everything removed and why.

No backend/schema change — outcome + note already round-trip through the
existing campaign-enrichment.js store.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
