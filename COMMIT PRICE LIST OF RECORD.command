#!/bin/bash
# COMMIT PRICE LIST OF RECORD — the pricing tool becomes the pricing truth: editable FOB base
# costs, draft -> publish with an effective window, and a permanent who/when change record.
# Double-click to commit and push.
#
# NOTE: publishing a price list from the app changes what every quote surface quotes.
# Nothing changes for buyers until someone actually hits Publish in the new tab.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Price List of record"
echo " editable + published + audited"
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
  "netlify/functions/prices.js" \
  "src/lib/prices.js" \
  "src/lib/use-pricing-data.js" \
  "src/components/tools/price-list.jsx" \
  "src/components/tools/pricing-tool.jsx" \
  "docs/BUILD_LOG.md" \
  "COMMIT PRICE LIST OF RECORD.command"
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
git commit -m "Price List of record: editable FOB costs, publish with effective window, audit trail

New Price List tab — the pricing tool is now the pricing truth. Edit a base
cost, save a draft, publish it with an effective date and valid-until date, and
every change is recorded against the person who made it.

Edits the FOB BASE COST (cost.fob, or cost.fobCase for exact-weight precuts) —
the one number the engine derives from, so a single edit moves class-of-trade
tiers, manual margin/markup and promo prices together rather than three tier
prices drifting apart.

Two stages on purpose. Save writes a private draft nobody can quote; Publish is
a separate act that stamps the window, bumps the version and goes live. Prices
feed buyer-facing quote sheets that print without a second look, so a stray
keystroke must not reach a customer. Publish stays disabled until a draft exists.

The overlay is the trick: applyPublishedPrices() overlays published costs onto
catalog.json at the single read point (use-pricing-data.js), so Pro Forma, the
Quote Builder, proposals and the storefront all quote the new number without
knowing the price store exists. catalog.json keeps shipping the spreadsheet
baseline and is never mutated; the table shows Bundled vs Published side by side.
Inventory and prices are now awaited together and applied in one setData — two
independent setData(base) calls would race and drop one another's result.

Audit trail in Blobs store 'prices' (published / --draft / --log). One row per
changed value with from/to, one per publish with version and window. The 'who'
is read from the verified Identity session server-side, never from the request
body — an audit trail the caller can forge is not an audit trail.

Writes are admin/client-admin only via requireWriteAuth: a signed-in base rep
gets 403 on write while reads still succeed. Verified by test, along with a
fat-finger guard that rejects negatives, zero, non-numeric and absurd values
without storing them. 30/30 unit assertions across the overlay and validator,
including that the original catalog object is never mutated.

Not yet exercised against real Blobs — npm run dev does not serve functions, so
Save/Publish were driven client-side and the handler smoke-tested in Node. First
real write happens on the deploy."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
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
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Netlify will rebuild. Open Pricing & Inventory > Price List."
echo
read -n 1 -s -r -p "Press any key to close..."
