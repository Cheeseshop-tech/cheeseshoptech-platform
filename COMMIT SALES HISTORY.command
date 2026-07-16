#!/bin/bash
# Double-click to commit + push: reconciled sales history (2026-07-15).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/data/montitrentini/sales-history.json" \
  "src/data/montitrentini/source/sales_history_sku_match_2026-07-15.csv" \
  "src/data/montitrentini/source/sales_history_sku_overrides_2026-07-15.json" \
  "Monti_Trentini_SKU_Match_Review.xlsx" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT SALES HISTORY.command"

git commit -m "data(sales-history): reconcile 7 broker exports to SKU, stage for forecasting

- sales-history.json: 39 SKUs, 2024 full year + 2025 YTD (through 10/15) + annualized,
  lbs and case-equivalent (via catalog.json pack.netLb), aggregate and per-customer.
  99.4% of 2025 dollar volume matched to a real catalog SKU; 5 items confirmed
  interactively by Rick (Piave Vecchio -> 03003, Fioretto/Urbani/Aged Truffle Cheese ->
  20533, Caciotta Rustiga with Truffle = 20150's working name).
- Source audit trail: sku_match_review.csv (all 66 unique item descriptions, confidence
  tier, matched SKU) and overrides.json (Rick's manual confirmations with notes) under
  src/data/montitrentini/source/.
- Bug caught before shipping: first matching pass used items-seed.json as its corpus and
  put 52.7% of 2025 dollars (incl. the #1 item, ~$2.1M) on SKU codes that don't exist in
  catalog.json's active 99-SKU list (items-seed.json carries 26 stale/legacy codes).
  Rebuilt against catalog.json-active SKUs only; both large items self-corrected.
- NOT wired into forecast-core.js/history.js — two open flags, see HANDOFF.md:
  (1) SKU 20150 computes ~44,000 cases sold 2025 YTD vs inventory.json's own note of
      ~660/year ('TONY 55 per month') -- 67x gap, needs Rick/Stefano to reconcile before
      any reorder logic trusts either number.
  (2) forecast-core.js needs monthly periods; this data is annual only -- staged as its
      own file rather than force-fit into the monthly movement-ledger shape."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed."
  echo "⚠️  Data is staged, NOT wired into forecasting yet — two open flags in HANDOFF.md."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
