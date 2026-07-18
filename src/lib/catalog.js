// Buyer-catalog data seam (same pattern as pricing.js). Bundles the canonical per-tenant
// catalog JSON now (extracted from the standalone catalog app); a real backend (Netlify
// function over Cloudinary's Admin API) drops in behind getBuyerCatalog() later — same shape.
//
// Shape: { cloud: "<cloudinary cloud name>", images: [{ id, code?, title, orig, category,
//          ext, size, modified, cl_id, cl_fmt, cl_v, cl_w, cl_h }] }

import { getImages } from "./images.js";
import { cldImage } from "./cloudinary.js";

// The buyer catalog is now a VIEW over the ONE canonical manifest (lib/images.js) — it no
// longer owns its own image list, so it can't drift from the Media hub / Proposals. The
// component's expected fields are mapped from the manifest record here; the component is
// untouched.
export function getBuyerCatalog(resolved) {
  const m = getImages(resolved);
  if (!m) return null;
  return {
    cloud: m.cloud,
    images: m.images.map((im) => ({
      id: im.publicId,         // unique, stable key
      cl_id: im.publicId,
      cl_v: im.version,
      cl_fmt: im.format,
      ext: im.format,
      code: im.code || "",
      title: im.title,
      orig: im.orig,
      category: im.category,
      size: im.bytes,
      modified: im.modified,
      cl_w: im.width,
      cl_h: im.height,
      bgRemoved: !!im.bgRemoved, // 2026-07-18: threaded through so the Catalog skips white-pad too
    })),
  };
}

// ---- Cloudinary URL helpers — thin wrappers over the ONE canonical builder
// (lib/cloudinary.js cldImage). Sizing/cropping rules live there, so the Catalog can never
// again drift from the Media hub. Call shape stays (cloud, im) where im = {cl_id, cl_v, cl_fmt}. ----

export const cldThumb = (cloud, im) =>
  cldImage({ cloud, publicId: im.cl_id, version: im.cl_v, format: im.cl_fmt, preset: "card", transparent: !!im.bgRemoved });

export const cldBig = (cloud, im) =>
  cldImage({ cloud, publicId: im.cl_id, version: im.cl_v, format: im.cl_fmt, preset: "preview" });

export const cldView = (cloud, im) =>
  cldImage({ cloud, publicId: im.cl_id, version: im.cl_v, format: im.cl_fmt, preset: "original" });

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";

export const cldDownload = (cloud, im) =>
  cldImage({ cloud, publicId: im.cl_id, version: im.cl_v, format: im.cl_fmt, preset: "original", attachmentName: slugify(im.title) });

export const fmtSize = (b) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export const fmtTotalSize = (bytes) =>
  bytes < 1073741824 ? `${(bytes / 1048576).toFixed(0)} MB` : `${(bytes / 1073741824).toFixed(2)} GB`;
