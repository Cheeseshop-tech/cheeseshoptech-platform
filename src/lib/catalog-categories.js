// Product Catalog category tabs — PACK-FORMAT based (Rick, 2026-09-17).
//
// Replaces the old tabs, which were really just item-code folders: the Catalog borrowed its
// "category" from the photo's Cloudinary folder (lib/images.js), and most photos live in a
// folder named after their own item number, not a real category. That made the tab row mostly a
// list of SKUs — noise to a buyer, not a way to browse. This module classifies by what a buyer/
// rep actually asks for: the pack format on the price list (packSize/weight from the item
// record, lib/items.js), independent of which Cloudinary folder a photo happens to sit in.
// Media Hub's own folder tabs are untouched — only the buyer-facing Product Catalog reads this.
//
// "Cut & Wrap" (Rick, 2026-09-17) covers both wedge sizes Monti packs this way — the 7 oz Exact
// Weight wedges (the bulk of the line) and the 5.3 oz Apericheese wedges — under the term Rick
// and Monti actually use for this program, rather than "pre-cut" (see e.g. images.js's "Cut &
// Wrap assortment sheet" reference / CUT_AND_WRAP_ITEM_GAP docs). One tab, not split by ounce.
//
// CATEGORY_ORDER is a fixed display order (not sorted by count) so "Cut & Wrap" — the
// highest-volume format — leads. A tab only renders if at least one item falls in it
// (buyer-catalog.jsx filters CATEGORY_ORDER against actual counts).
export const CATEGORY_ORDER = [
  "Cut & Wrap",
  "Whole Wheels",
  "Quarter Wheels",
  "Eighth Wheels",
  "Cylinders & Ropes",
  "Flavored Caciotta",
  "Shredded, Grated & Flakes",
  "Gift & Sampler Sets",
  "Specialty Cuts & Other",
];

/**
 * Classify one item record (lib/items.js shape: sku, name, packSize, weight, ...) into one of
 * CATEGORY_ORDER. Rule order matters — more specific pack formats are checked before broader
 * ones (e.g. a 7 oz caciotta wedge matches "Cut & Wrap" before it ever reaches the "Flavored
 * Caciotta" catch-all). Anything that matches nothing lands in "Specialty Cuts & Other" — new
 * SKUs never disappear, they just start in the catch-all until this list is taught their format.
 */
export function categoryForItem(it) {
  const name = (it?.name || "").toLowerCase();
  const pack = (it?.packSize || "").toLowerCase();
  const wt = (it?.weight || "").toLowerCase();

  if (
    pack.includes("7 oz exact weight") || wt === "7 oz" || name.includes("7 oz ew") ||
    pack.includes("5.3 oz exact weight") || wt === "5.3 oz"
  ) {
    return "Cut & Wrap";
  }
  if (pack.includes("1/8 wheel") || name.includes("1/8 wheel")) {
    return "Eighth Wheels";
  }
  if (pack.includes("1/4 wheel") || name.includes("1/4 wheel")) {
    return "Quarter Wheels";
  }
  if (pack.includes("whole wheel") || name.includes("whole wheel")) {
    return "Whole Wheels";
  }
  if (
    pack.includes("cylinder") ||
    pack.includes("fiaschetto") ||
    (pack.includes("rope") && !pack.includes("wheel")) ||
    name.includes("stick")
  ) {
    return "Cylinders & Ropes";
  }
  if (pack.includes("shredded") || pack.includes("grated") || pack.includes("flakes")) {
    return "Shredded, Grated & Flakes";
  }
  if (name.includes("flight") || name.includes("gift box")) {
    return "Gift & Sampler Sets";
  }
  if (name.includes("caciotta")) {
    return "Flavored Caciotta";
  }
  return "Specialty Cuts & Other";
}
