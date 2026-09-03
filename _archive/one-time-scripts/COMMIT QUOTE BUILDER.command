#!/bin/bash
# COMMIT QUOTE BUILDER — open price list, reference palette, Monti logo via the Media Hub,
# and the margin/markup pricing methods. Double-click to commit and push.
# Follow-up to the Quote Builder commit (2e603c1).

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Quote Builder — palette, logo,"
echo " open price list, margin/markup methods"
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
  "src/lib/images.js" \
  "src/lib/quotes-log.js" \
  "netlify/functions/quotes.js" \
  "src/components/proposals/proposal-view.jsx" \
  "src/data/montitrentini/brand-kit.json" \
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
git commit -m "Quote Builder: reference palette, Media Hub logo, margin/markup pricing

DIRECTIVE — brand assets resolve through the Media Hub manifest, never a
hand-typed Cloudinary id (brandAssetUrl in lib/images.js). brand-kit.json had
the logo as a folder-less id and wordmark/favicon/seal/hero under a
monti/brand/* folder that does not exist in the account, so the Monti logo was
silently 404ing on every surface that renders it — the Proposal cover included,
on production. A kit reference is now a hint resolved against the manifest, and
returns \"\" when the asset genuinely is not there rather than a broken img.
Transparent-safe delivery: the mark is a PNG with alpha and the old
c_pad,b_white path would have boxed it in white on the cream sheet.

Palette sampled from FreshDirect_PricingAOneSheet.pdf at 150dpi, not eyeballed.
Row banding is Heritage Cream <-> Casa Paper (was a green tint); divider bar and
PDO badge use Alpine Mint #C8E2C5 from the kit secondary (was a washed accent);
non-PDO badge is warm khaki #EFE8D1 on bronze #796A2E so Mountain reads as not-a-
PDO. All 13 surface colours now match the reference to <=1/255 per channel.

Pricing method: a second dropdown beside class of trade offering Markup % on
cost or Gross profit margin %, with a manual figure that REPLACES the tier
preset rather than stacking on it. These are different arithmetic — 25% on
\$8.07 is \$10.09 as markup, \$10.76 as margin — so a live worked example off a
real SKU prints both readings while choosing. Margin guarded to 0-99.9%; print
blocked while invalid; the picker list reprices with the method so what the rep
reads is what prints; the quote log records priceMode + pricePct because tierId
alone no longer explains a logged price.

Promo is now a straight discount off the regular price (a 10% promo prints 10%,
not the 8.7% the additive customPct lever produced)."
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
