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

/**
 * First-page (or any page) thumbnail of an uploaded PDF, delivered as a JPG. Cloudinary stores
 * PDFs as the `image` resource_type, so a delivery URL with the `pg_<n>` page-extraction transform
 * renders that page to a raster — perfect for an auto cover in the Presentations catalog.
 * NOTE: like all PDF delivery, this is gated by the account's "Allow delivery of PDF and ZIP files"
 * security setting; with it off, the thumbnail 401s until enabled.
 *
 * @param {string} publicId  The uploaded PDF's public_id (resource_type image).
 * @param {object} [o]
 * @param {number} [o.page=1]  1-based page number.
 * @param {number} [o.width=900]  Target width (aspect preserved via c_limit).
 */
export function pdfThumbUrl(publicId, { page = 1, width = 900, cloud = CLOUD_NAME } = {}) {
  if (!publicId) return "";
  const t = `pg_${page},c_limit,w_${width},f_jpg,q_auto:good`;
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/${publicId}.jpg`;
}

/** The canonical folder for a client (mirrors config cloudinaryFolder). */
export function clientFolder(resolved) {
  return resolved?.cloudinaryFolder || `clients/${resolved?.id || "house"}`;
}

// Unsigned upload preset (configured in Cloudinary, set as a build env). Enables direct
// browser → Cloudinary uploads with NO API secret in the client.
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

/**
 * Client-side downscale so oversized photos actually upload. Unsigned uploads cap around
 * ~10 MB and a full-res phone/DSLR master (15–40 MB) stalls the browser POST — the hub shows
 * "uploading" forever. This shrinks the longest edge to `maxEdge` and re-encodes BEFORE upload.
 * Delivery transforms (see TRANSFORMS) resize further at view time, so nothing visible is lost.
 * Safe by design: non-images, SVG/GIF, and already-small files pass through untouched; any
 * failure falls back to the original file so an upload is never blocked by this step.
 */
export async function downscaleForUpload(
  file,
  { maxEdge = 2560, triggerBytes = 8_000_000, quality = 0.85 } = {}
) {
  if (typeof document === "undefined" || !file || !file.type || !file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file; // don't rasterize
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // can't decode in this browser — let the server handle it
  }
  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  if (longest <= maxEdge && file.size <= triggerBytes) {
    bitmap.close && bitmap.close();
    return file; // already web-sized
  }
  const scale = Math.min(1, maxEdge / longest);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close && bitmap.close();
  // Keep PNG (transparency) as PNG; re-encode everything else to JPEG for size.
  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((res) => canvas.toBlob(res, outType, quality));
  if (!blob || blob.size >= file.size) return file; // no win — keep original
  const base = (file.name || "upload").replace(/\.[^.]+$/, "");
  const ext = outType === "image/png" ? "png" : "jpg";
  return new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() });
}

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
  // Shrink oversized masters in the browser first so big phone/DSLR shots don't exceed the
  // unsigned ~10 MB cap and stall the POST. Non-images / already-small files pass through.
  const uploadFile = await downscaleForUpload(file);
  const title = (displayName || "").trim() || file.name;
  // draft (approval) + usage tags travel with the asset in Cloudinary.
  const tags = ["draft", ...usage].join(",");
  const form = new FormData();
  form.append("file", uploadFile);
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

/**
 * Upload ANY file type (PDF, PPTX, images) to Cloudinary via the unsigned preset, using the
 * `auto` endpoint so Cloudinary picks the right resource_type (image vs raw). Used by the
 * Presentations "Load" flow so a finished proposal can be a browsed/dropped file, not just a URL.
 * Images get downscaled first (reuses downscaleForUpload); PDF/PPTX pass through untouched.
 * Returns the delivery URL + format/resource_type so callers can label and route it.
 */
export async function uploadFileAuto({ file, tenantFolder, subfolder = "presentations", cloud = CLOUD_NAME }) {
  if (!UPLOAD_PRESET) throw new Error("No upload preset configured");
  const toSend = await downscaleForUpload(file); // shrinks big images; pdf/pptx/etc. unchanged
  const folder = `${tenantFolder}/${subfolder}`;
  const form = new FormData();
  form.append("file", toSend);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}) ${msg}`);
  }
  const r = await res.json();
  return {
    publicId: r.public_id,
    secureUrl: r.secure_url,
    format: (r.format || "").toLowerCase(),
    resourceType: r.resource_type, // "image" | "raw" | "video"
    bytes: r.bytes,
  };
}
