#!/bin/bash
# COMMIT QUOTE BUILDER PICKER — the price list open on arrival + a Pro Forma-matched search bar.
# Double-click to commit and push. Follow-up to the Quote Builder commit (2e603c1).

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Quote Builder — price list open"
echo " on arrival + Pro Forma-matched search"
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
  "docs/BUILD_LOG.md" \
  "COMMIT QUOTE BUILDER.command"
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
git commit -m "Quote Builder: price list open on arrival, Pro Forma-matched search

The SKU picker was a search box that revealed nothing until you typed. Wrong
instrument for 'arrange the price list for this conversation' — a rep builds a
rate card by browsing what's for sale. Now the whole list (106 SKUs) is on
screen the moment the tab opens, in a scrollable window, priced at the selected
class of trade so the numbers on screen are the numbers that will print.

- Search NARROWS the list, it no longer summons it; the field is now the same
  element as Pro Forma's — identical placeholder, classes and position above
  the list it filters
- Click a row to add, click again to remove; added rows stay marked and survive
  filtering, and the search is no longer cleared on add (reps add several SKUs
  off one search)
- Each row carries the packshot, category, tier price with unit, and SKU code;
  unpriced SKUs show POR rather than a number
- Footer line reports 'Showing N of M SKUs at <tier> pricing'"
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
echo "✅ Pushed. Quote Builder picker is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
