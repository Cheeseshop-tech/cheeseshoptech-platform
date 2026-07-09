#!/bin/bash
# Double-click to commit + push: live HubSpot email activity on the CRM dashboard.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/crm-hubspot.js" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md"

git commit -m "feat(crm): live HubSpot email activity feed on the dashboard

crm-hubspot.js returned activity:[] by design (Slice 2 = companies+contacts only).
Now that Asiago Touch 1 is live, the Recent-activity card gets real sales-email
engagements:

- fetchEmailActivity(): 3 batched requests — recent 20 email engagements (v3
  search, hs_timestamp desc) -> email->contact associations (v4 batch) -> contact
  names+company (v3 batch). Maps to the card's {who, what, when} shape with
  Sent:/Reply:/Bounced: verbs and relative times.
- Failure-isolated: a broken feed can never take down the companies/contacts
  payload that feeds the Opportunity Engine.
- Scope-aware: 403 -> activity:[] + activityNote about the missing
  sales-email-read scope; the dashboard card simply stays hidden until the scope
  is added. Zero frontend changes needed.

Rick action: add the sales-email-read scope to the HubSpot private app, then the
card lights up on its own (response cached max-age=120).

node --check clean; function-only change."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo
  echo "NEXT: in HubSpot add the 'sales-email-read' scope to the private app"
  echo "(Settings → Integrations → Private Apps → the CST app → Scopes), then open"
  echo "the Monti dashboard — Recent activity should show today's Touch 1 sends."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
