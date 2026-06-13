// Cloudinary delivery layer (OM §6, Design Guide C2). Transforms are applied at delivery via
// URL — never by re-uploading resized copies. The codebase references NAMED presets, not raw
// params. Cloud name is account-global (one Cloudinary account); clients differ by FOLDER.

// Dev defaults to Cloudinary's public "demo" cloud so sample images actually render.
// Production sets VITE_CLOUDINARY_CLOUD to the CheeseShop TECH cloud name.
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD || "demo";

// Named transformation presets. Add new presets here only (single source of truth).
// Product packshots are mostly square: PAD (white) instead of CROP so wheels never get
// clipped, and skip g_auto — content-aware analysis on the 40+ MP originals was the
// slow first-load culprit; padding needs none.
export const TRANSFORMS = {
  thumb: "c_pad,b_white,w_160,h_160,f_auto,q_auto",   // 1:1 grid thumbnail
  card: "c_pad,b_white,w_600,h_600,f_auto,q_auto",    // 1:1 product card (uncropped)
  hero: "c_fit,w_1600,h_1200,f_auto,q_auto:good",     // dialog/preview, fit not crop
  original: "f_auto,q_auto",                           // full, format/quality optimized
};

/** Build a delivery URL for a public_id at a named preset. */
export function cldUrl(publicId, preset = "card", cloud = CLOUD_NAME) {
  const t = TRANSFORMS[preset] || TRANSFORMS.card;
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/${publicId}`;
}

/** The canonical folder for a client (mirrors config cloudinaryFolder). */
export function clientFolder(resolved) {
  return resolved?.cloudinaryFolder || `clients/${resolved?.id || "house"}`;
}

// Unsigned upload preset (configured in Cloudinary, set as a build env). Enables direct
// browser → Cloudinary uploads with NO API secret in the client.
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

/**
 * Upload a file straight to Cloudinary via the unsigned preset. Places it under the tenant's
 * folder/<subfolder>, tags it `draft` (new assets start unapproved), and stores the filename
 * as caption. Returns the new asset mapped to the media.js shape. No secret involved.
 */
export async function uploadAsset({ file, tenantFolder, subfolder = "raw", cloud = CLOUD_NAME }) {
  if (!UPLOAD_PRESET) throw new Error("No upload preset configured");
  const folder = `${tenantFolder}/${subfolder}`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);
  form.append("tags", "draft");
  form.append("context", `caption=${file.name}`);

  const res = await fetch(`https://api.cloudinary.com/${"v1_1"}/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}) ${msg}`);
  }
  const r = await res.json();
  return {
    publicId: r.public_id,
    sku: "",
    folder: subfolder,
    title: file.name,
    approvalState: "draft",
    format: r.format,
    width: r.width,
    height: r.height,
  };
}
