#!/bin/bash
# COMMIT PRECUTS PRICE LIST FILTER — Quote Builder: Precuts filter, $/case+$/each,
# and hand-typed "Price list prepared by" / Contact fields
# Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Precuts price list filter (Quote Builder)"
echo " (Precuts-only toggle · add-all · \$/case + \$/each ·"
echo "  prepared-by + contact fields)"
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
  "src/components/tools/quote-builder.jsx" \
  "docs/PRECUTS_PRICE_LIST_FILTER_2026-08-31.md" \
  "COMMIT PRECUTS PRICE LIST FILTER.command"
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
git commit -m "Quote Builder: Precuts price list filter, per-case/per-each pricing, prepared-by field

- New 'Precuts only' toggle narrows the SKU picker to unit:\"case\" wedges
  (the 24 exact-weight 7oz precuts) so a Precuts price list doesn't mean
  hand-searching every code.
- 'Add all shown' bulk-adds every SKU currently narrowed into view (by the
  Precuts filter and/or search) in one click.
- New \$ / Each column on the New Customer Negotiation rate card, shown
  whenever a case-priced line is on the sheet — precuts now read out both
  per case (authoritative, unchanged) and per each (7oz piece), never
  per pound. Derived as casePrice / piecesPerCase off the same engine
  price, so it can never drift from the case number.
- Picker rows show the per-each price under the case price for precuts
  while browsing, before a line is even added.
- New hand-typed 'Price list prepared by' (statement) and 'Contact info'
  fields on the header-copy card, for every purpose (not just Precuts
  sheets). Per-quote, not persisted, separate from the standing brand
  contact block already in the footer — prints as the first line of that
  same footer contact block when filled in, otherwise prints nothing.
- No pricing math changed: pricing-core.js, catalog.json and the Price
  List cost editor are untouched — display/workflow only, in Quote
  Builder. See docs/PRECUTS_PRICE_LIST_FILTER_2026-08-31.md."
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
echo "✅ Pushed. Precuts price list filter is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
