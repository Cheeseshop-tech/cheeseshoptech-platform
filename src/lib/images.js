// Canonical image source (F5, IMAGE_PIPELINE_SPEC.md). ONE manifest per tenant is the single
// description of that tenant's images; every surface (Catalog, Media hub, Proposals, Pricing)
// reads from here, and every URL is built by cldImage (lib/cloudinary.js). This is the "one
// mind, one body" source — add a photo, regenerate the manifest (scripts/sync-images.mjs),
// and it appears everywhere, correctly.
//
// Manifest shape: { tenant, cloud, folder, generatedAt, images: [{
//   publicId, version, format, category, title, code, sku, orig,
//   approvalState, width, height, bytes, modified }] }

import mtImages from "@/data/montitrentini/images.json";
import { cldImage } from "./cloudinary.js";

const BUNDLES = {
  montitrentini: mtImages,
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

/**
 * Build a delivery URL for a SKU/product code at a preset.
 * Manifest-first (real publicId + version + format); falls back to the legacy
 * `<config.images.folder>/<code>` packshot convention for codes not yet in the manifest,
 * so every priced SKU still renders while the sync catches up. Returns "" if neither resolves.
 */
export function codeImageUrl(resolved, config, code, preset = "card") {
  const rec = imageForCode(resolved, code);
  if (rec) {
    const m = getImages(resolved);
    return cldImage({ cloud: m.cloud, publicId: rec.publicId, version: rec.version, format: rec.format, preset });
  }
  const img = config?.images;
  if (img?.provider === "cloudinary" && img.cloud && code) {
    return cldImage({ cloud: img.cloud, publicId: `${img.folder}/${code}`, format: "jpg", preset });
  }
  return "";
}
