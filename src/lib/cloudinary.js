// Cloudinary delivery layer (OM §6, Design Guide C2). Transforms are applied at delivery via
// URL — never by re-uploading resized copies. The codebase references NAMED presets, not raw
// params. Cloud name is account-global (one Cloudinary account); clients differ by FOLDER.

// Dev defaults to Cloudinary's public "demo" cloud so sample images actually render.
// Production sets VITE_CLOUDINARY_CLOUD to the CheeseShop TECH cloud name.
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD || "demo";

// Named transformation presets — THE SINGLE SOURCE OF TRUTH for image sizing across the whole
// app (Catalog, Media hub, Proposals, Pricing tool all route through cldImage below). Tune a
// preset here and every surface updates together. Rule learned the hard way: product packshots
// are ~45 MP squares, so PAD on white (never crop) and NEVER g_auto — content-aware crop forces
// a full-resolution decode per image and was the slow first-load. Keep these padding-only.
export const TRANSFORMS = {
  micro:   "c_pad,b_white,w_96,h_96,f_auto,q_auto",         // inline list icon (e.g. pricing rows)
  thumb:   "c_pad,b_white,w_160,h_160,f_auto,q_auto",       // small square thumbnail
  card:    "c_pad,b_white,w_360,h_360,f_auto,q_auto",       // grid card (Catalog + Media hub)
  preview: "c_limit,w_1200,f_auto,q_auto:good,fl_progressive", // lightbox / detail
  hero:    "c_fit,w_1600,h_1200,f_auto,q_auto:good",        // large dialog/preview
  original:"f_auto,q_auto",                                  // full, format/quality optimized
};

/**
 * THE canonical Cloudinary delivery-URL builder. Every image surface calls this so sizing,
 * cropping, and the "no g_auto on huge masters" rule live in exactly one place.
 *
 * @param {object} o
 * @param {string} o.publicId  Cloudinary public_id (e.g. "monti/asiago/..."). Required.
 * @param {string} [o.preset]  Named TRANSFORMS preset (default "card").
 * @param {string} [o.cloud]   Cloud name (defaults to the configured CheeseShop TECH cloud).
 * @param {number|string} [o.version]  Optional Cloudinary version (cache-bust) -> /v123/.
 * @param {string} [o.format]  Optional explicit extension (e.g. "png"); omit to let f_auto pick.
 * @param {string} [o.attachmentName]  If set, forces a download with this filename.
 */
export function cldImage({ publicId, preset = "card", cloud = CLOUD_NAME, version, format, attachmentName }) {
  if (!publicId) return "";
  let t = TRANSFORMS[preset] || TRANSFORMS.card;
  if (attachmentName) t = `fl_attachment:${attachmentName}` + (preset === "original" ? "" : `,${t}`);
  const v = version ? `v${version}/` : "";
  const ext = format ? `.${format}` : "";
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/${v}${publicId}${ext}`;
}

/** Back-compat shorthand: build a delivery URL for a public_id at a named preset. */
export function cldUrl(publicId, preset = "card", cloud = CLOUD_NAME) {
  return cldImage({ publicId, preset, cloud });
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
 * folder/<subfolder>, tags it `draft` (new assets start unapproved) PLUS any usage tags, and
 * stores the display name as caption. Returns the new asset mapped to the media.js shape.
 * No secret involved.
 *
 * @param {string} [o.displayName]  Human name for the asset (caption); defaults to the filename.
 * @param {string[]} [o.usage]      Usage tag ids (e.g. ["product-catalog","hero"]) — the asset's
 *                                  allowed purposes. The Product Catalog only pulls "product-catalog".
 */
export async function uploadAsset({ file, tenantFolder, subfolder = "raw", cloud = CLOUD_NAME, displayName, usage = [] }) {
  if (!UPLOAD_PRESET) throw new Error("No upload preset configured");
  const folder = `${tenantFolder}/${subfolder}`;
  const title = (displayName || "").trim() || file.name;
  // draft (approval) + usage tags travel with the asset in Cloudinary.
  const tags = ["draft", ...usage].join(",");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);
  form.append("tags", tags);
  form.append("context", `caption=${title}`);

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
    title,
    usage,
    approvalState: "draft",
    format: r.format,
    width: r.width,
    height: r.height,
  };
}
