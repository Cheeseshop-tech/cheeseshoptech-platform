#!/bin/bash
# Double-click to commit + push: 11 food-service price-list SKUs, priced and live.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/data/montitrentini/catalog.json" \
  "src/data/montitrentini/items-seed.json" \
  "src/data/montitrentini/source/pricelist-2026-03-foodservice.json" \
  "docs/CUT_AND_WRAP_ITEM_GAP_2026-07-09.md" \
  "docs/STEFANO_QUEUE_2026-07-09.md" \
  "COMMIT FOOD SERVICE SKUS.command"

git commit -m "feat(catalog): add 11 food-service SKUs at their printed EXW prices

Source: 2026 03 Price list food service.pdf. These 12 codes were on the price list
but had never existed in catalog.json. Transcribed, not invented — the EXW
Elizabeth NJ column was verified identical to cost.fob on all 13 codes appearing
in both that sheet and this catalog.

- sharp-provolone: 01401 shredded 5 lb \$7.03
- grana-padano: 05123 grated \$8.37, 05124 flakes \$9.42, 05205 flakes tray \$9.50,
  05211 flakes 5.5 lb \$9.27
- NEW product cacio-provolone (Provolone): 20437 chili \$5.78, 20440 herbs \$5.78,
  20439 peppercorn \$5.78, 20441 truffle \$7.27
- NEW product bianco-duro-italia (Alpine & Specialty): 20569 \$7.10
- NEW product bianco-duro-europa (Alpine & Specialty): 20717 \$6.73

catalog 88 -> 99 SKUs / 34 -> 37 products; items-seed 116 -> 125.
availability follows the sheet: every 'PRE-ORDER NEEDED' item is preorder.

20569 carries 84 cases on hand and until now could not be quoted at all. It now
prices at \$7.10/lb and allocates cleanly against lot 1285661.

01314 WITHHELD — printed twice, for two different products at two different prices
(bruschetta \$7.08 / sharp provolone diced \$7.34). Nothing for it exists in the app.

No existing price moved: 05001 still totals \$5,378.40 on 10 cases. Unpriced SKUs
remain exactly the 17 C&W wedges."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed."
  echo "   Verify: Proforma lists 99 SKUs. Search 'cacio' and 'bianco'."
  echo "   Verify: 20569 shows in stock and quotes at \$7.10/lb."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
