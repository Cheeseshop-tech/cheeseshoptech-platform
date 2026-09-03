#!/bin/bash
# Double-click to commit + push: CRM-05 fix + the wider read-failure-masking rollout
# (CRM, campaigns, pricing, media) it surfaced.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/crm.js" \
  "src/lib/campaigns.js" \
  "src/lib/prices.js" \
  "src/lib/use-pricing-data.js" \
  "src/lib/media.js" \
  "src/components/crm/crm-dashboard.jsx" \
  "src/components/crm/crm-page.jsx" \
  "src/components/tools/booth-tool.jsx" \
  "src/components/home/command-center.jsx" \
  "src/components/campaigns/campaigns-page.jsx" \
  "src/components/campaigns/campaign-detail.jsx" \
  "src/components/tools/price-list.jsx"

git commit -m "fix(data): stop masking failed reads as fake-empty success (CRM-05 + rollout)

CRM-05 root cause, confirmed live 2026-09-03: the CRM tab showed 'HubSpot live check
0 accounts' despite HubSpot holding 745 real companies. crm-hubspot.js does no
tenant/portal filtering at all - a 200 always means real data - but getCrmData() in
crm.js treated ANY non-200 (401 expired session, 403, 5xx) as a real empty account
book via emptyDataset(). Confirmed by re-signing-in: same code path, 200, all 745
accounts. Fix: a failed read now resolves null, the same no-data sentinel every
current caller already treats as no-data - crm-page.jsx's existing error state
picks it up for free. crm-dashboard.jsx's CrmDashboard/OrdersPage needed an explicit
null guard (would have thrown on data.pipeline.map / summarize(null) otherwise).

Grepping for the same 'if (!res.ok) return <fake-success>' shape found it repeated
in ~9 other files. Most turned out fine on inspection - history.js, quotes-log.js,
store.js and market-news.js already fall back to a REAL secondary source (local
ledger, seed catalog, bundled sample) and market-news.js already labels itself
'isSample' at runtime specifically to avoid a false-live badge (guardrails #7/#8).
Left those alone.

Two places were genuinely broken, one of them a real data-loss risk, not just a
display bug:

- crm.js getOutreach() + campaigns.js getCampaignDefs/getCampaignState/getEnrichment/
  getRepCalls: these back several full-document last-writer-wins autosave editors
  (the CRM console's status/notes, Booth's rep-coverage tagging, the campaign
  checklist gate, rep-call capture). A failed read silently degrading to {entries:{}}
  meant a save immediately AFTER a failed load would overwrite real saved data with
  nothing but the one new edit - the CRM console and Booth's rep tagging both write
  the SAME outreach document, so this was double-exposed. Fix: reads now resolve
  null on failure; every editor tracks whether its initial load actually succeeded
  and refuses to schedule a save otherwise, showing 'couldn't load saved progress -
  refresh before editing' instead of silently continuing.

- prices.js fetchPriceState() / use-pricing-data.js: 'the tool is the pricing truth'
  (Rick, 2026-08-21) - but a failed read looked identical to 'nothing has ever been
  published', and price-list.jsx's admin page would say so outright. Worse: Save
  Draft sends a COMPLETE price map every time (buildPriceMap() falls back to
  draftOf()/publishedOf() for every SKU not being actively typed), so saving on top
  of a failed load would have wiped every other SKU's real published price and then
  PUBLISHED that wiped draft live. Fix: fetchPriceState() now flags unavailable:true
  on a genuine failure; usePricingData() exposes priceListSource ('live'/'bundled'/
  'unavailable') alongside the existing stockSource; price-list.jsx blocks Save Draft
  and shows an explicit warning instead of the false 'no published list' message.

media.js listAssetsPage(): a 401 already threw and got a visible 'Media didn't load'
toast in media-hub.jsx; any OTHER failure (403/5xx) silently returned an empty page.
Now throws on any failure, so every failure gets the same visible toast instead of
a silent empty-looking grid.

Not touched: history.js, quotes-log.js, store.js, market-news.js (already correct,
see above). Build clean (2056 modules, verified via the sandbox's --emptyOutDir
false workaround for the known dist/.DS_Store unlink quirk)."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "   Worth a quick pass after deploy: reload the CRM tab, the Campaigns tab, and"
  echo "   the Price List — normal operation should look identical to before."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
