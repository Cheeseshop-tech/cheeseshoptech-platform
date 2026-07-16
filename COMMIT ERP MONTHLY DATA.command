#!/bin/bash
# Double-click to commit + push: ERP monthly sales history 2021-2024, parsed + validated (2026-07-15).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/data/montitrentini/source/erp_monthly_raw_2021-2024.json" \
  "src/data/montitrentini/source/erp_monthly_resolved_2021-2024.json" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT ERP MONTHLY DATA.command"

git commit -m "data(erp-monthly): parse + validate 2021-2024 ERP monthly sales (Rick's own export)

- 3 ERP PDFs (2024.pdf partial-year, 2023-2022.pdf, 2022-2021.pdf) parsed into 346 item-year
  rows with true monthly granularity -- unlike the broker-export sales-history.json (annual
  only), this data can actually feed forecast-core.js's runRate()/yoyGrowth() for 2021-2024.
- Double-validated: every primary year checksums to \$0.00 diff against the PDF's own printed
  Totale Generale; 2022 (present in both two-year files) independently agrees to the penny
  across both parses -- not just checksum luck.
- Two parser bugs caught and fixed before trusting output: subtotal lines
  (Totale Intestatario/Provincia) were being misread as item continuation data (~50% over-count);
  the grand-total checksum itself was summing 13 numbers instead of 12 (~50% under-count in
  validation only, not the underlying data).
- Cross-referenced 83 distinct item codes against catalog.json's active SKU list (same
  discipline that caught the phantom-SKU bug earlier today): 92.2% of \$ resolved. Applied
  Rick's already-confirmed mapping (20471 Urbani Aged Truffle Cheese -> 20533, discontinued
  label, same cheese for forecasting purposes). 29 smaller legacy codes left UNRESOLVED and
  listed in erp_monthly_resolved_2021-2024.json -- not guessed.
- Checked customer overlap re: the open Tony's Fine Foods question -- not present in this
  16-customer ERP dataset either. Doesn't resolve it, rules out 'just missing from one export.'
- NOT merged into sales-history.json or history.js yet -- open decision for Rick: how a
  monthly 2021-2024 dataset and an annual-only 2025 dataset combine. See HANDOFF.md."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed."
  echo "⚠️  Staged only -- not wired into forecast-core.js yet. Merge decision is yours (see HANDOFF.md)."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
