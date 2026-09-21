#!/bin/bash
# Double-click this file to commit and push: on-demand address verification (street/city/state/
# zip) in the enrichment call console, via Google's Address Validation API.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing address verification…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "netlify/functions/address-verify.js" \
  "netlify/functions/campaign-enrichment.js" \
  "src/lib/address-verify.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-21_address-verification.md" \
  "COMMIT ADDRESS VERIFICATION.command"

git commit -m "feat(campaigns): address verification in the enrichment call console

Rick, 2026-09-21: \"in the enrichment or anywhere we are running a
campaign with prospects we need the look up function to confirm
address state, city, town zip code and street address.\" Decisions
(asked directly): Google Address Validation API, on-demand per-row in
the call console (not a background sweep), saved as an overlay in the
existing enrichment store (HubSpot is read-only from this app, so a
verified address can never write back there directly).

New: netlify/functions/address-verify.js — server-side call to
Google's Address Validation API using GOOGLE_ADDRESS_VALIDATION_KEY
(never reaches the browser, same pattern as HUBSPOT_TOKEN),
requireWriteAuth-gated since every call is billed. Returns a small
sanitized verdict (confirmed/corrected/unconfirmed) + formatted
address, never Google's raw response.

New: src/lib/address-verify.js — thin client wrapper on the existing
writeAuthedJson helper.

Extended: netlify/functions/campaign-enrichment.js — the per-company
record now also carries street/city/state/zip/addressVerdict/
addressVerifiedAt, sanitized the same str()-everything way as every
existing field.

Extended: CallRow (campaign-detail.jsx, the enrichment call console) —
Street/City/State/Zip fields (pre-filled from HubSpot's own address
fields as placeholders, correctable exactly like buyer/email/phone
already are) plus a Verify address button and a confirmed/corrected/
unconfirmed badge, wired through the existing autosave path.

Deliberately NOT added to RepCallRow (the separate sales-rep-territory
panel) — that panel confirms a distributor's own rep's territory, not
a prospect's mailing address, so address fields don't apply there.
Flagged in the handoff doc in case Rick actually wants something there
too.

Still needs Rick's one manual step: a Google Cloud project + billing +
API key (account/billing setup, not something Claude does on his
behalf) — steps are in the spec doc. Until GOOGLE_ADDRESS_VALIDATION_KEY
is set as a Netlify env var, the button shows a clear \"not set up yet\"
message instead of failing silently. Once he has the key, Claude sets
it the same way AGENT_GATE_PASSCODE was set — no redeploy needed.

Verified: eslint clean on all four touched/new files (0 errors, 4
pre-existing warnings elsewhere in the file, unrelated). vite build
transform stage clean (2061 modules, 0 errors) — build then hit the
same pre-existing sandbox .DS_Store unlink permission quirk documented
in CLAUDE.md, not a code issue. No test framework in this repo.

Full writeup: docs/HANDOFF_2026-09-21_address-verification.md
Spec: docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
commit_result=$?

echo
if [ $commit_result -ne 0 ]; then
  echo "⚠️  Commit failed (exit code $commit_result) — nothing was pushed. Take a screenshot of this window and send it back."
  echo
  read -n 1 -s -r -p "Press any key to close this window…"
  echo
  exit 1
fi

git push origin phase-2-6-build
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Committed and pushed."
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
