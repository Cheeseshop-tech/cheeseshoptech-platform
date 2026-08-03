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

// Transparent-safe siblings of the three presets above (2026-07-18, dispatch/background audit
// fix #3). `b_white` PAINTS a white background into the delivered pixels — fine for today's flat
// studio-JPG packshots, but it flattens any alpha channel a real background-removed PNG would
// carry, so a transparent packshot could never actually show the surrounding card's own color.
// Same crop/size math, just no forced pad color, so an asset's real alpha (if any) survives
// delivery and whatever's behind the <img> in the DOM (each surface's own container background)
// shows through. Selected automatically by cldImage() when the caller passes `transparent: true`
// — see codeImageUrl() in lib/images.js, which does this per-asset based on the manifest's
// `bgRemoved` flag, so no call site needs to change to benefit once an image is tagged.
const TRANSPARENT_TRANSFORMS = {
  micro: "c_pad,w_96,h_96,f_auto,q_auto",
  thumb: "c_pad,w_160,h_160,f_auto,q_auto",
  card:  "c_pad,w_360,h_360,f_auto,q_auto",
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
 * @param {boolean} [o.transparent]  Skip the white pad for micro/thumb/card so real alpha survives
 *   delivery (preview/hero/original never pad white, so this has no effect on those presets).
 */
export function cldImage({ publicId, preset = "card", cloud = CLOUD_NAME, version, format, attachmentName, transparent = false }) {
  if (!publicId) return "";
  const table = transparent ? TRANSPARENT_TRANSFORMS : TRANSFORMS;
  let t = table[preset] || TRANSFORMS[preset] || TRANSFORMS.card;
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
 * Fit an image under the unsigned-upload ceiling while KEEPING AS MUCH RESOLUTION AS POSSIBLE.
 *
 * 2026-08-03 (Rick): Cloudinary stores the hi-res master; compression is a DELIVERY concern.
 * Every surface already renders through TRANSFORMS above (thumb 160 / card 360 / preview 1200 /
 * hero 1600, all `f_auto,q_auto`), so previews are compressed and format-negotiated at view time.
 * The master therefore has no reason to be shrunk to a fixed size on the way in.
 *
 * WHAT THIS REPLACED, AND WHY IT MATTERED. This used to cap the LONG edge at 2560px on every
 * upload. But `IMAGE_HEALTH_2026-07-09.md` sets the standard on the SHORT edge — 2000px minimum,
 * "print needs it" — and capping the long edge decides the short edge by aspect ratio:
 *   1:1 → 2560 ✓ · 5:4 → 2048 ✓ · 4:3 → 1920 ✗ · 3:2 → 1707 ✗ · 16:9 → 1440 ✗
 * So every standard camera ratio landed under spec, and a 3000×2000 master that arrived exactly
 * AT spec was rewritten to 2560×1707 — the guard broke the very rule it sat next to. Measured
 * across the 222 live Monti assets: 97 sit under the 2000px minimum, and 45 of those carry the
 * guard's fingerprint (long edge exactly 2560), i.e. it caused nearly half of them.
 *
 * The 2560 cap was also doing a second, unstated job: keeping PNG re-encodes under Cloudinary
 * Free's 10MB DERIVED-image limit (the 2026-07-25 "Download PNG" incident). That job now belongs
 * to `c_limit,w_2400` on the download URLs (buyer-catalog.jsx, media-hub.jsx), so this function
 * no longer has to compromise the master for it.
 *
 * What remains is the one real constraint: an unsigned upload caps around 10MB, and a 15–40MB
 * DSLR master stalls the browser POST. So this now only intervenes when a file would NOT upload,
 * and then gives up the least it can — quality first (invisible at print sizes), dimensions only
 * if quality alone can't get there.
 *
 * Safe by design, unchanged: non-images, SVG/GIF and anything already under the ceiling pass
 * through UNTOUCHED at full resolution; any failure falls back to the original file so an upload
 * is never blocked by this step.
 */
export async function downscaleForUpload(
  file,
  { ceilingBytes = 9_500_000 } = {}
) {
  if (typeof document === "undefined" || !file || !file.type || !file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file; // don't rasterize

  // The common case now: the master already uploads, so it is stored at full resolution.
  if (file.size <= ceilingBytes) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // can't decode in this browser — let the server handle it
  }
  const { width, height } = bitmap;
  // PNG ignores the quality argument, so transparency-bearing masters can only be reduced by
  // dimension. JPEG gets to try quality first, which costs no pixels at all.
  const isPng = file.type === "image/png";
  const outType = isPng ? "image/png" : "image/jpeg";

  // Least-destructive first: full dimensions at falling quality, then progressively fewer pixels.
  const attempts = isPng
    ? [[1, 1], [0.85, 1], [0.7, 1], [0.55, 1]]
    : [[1, 0.85], [1, 0.75], [1, 0.65], [0.8, 0.8], [0.65, 0.8], [0.5, 0.78]];

  const render = async (scale, quality) => {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    return new Promise((res) => canvas.toBlob(res, outType, quality));
  };

  let best = null;
  try {
    for (const [scale, quality] of attempts) {
      const blob = await render(scale, quality);
      if (!blob) continue;
      best = blob; // keep the smallest produced so far as a floor
      if (blob.size <= ceilingBytes) break;
    }
  } finally {
    bitmap.close && bitmap.close();
  }

  // Nothing usable, or the original was already smaller than anything we made — keep the original
  // and let the upload attempt speak for itself rather than shipping a worse file.
  if (!best || best.size >= file.size) return file;
  const base = (file.name || "upload").replace(/\.[^.]+$/, "");
  return new File([best], `${base}.${isPng ? "png" : "jpg"}`, { type: outType, lastModified: Date.now() });
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
  // Only intervenes if the file would not upload at all (unsigned ~10MB cap). Everything under
  // that ceiling is stored at FULL resolution — Cloudinary is the hi-res master and previews are
  // compressed at delivery via TRANSFORMS.
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
 * Oversized images are fitted under the upload ceiling first (downscaleForUpload); anything
 * already under it, and all non-images (PDF etc.), pass through untouched at full resolution.
 * Returns the delivery URL + format/resource_type so callers can label and route it.
 */
export async function uploadFileAuto({ file, tenantFolder, subfolder = "presentations", cloud = CLOUD_NAME }) {
  if (!UPLOAD_PRESET) throw new Error("No upload preset configured");
  const toSend = await downscaleForUpload(file); // only if over the upload ceiling; pdf/etc. unchanged
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
