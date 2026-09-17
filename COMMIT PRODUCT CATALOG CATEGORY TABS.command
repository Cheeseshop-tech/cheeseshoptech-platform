#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/lib/catalog-categories.js src/components/catalog/buyer-catalog.jsx "COMMIT PRODUCT CATALOG CATEGORY TABS.command"

git commit -m "$(cat <<'EOF'
Product Catalog: replace item-code tabs with pack-format category tabs

The category tabs on the buyer-facing Product Catalog were reading
r.imgs[0]?.category -- the photo's Cloudinary folder name (lib/images.js).
Most photos live in a folder named after their own item number, so the
tab row was mostly a list of SKUs (e.g. "01021", "20141") instead of
anything a buyer could actually browse by. Rick: "remove the item code
tabs they don't make sense."

New: src/lib/catalog-categories.js classifies each item by its pack
format (packSize/weight from the item record, lib/items.js) instead of
the photo's folder, into a fixed tab order:

  Cut & Wrap (25) -- both wedge sizes (7 oz + 5.3 oz Apericheese) under
    the term Rick/Monti actually use for this program, not "pre-cut"
  Whole Wheels (41), Quarter Wheels (12), Eighth Wheels (5),
  Cylinders & Ropes (12), Flavored Caciotta (10),
  Shredded/Grated/Flakes (5), Gift & Sampler Sets (4),
  Specialty Cuts & Other (9)

All 123 current SKUs land somewhere; anything unrecognized falls into
Specialty Cuts & Other rather than disappearing. Media Hub's own
folder-based tabs are untouched -- this only changes what the Product
Catalog page reads.

Also fixed two smaller leaks of the same item-code data onto the buyer
page: the grid-card fallback line (was calling the old categoryOf with
the wrong shape) and the item detail lightbox badge (was showing the
raw Cloudinary folder code, e.g. "01021", instead of a real category --
now shows the pack-format category and always renders, not just when a
photo exists).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Sq8TrsaCn76iTrU7F5GPZu
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

read -n 1 -s -r -p "Press any key to close..."
echo
