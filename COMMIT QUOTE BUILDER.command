#!/bin/bash
# COMMIT QUOTE BUILDER — the one-page branded rate card + the quotes-issued log.
# Double-click to commit and push. Closes QUOTING_TOOL_PRINCIPLES §9's last
# "not captured yet" row (quotes issued) and fixes the hardcoded TODAY constant.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Quote Builder + quotes-issued log"
echo " (QUOTE_BUILDER_SPEC_2026-08-13)"
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
  "src/lib/quotes-log.js" \
  "netlify/functions/quotes.js" \
  "src/components/tools/pricing-tool.jsx" \
  "src/data/montitrentini/client.config.json" \
  "src/data/_template/client.config.json" \
  "docs/QUOTE_BUILDER_SPEC_2026-08-13.md" \
  "docs/QUOTING_TOOL_PRINCIPLES.md" \
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
git commit -m "Quote Builder: one-page branded rate card + quotes-issued log

New 'Quotes' tab in Pricing & Inventory — the FreshDirect-style one-sheet:
header, optional story panels, one pricing table, footer. Print/PDF only for
v1; a trackable shareable link stays the Proposal engine's job.

One engine, three arrangements (purpose selector swaps columns + copy):
- New Customer Negotiation: Item/Type/Format & Aging/SKU/\$ per lb/Net wt,
  story panels on, filtered to the audience the class-of-trade tier implies
- Price Change Notification: Previous/New/change, story panels off,
  'Previous' auto-filled from the quotes log
- Promo Offer: Regular/Promo/You Save, offer window, order-level promo %
  (rides the existing customPct lever) with a per-line override

Closes QUOTING_TOOL_PRINCIPLES §9's last 'not captured yet' row: quotes issued
now log to a shared Netlify Blobs store ('quotes'), mirroring the movement
history pair exactly — same auth guard, self-logging, caps and client seam.
One record per SKU line, grouped by quoteId, written on Generate/Print only.

Also fixes pricing-tool.jsx's hardcoded TODAY = '2026-06-06' (flagged
2026-07-28) — recorded sales and printed proformas now carry the real local
date. Adds brand.contact to client.config.json (+ the tenant template) so the
footer contact block is canonical, not hardcoded in the component."
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
echo "✅ Pushed. Quote Builder is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
