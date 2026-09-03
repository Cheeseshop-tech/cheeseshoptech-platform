#!/bin/bash
# Double-click to commit + push: Cut & Wrap food-service items across Media Hub + price list app.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "scripts/build-items-seed.mjs" \
  "src/data/montitrentini/catalog.json" \
  "src/data/montitrentini/items-seed.json" \
  "src/data/montitrentini/source/cut-and-wrap-spec.json" \
  "src/data/montitrentini/source/cut-and-wrap-thumbnails" \
  "src/data/montitrentini/source/pricelist-2026-03-foodservice.json" \
  "docs/CUT_AND_WRAP_ITEM_GAP_2026-07-09.md" \
  "docs/STEFANO_QUEUE_2026-07-09.md" \
  "COMMIT CUT AND WRAP ITEMS.command"

git commit -m "feat(catalog+media-hub): add the Cut & Wrap 7 oz EW line, unpriced

Source: MT Assortment Cut nWrap FW.pdf (20 rows) + 2026 03 Price list food service.pdf.

Media Hub
- new source src/data/montitrentini/source/cut-and-wrap-spec.json — the only place
  UPC, case pack, and packaging type exist for the exact-weight wedges
- build-items-seed.mjs takes it as a third input. For the codes it names, the
  SKU-level record wins over catalog.json's product-level name + blurb (one blurb
  cannot describe both a 30 lb wheel and a 7 oz wedge). Never clobbers a filled
  field with an empty one; never touches a code it doesn't list.
- items-seed: 112 -> 116 (03047, 05050, 05099, 40162 new; 13 enriched)

Price list app
- catalog.json: 71 -> 88 SKUs. All 17 C&W wedges added under their existing
  products with real pack data (12 x 7 oz EW, 5.25 lb net / 6 lb gross, pallet
  Ti x Hi, 144 cases/pallet, 150-day shelf life). availability derived from the
  2026-07-09 sheet.
- PRICING LEFT BLANK per Rick: cost.fob null, priceOnRequest true. No price for
  this line exists in any 2026-03 list. Calculator formulas untouched — verified
  05001 still quotes $7.47/lb and $5,378.40 on 10 cases.
- KNOWN HAZARD: quoteUnitPrice returns null for these but quoteLineTotal returns
  0, so an unpriced SKU shows a \$0 line with no warning. 17 SKUs exposed. Guard
  the engine or land the price update.

Inventory
- 13 of 17 already in inventory.json. 03047 / 05050 / 05099 / 40162 are not on the
  2026-07-09 availability sheet and cannot be hand-added (file is regenerated).

Captured, not applied
- source/pricelist-2026-03-foodservice.json: 12 priced SKUs on the food-service
  list that catalog.json has never carried. Their EXW column was verified to be
  exactly cost.fob (13/13 exact match on overlapping codes).

Images NOT uploaded. Every packshot in the C&W sheet is a 116x111-331x210 px
thumbnail (150-211 ppi) against 2000-6732 px existing Cloudinary assets. Staged
under source/cut-and-wrap-thumbnails/ as a checklist for the hi-res ask. 13 of 20
C&W items still have no usable image, and 03044/03047 share one photograph.

Blocked on Stefano: docs/STEFANO_QUEUE_2026-07-09.md (13 questions)."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed."
  echo "   Verify: Media Hub → Items lists 116."
  echo "   Verify: price list app lists 88 SKUs; the 17 C&W wedges show no price."
  echo "   Verify: quote 05001 × 10 cases still totals \$5,378.40."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
