// Buyer-catalog data seam (same pattern as pricing.js). Bundles the canonical per-tenant
// catalog JSON now (extracted from the standalone catalog app); a real backend (Netlify
// function over Cloudinary's Admin API) drops in behind getBuyerCatalog() later — same shape.
//
// Shape: { cloud: "<cloudinary cloud name>", images: [{ id, code?, title, orig, category,
//          ext, size, modified, cl_id, cl_fmt, cl_v, cl_w, cl_h }] }

import mtBuyerCatalog from "@/data/montitrentini/buyer-catalog.json";
import { cldImage } from "./cloudinary.js";

const BUNDLES = {
  montitrentini: mtBuyerCatalog,
};

const USE_MOCK = (import.meta.env.VITE_CATALOG_BACKEND || "mock") === "mock";

/** Canonical buyer-facing image catalog for a tenant. Null if none configured. */
export function getBuyerCatalog(resolved) {
  if (USE_MOCK) return BUNDLES[resolved.id] || null;
  // Real adapter (deferred): GET /.netlify/functions/catalog?tenant=<id>
  return null;
}

// ---- Cloudinary URL helpers — thin wrappers over the ONE canonical builder
// (lib/cloudinary.js cldImage). Sizing/cropping rules live there, so the Catalog can never
// again drift from the Media hub. Call shape stays (cloud, im) where im = {cl_id, cl_v, cl_fmt}. ----

export const cldThumb = (cloud, im) =>
  cldImage({ cloud, publicId: im.cl_id, version: im.cl_v, format: im.cl_fmt, preset: "card" });

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
