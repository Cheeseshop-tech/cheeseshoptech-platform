// Buyer-catalog data seam (same pattern as pricing.js). Bundles the canonical per-tenant
// catalog JSON now (extracted from the standalone catalog app); a real backend (Netlify
// function over Cloudinary's Admin API) drops in behind getBuyerCatalog() later — same shape.
//
// Shape: { cloud: "<cloudinary cloud name>", images: [{ id, code?, title, orig, category,
//          ext, size, modified, cl_id, cl_fmt, cl_v, cl_w, cl_h }] }

import mtBuyerCatalog from "@/data/montitrentini/buyer-catalog.json";

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

// ---- Cloudinary URL helpers (ported 1:1 from the standalone catalog app) ----

// Grid thumbnail. PAD on white (square, never clips a wheel) and NO g_auto — content-aware
// crop forces Cloudinary to decode the full ~45 MP master per image, which was the slow
// first-load. 360px is plenty for the grid (displayed ~250px) and roughly halves the bytes.
export const cldThumb = (cloud, im) =>
  `https://res.cloudinary.com/${cloud}/image/upload/w_360,h_360,c_pad,b_white,f_auto,q_auto/v${im.cl_v}/${im.cl_id}.${im.cl_fmt}`;

export const cldBig = (cloud, im) =>
  `https://res.cloudinary.com/${cloud}/image/upload/w_1200,c_limit,f_auto,q_auto:good,fl_progressive/v${im.cl_v}/${im.cl_id}.${im.cl_fmt}`;

export const cldView = (cloud, im) =>
  `https://res.cloudinary.com/${cloud}/image/upload/v${im.cl_v}/${im.cl_id}.${im.cl_fmt}`;

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";

export const cldDownload = (cloud, im) =>
  `https://res.cloudinary.com/${cloud}/image/upload/fl_attachment:${slugify(im.title)}/v${im.cl_v}/${im.cl_id}.${im.cl_fmt}`;

export const fmtSize = (b) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export const fmtTotalSize = (bytes) =>
  bytes < 1073741824 ? `${(bytes / 1048576).toFixed(0)} MB` : `${(bytes / 1073741824).toFixed(2)} GB`;
