#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add netlify/functions/crm-hubspot.js src/lib/crm.js src/components/crm/crm-page.jsx "COMMIT CRM PROSPECT LOOKUP CARD.command"

git commit -m "$(cat <<'EOF'
Add prospect quick-look card to the CRM outreach console

Rick's ask: a fast pre-call/pre-email lookup — search a prospect, get one
window with their full address, website, and contact so a rep isn't
scanning the wide outreach table right before dialing.

- netlify/functions/crm-hubspot.js: now requests HubSpot's "address" and
  "zip" company properties (previously only city/state were pulled), so
  street address is available at all.
- src/lib/crm.js: addressOf() formats a company's full address as one
  display string; mapUrlOf() builds a Google Maps search link (falls back
  to name+city/state when no street address is on file); websiteUrlOf()
  turns the HubSpot domain into a real clickable https:// link.
- src/components/crm/crm-page.jsx: new ProspectCard — opened via a
  per-row "Look up" action, or by pressing Enter in the search box (opens
  the top filtered match). Shows address+map link, website, phone,
  primary contact, the outreach status/notes editor (same autosave path
  as the table), any recent email activity matched to that account, and
  one-tap Call/Email buttons. A Refresh button re-pulls the full account
  book from HubSpot (bypasses the 5-min session cache) without losing the
  table's search/filter state underneath.

Existing table search/filters/columns are unchanged — this adds the
focused single-account view on top, it doesn't replace anything.

Build verified clean (vite build, scratch --outDir). Not yet live-tested.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01766AhpwLarT2GPWbUcQwF6
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi
