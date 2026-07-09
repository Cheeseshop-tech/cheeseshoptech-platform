#!/bin/bash
# Double-click to commit + push: Movement lists every SKU we sell, not just stocked ones.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/tools/pricing-tool.jsx" \
  "COMMIT MOVEMENT ALL PRODUCTS.command"

git commit -m "fix(movement): unstocked SKUs no longer vanish from forecasting

Movement iterated Object.keys(inventory.skus), so a catalog SKU with no stock row
was invisible — indistinguishable from a product that doesn't exist. Four items
(03047, 05050, 05099, 40162) are in the catalog but not yet on the availability
sheet, and they simply disappeared.

- codes = union(inventory.skus, catalog SKUs) -> 116 rows
- Active / All products toggle. Active defaults on and is byte-identical to the
  old view (47 rows), so nothing regresses; the 69 dormant SKUs are one click away
- a row with no stock, nothing in transit, and no demand now reads
  'No stock · no demand' instead of a green 'Covered', which was a lie
- row cap raised 60 -> 200 so the full catalog fits
- forecast-core already treats a missing inventory row as 0 on-hand / 0 in-transit;
  verified no phantom reorder flags on the four new codes"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: Pricing tool → Movement → 'All products (116)'."
  echo "   03047 / 05050 / 05099 / 40162 should list as 'No stock · no demand'."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
