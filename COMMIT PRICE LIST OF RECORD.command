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
echo " COMMIT: Price List of record + locked"
echo " per-line custom price on quotes"
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
  "netlify/functions/quotes.js" \
  "src/components/tools/quote-builder.jsx" \
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
git commit -m "Price List of record + locked per-line custom price on quotes

PRICE LIST (new tab). The pricing tool is now the pricing truth: edit a base
cost, save a draft, publish it with an effective date and valid-until date, and
every change is recorded against the person who made it.

Edits the FOB BASE COST (cost.fob, or cost.fobCase for exact-weight precuts) —
the one number the engine derives from, so a single edit moves class-of-trade
tiers, manual margin/markup and promo prices together rather than three tier
prices drifting apart.

Two stages on purpose. Save writes a private draft nobody can quote; Publish is
a separate act that stamps the window, bumps the version and goes live. Publish
stays disabled until a draft exists. The overlay in use-pricing-data.js applies
published costs onto catalog.json at the single read point, so Pro Forma, the
Quote Builder, proposals and the storefront all quote the new number without
knowing the price store exists; catalog.json is never mutated.

Audit trail in Blobs store prices (published / --draft / --log). The who is read
from the verified Identity session server-side, never from the request body.
Writes are admin/client-admin only: a signed-in base rep gets 403 on write while
reads still succeed.

A drag-and-drop source document (xlsx/PDF/csv) attaches the HQ sheet as
provenance and rides onto the published version. Deliberately NOT parsed — the
numbers stay hand-typed so a misread cell can never move a price on its own.

QUOTES: a locked custom-price field per line. Every sheet line ends with a
Custom button; the price cell is plain text until pressed, so no accidental
keystroke can reprice a quote. Verified: three selected lines expose zero
editable price inputs until one is explicitly unlocked, and unlocking one leaves
the others locked. Toggling off restores the list price.

One-time by design — React state only, no localStorage, nothing sent to the
price store, so it dies on reload or sign-out. But the issued-quote log now
carries custom + listPrice per line, so the record reads we quoted this at 6.75
against an 8.07 list. Ephemeral in the UI, permanent in the record.

30/30 unit assertions on the price overlay and the fat-finger validator.
Not yet exercised against real Blobs — npm run dev does not serve functions."
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
