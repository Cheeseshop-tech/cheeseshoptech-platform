// Canonical image source (F5, IMAGE_PIPELINE_SPEC.md). ONE manifest per tenant is the single
// description of that tenant's images; every surface (Catalog, Media hub, Proposals, Pricing)
// reads from here, and every URL is built by cldImage (lib/cloudinary.js). This is the "one
// mind, one body" source — add a photo, regenerate the manifest (scripts/sync-images.mjs),
// and it appears everywhere, correctly.
//
// Manifest shape: { tenant, cloud, folder, generatedAt, images: [{
//   publicId, version, format, category, title, code, sku, orig,
//   approvalState, width, height, bytes, modified, bgRemoved }] }
// `bgRemoved` (2026-07-18): true when the Cloudinary asset carries the `bg-removed` tag Rick
// applies once a packshot is actually background-removed — see sync-images.mjs and
// codeImageUrl() below, which uses it to skip the white pad at delivery time.

import mtImages from "@/data/montitrentini/images.json";
import tplImages from "@/data/_template/images.json";
import { cldImage } from "./cloudinary.js";

const BUNDLES = {
  montitrentini: mtImages,
  demo: tplImages,
};

const USE_MOCK = (import.meta.env.VITE_IMAGES_BACKEND || "mock") === "mock";

/** The canonical image manifest for a tenant (null if none configured). */
export function getImages(resolved) {
  if (USE_MOCK) return BUNDLES[resolved.id] || null;
  // Real adapter (deferred): GET /.netlify/functions/images?tenant=<id>, same shape.
  return null;
}

/** All image records, or [] . */
export function imageList(resolved) {
  return getImages(resolved)?.images || [];
}

/** The image record for a SKU/product code, or null. */
export function imageForCode(resolved, code) {
  if (!code) return null;
  const m = getImages(resolved);
  return m?.images.find((i) => i.code === code || i.sku === code) || null;
}

/* ---- Low-res reference placeholders (INTERNAL SURFACES ONLY) --------------------------------
 * Thumbnails lifted out of Monti Trentini's Cut & Wrap assortment sheet: 116x111 to 331x210 px,
 * 150-211 ppi, against 2000-6732 px for a real packshot. They are NOT in Cloudinary and never
 * should be — the Media Hub is the item's source of truth, and a wrong image there is worse than
 * a missing one because nothing flags it.
 *
 * They live in /public/placeholders/<code>.webp (108 KB for all 17) and are OPT-IN per call site. Internal tools
 * (Proforma, inventory, forecasting) pass allowPlaceholder so a rep can identify a SKU at a
 * glance. Customer-facing surfaces — proposals, sell sheets — must NOT pass it. Anything a buyer
 * sees gets a real packshot or nothing.
 *
 * Retire a code from this set the moment Stefano sends its hi-res original.
 * See docs/STEFANO_QUEUE_2026-07-09.md §D.
 */
const PLACEHOLDER_CODES = new Set([
  "01101", "01174", "01190", "02091", "03044", "03073", "04165", "04176", "05091",
  "05600", "20423", "20424", "20480", "20481", "40086", "40184", "40163",
]);

/** Per-code caveats, surfaced in the UI next to the placeholder. */
const PLACEHOLDER_NOTES = {
  "03044": "The assortment sheet prints one identical photo for 03044 and 03073 (formerly 03047). One of them is wrong.",
  "03073": "The assortment sheet prints one identical photo for 03044 and 03073 (formerly 03047). One of them is wrong.",
  "01174": "The sheet shows a Wedge and a Disc under this one item number. This is the Wedge.",
};

/** True when `code` has only a low-res reference thumbnail standing in for a real packshot. */
export function isPlaceholderImage(resolved, code) {
  return !imageForCode(resolved, code) && PLACEHOLDER_CODES.has(code);
}

/** Caveat text for a placeholder, or "" when there is none. */
export function placeholderNote(code) {
  return PLACEHOLDER_NOTES[code] || "";
}

/**
 * Build a delivery URL for a SKU/product code at a preset.
 * Manifest-first (real publicId + version + format). Then, when `allowPlaceholder` is set and we
 * hold a low-res reference thumbnail for the code, the local placeholder. Then the legacy
 * `<config.images.folder>/<code>` packshot convention for codes not yet in the manifest, so every
 * priced SKU still renders while the sync catches up. Returns "" if none resolves.
 *
 * The placeholder is checked BEFORE the legacy convention on purpose: the legacy path builds a
 * URL blindly and can't tell us whether the asset exists, so it would mask the placeholder with
 * a broken image. A real packshot always wins — it's in the manifest, and the manifest is first.
 */
export function codeImageUrl(resolved, config, code, preset = "card", { allowPlaceholder = false } = {}) {
  const rec = imageForCode(resolved, code);
  if (rec) {
    const m = getImages(resolved);
    // 2026-07-18 (dispatch/background audit fix #3): once a manifest record is tagged
    // `bg-removed` (see sync-images.mjs), skip the forced white pad so its real alpha survives
    // delivery and the surface's own container color shows through — no call site needs to
    // change to pick this up; it's automatic per-asset the moment the tag is set and re-synced.
    return cldImage({ cloud: m.cloud, publicId: rec.publicId, version: rec.version, format: rec.format, preset, transparent: !!rec.bgRemoved });
  }
  if (allowPlaceholder && PLACEHOLDER_CODES.has(code)) return `/placeholders/${code}.webp`;
  const img = config?.images;
  if (img?.provider === "cloudinary" && img.cloud && code) {
    return cldImage({ cloud: img.cloud, publicId: `${img.folder}/${code}`, format: "jpg", preset });
  }
  return "";
}
