#!/bin/bash
# COMMIT QUOTE OUTPUT LETTERHEAD — full-bleed cream, no browser header/footer, Net 15 terms,
# corrected footer email + attribution. Baked into the shared output generator, so it applies to
# all three quote purposes. Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Quote output — full-bleed letterhead"
echo " + Net 15 terms + footer corrections"
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
  "src/data/montitrentini/client.config.json" \
  "src/data/montitrentini/brand-kit.json" \
  "src/data/_template/client.config.json" \
  "docs/BUILD_LOG.md" \
  "docs/HANDOFF_2026-08-13_quote-builder.md" \
  "COMMIT QUOTE OUTPUT LETTERHEAD.command"
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
git commit -m "Quote output: full-bleed letterhead, Net 15 terms, footer corrections

Baked into buildQuoteHtml(), so all three purposes get them - not per-document.

The white border and the CheeseShop reference were the same bug. The sheet set
@page margin 0.4in, and that band is exactly where the browser draws its OWN
header and footer - on the Cowbell export: the title, the timestamp,
https://cheeseshoptech.com/?client=montitrentini and 'Page 1 of 1'. The house
URL on a buyer-facing quote was the browser, not our markup. Margin is now 0, so
there is no band and the browser drops both; the page inset moved into body
padding (38px 44px 30px), clear of the ~0.25in printers cannot mark.

The cream also stopped partway down the page: body carried the background but
its box is only content-tall, so a short quote printed white below the contact
line. Background now also on html, whose background propagates to the page
canvas - cream fills the whole sheet, and every sheet of a multi-page quote.
Verified at true Letter size (816x1056) with 884px of content.

Payment terms Net 15 on every purpose, under the date line in Mountain Ink
rather than accent green (the date is what expires; two green lines flatten
that). Canonical at config.pricing.paymentTerms; blank prints no line. Slot
added to the tenant template.

Footer: ordersEmail -> Customerservice@montitrentini-USA.com. brand-kit
attribution 'Imported by Monti Trentini USA' -> 'from Monti Trentini' - reads as
a signature under the motto. That string also surfaces on the Proposal cover
eyebrow and in Content Engine copy; changed at the kit to keep one source.

Caveat CSS cannot reach: Chrome honours @page margins only when the print
dialog's Margins is Default. If a URL reappears, set Margins to None."
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
echo "✅ Pushed. Netlify will rebuild automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
