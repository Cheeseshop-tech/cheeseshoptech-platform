#!/bin/bash
# COMMIT PRECUT CASE PRICING — 7 oz precuts priced per case + unpriced-SKU guard
# Double-click to commit and push. Closes the "$0 silent line" hazard from
# docs/CUT_AND_WRAP_ITEM_GAP_2026-07-09.md.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Precut case pricing + POR guard"
echo " (17 C&W SKUs priced · no more \$0 lines)"
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
  "src/lib/pricing-core.js" \
  "src/components/tools/pricing-tool.jsx" \
  "src/data/montitrentini/catalog.json" \
  "docs/PRECUT_CASE_PRICING_2026-07-28.md" \
  "COMMIT PRECUT CASE PRICING.command"
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
git commit -m "Precut case pricing + unpriced-SKU (POR) guard

- 17 C&W 7oz exact-weight wedge SKUs now priced PER CASE (12 pieces):
  unit 'case', cost.fobCase + cost.fobPiece from the 2026-03 AlmaCow/
  BDiPalo/Dekalb price list (EXW Elizabeth NJ). No more \$/lb display
  for piece-sold precuts.
- pricing-core: quoteUnitPrice understands unit 'case' (fobCase, falls
  back to fobPiece x piecesPerCase); lineLbs counts net weight for ALL
  units so precut cases ride the freight math; quoteOrder exposes
  unpricedCodes + per-line unit/unpriced flags.
- Proforma: per-line /lb vs /cs price basis, footer explains catch-weight
  (estimate) vs exact-weight (firm) totals, and PRINT IS BLOCKED while
  any line has no cost on file — closes the silent \$0-line hazard from
  CUT_AND_WRAP_ITEM_GAP_2026-07-09.md.
- Price-list tool: POR badge for unpriced SKUs, price column shows /lb
  or /cs, detail dialog shows 'Price on request' instead of \$0.00.
- Item-number conflicts vs the price list (03047/03073, 05050/05091,
  05099/05600, 40162/40184, 01174 wedge+disc same code) recorded in
  _priceNote fields + docs/PRECUT_CASE_PRICING_2026-07-28.md — catalog
  codes kept pending Inventory Manager ruling."
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
echo "✅ Pushed. Precut case pricing is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
