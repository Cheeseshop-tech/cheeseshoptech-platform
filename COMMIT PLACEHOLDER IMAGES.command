#!/bin/bash
# Double-click to commit + push: low-res reference placeholders (internal only) + image health report.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/images.js" \
  "src/components/tools/pricing-tool.jsx" \
  "public/placeholders" \
  "docs/IMAGE_HEALTH_2026-07-09.md" \
  "COMMIT PLACEHOLDER IMAGES.command"

git commit -m "feat(images): low-res reference placeholders, internal surfaces only

Cloudinary hosts hi-res only — that rule does not move. These 17 thumbnails came
out of the Cut & Wrap assortment sheet (116x111 to 331x210 px, 150-211 ppi) and
are served LOCALLY from /public/placeholders, never uploaded.

- re-encoded PNG -> WebP: 836 KB -> 108 KB across all 17 (87% smaller)
- codeImageUrl(..., { allowPlaceholder }) — OPT-IN per call site. Only Proforma
  passes it. proposal-builder and proposal-view do not, so a buyer cannot be shown
  or sent one. Verified: allowPlaceholder appears nowhere under components/proposals.
- resolution order is manifest -> placeholder -> legacy convention. Placeholder sits
  ahead of the legacy path because that path builds a URL blindly and would mask the
  placeholder with a broken image. A real packshot always wins; it's in the manifest.
- Proforma row: dashed border + REF corner tag
- detail dialog: native size (no upscaling into a hero), 'Reference image only'
  banner, and Share / Download / Copy link are HIDDEN — each would put a 150 ppi
  image in a customer's hands
- per-code caveats surfaced in the dialog: 03044/03047 share one identical photo in
  the source sheet, and 01174 covers both a Wedge and a Disc

Placeholders self-retire: once sync-images.mjs finds a real asset for the code,
imageForCode wins and the placeholder is never reached.

Adds docs/IMAGE_HEALTH_2026-07-09.md — full audit. Headline: 99 catalog SKUs, 39
with a real packshot, 9 on placeholders, 51 with nothing. All 51 blanks are priced.
Also flags 20724, which is linked to a photo of cows (approved-for-press), and
20141 / 20533, which each carry two packshots for different pack sizes."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed."
  echo "   Verify: Proforma → search '7 oz'. Rows show a dashed thumbnail with a REF tag."
  echo "   Verify: click one → 'Reference image only', no Share/Download buttons."
  echo "   Verify: a proposal shows NO image for those SKUs."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
