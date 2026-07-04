#!/bin/bash
# Double-click to commit + push: item spec line (weight/pack/milk/age), long-desc toggle, PNG download + share.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/items.js" \
  "src/components/media/items-panel.jsx" \
  "src/components/media/media-hub.jsx" \
  "COMMIT ITEM SPECS AND SHARE.command"

git commit -m "feat(media-hub): item spec line, long-description view, PNG download + share

- item record gains milkType + minAge (with weight, pack size, UPC, short/long
  desc, certification; still NO pricing)
- specLine(item) helper: 'weight · pack · milk · age' — rides in the asset
  dialog header (next to name + item number), on the grid tile thumbnails, and
  in the Items tab list
- asset dialog view mode: 'View long description' toggle with copy button
- asset dialog actions: Download PNG (fl_attachment,f_png — always a real PNG)
  and Share (native share sheet, clipboard fallback) beside Copy delivery URL
- item edit section + Items editor: Milk type and Minimum age fields
- onCopy now labels its toast (fixes 'Link copied' on description copies)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: open the Alpeggio wheel photo — spec line in header + tile, long-desc toggle, PNG + Share buttons."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
