#!/bin/bash
# COMMIT FEED CODE RENUMBER — wedge SKUs renumbered to the warehouse-feed /
# price-list item numbers per Rick's ruling 2026-07-28.
# Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Wedge SKU renumber -> feed codes"
echo " 03047->03073  05050->05091  05099->05600  40162->40184"
echo "=============================================="
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "src/data/montitrentini/catalog.json" \
  "src/data/montitrentini/items-seed.json" \
  "src/data/montitrentini/sales-monthly.json" \
  "src/lib/images.js" \
  "public/placeholders/03073.webp" \
  "public/placeholders/05091.webp" \
  "public/placeholders/05600.webp" \
  "public/placeholders/40184.webp" \
  "docs/PRECUT_CASE_PRICING_2026-07-28.md" \
  "COMMIT FEED CODE RENUMBER.command"
git add -u public/placeholders/
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "Renumber 4 wedge SKUs to warehouse-feed codes (Rick, 2026-07-28)

Feed/price-list numbering wins the item-number conflict recorded in
PRECUT_CASE_PRICING_2026-07-28.md — the warehouse feed carries these
products under its own codes, so the old catalog codes could never
join to inventory.

- 03047 -> 03073  Aged Asiago (Vecchio) 9 mo, C&W 7oz EW Wedges ATM, 12/cs
- 05050 -> 05091  Grana Padano 12 mo, C&W 7oz EW Wedges Vacuum, 12/cs
- 05099 -> 05600  Parmigiano Reggiano, C&W 7oz EW Wedges Vacuum, 12/cs
- 40162 -> 40184  Pecorino Romano PDO, C&W 7oz EW Wedges Vacuum, 12/cs
  (40184 keeps \$4.95/pc \$59.43/cs from the PDF; not in the feed yet —
  join is ready the day the warehouse adds it)

NEW: Apericheese product (30014-17 Yellow/Red/Orange/White, 8x5.3oz,
priced from the re-uploaded PDF: \$29.58/\$31.89/\$29.28/\$31.39 per cs) + Aged Black Truffle
wedge as item 'tbd' at \$59.15/cs exactly as the sheet prints it.
NEW SKU: 04182 Vezzena C&W 7oz EW Wedges Vacuum, 12/cs at \$53.14/cs
NEW SKU: 04211 Alpeggio C&W 7oz EW Wedges Vacuum, 12/cs at \$53.97/cs
(Rick, 2026-07-28) — was on the price list with warehouse stock
(24 avail + 24 in transit) but had no catalog SKU. Joins the feed
immediately. Also: 05600 packing now carries 'Aged 18 months'; seed
descriptions filled for 03073/05091/05600/04211.

Former codes preserved in each SKU's _formerCode. Renumbered
everywhere the code lives: catalog.json, items-seed.json,
sales-monthly.json skuCode history, images.js placeholder set + notes,
and public/placeholders/*.webp filenames. 03073/05091/05600 now join
to the 2026-07-28 inventory feed (0 cases on hand today, but visible)."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo "   If it says 'nothing to commit', this work may already be committed."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   Check your connection, then double-click 'FIX GIT LOCK AND PUSH.command'"
  echo "   (or re-run this file) to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Wedge SKUs now match the warehouse feed numbering."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
