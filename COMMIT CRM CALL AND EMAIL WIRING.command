#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/lib/crm.js src/components/crm/crm-page.jsx "COMMIT CRM CALL AND EMAIL WIRING.command"

git commit -m "$(cat <<'EOF'
Wire click-to-call and sales-identity email into the CRM console

Rick's ask: call and email straight from the CRM, with email actually
going out as sales@montitrentini-usa.com — not whatever mail app happens
to be the default on a rep's machine.

- src/lib/crm.js: new composeUrl() helper. Reuses the exact trick already
  shipped for Booth's Calendar/Recap buttons (src/lib/booth.js) — Gmail's
  web compose URL takes an authuser= param that selects which ALREADY
  SIGNED IN Google account composes the message. Reads the same
  resolved.calendar config Booth already reads (tenant config:
  calendar.provider/address — montitrentini.json already has
  Sales@montitrentini-Usa.com set there), so no new config needed. Falls
  back to a plain mailto: for any tenant without that identity configured.
  Not authentication, not a login trigger, and nothing is stored or sent
  automatically — the rep still taps Send themselves in the Gmail window
  that opens.
- src/components/crm/crm-page.jsx: every Email action in the console (the
  table's Contact column and action cell, plus the prospect quick-look
  card) now opens that identity-forced Gmail compose instead of a plain
  mailto:, pre-filled with a minimal "Hi <first name>," greeting -- not a
  drafted message, just saves retyping the opener. Added a proper 📞 Call
  tel: link to the table's action cell (the quick-look card already had
  one) -- click-to-call via whatever's registered as the phone handler,
  per Rick's call to keep this lightweight rather than building a full
  call-queue console.

Build verified clean (vite build, scratch --outDir). Not yet live-tested
-- in particular, confirm on Rick's actual machine that the sales@ Google
account is signed in in the browsing session reps use, since the authuser
trick composes as that account only when it's already signed in there
(otherwise Gmail shows its own account picker, same fallback Booth's
buttons already rely on).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01766AhpwLarT2GPWbUcQwF6
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi
