#!/bin/bash
# Pass 5 — contact join fix: surfaces 268 companies' existing emails. Push after committing.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock
git reset -q

echo "Staging..."
git add \
  netlify/functions/crm-hubspot.js \
  "COMMIT PASS 5 EMAIL DOMAIN JOIN.command"

echo "Committing..."
git commit -m "fix(crm-hubspot): fall back to email-domain join — 268 hidden emails surface

The company<->contact join was name-text only (contact.company free text vs
company.name). The 2026-07-24 audit found 268 companies whose contacts hold
emails AT THE COMPANY'S OWN DOMAIN but with blank or mismatched company text —
the console showed all of them as 'no email' (sendable stuck at ~64 of 648).

Join now tries normalized-name first, then email-domain <-> company website
domain (www. stripped, freemail domains like gmail.com excluded from the key
so consumer addresses can't false-join). Named contacts win over bare emails
on the domain key. Expected sendable after deploy: ~330.

Verified: node --check + offline replay of the join against the full 642
company / 659 email-contact export (60 name joins + 268 domain-only joins).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017hEScbCoKJY28Po86fWj7h"

if [ $? -eq 0 ]; then
  echo "✅ Pass 5 committed. Run PUSH ALL PASSES (or git push) to deploy."
else
  echo "❌ Commit failed — see error above."
fi
echo ""
echo "Press any key to close..."
read -n 1
