// Cloudinary delivery layer (OM §6, Design Guide C2). Transforms are applied at delivery via
// URL — never by re-uploading resized copies. The codebase references NAMED presets, not raw
// params. Cloud name is account-global (one Cloudinary account); clients differ by FOLDER.

// Dev defaults to Cloudinary's public "demo" cloud so sample images actually render.
// Production sets VITE_CLOUDINARY_CLOUD to the CheeseShop TECH cloud name.
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD || "demo";

// Named transformation presets. Add new presets here only (single source of truth).
export const TRANSFORMS = {
  thumb: "c_fill,g_auto,w_160,h_160,f_auto,q_auto",   // 1:1 grid thumbnail
  card: "c_fill,g_auto,w_600,h_750,f_auto,q_auto",    // 4:5 product card
  hero: "c_fill,g_auto,w_1600,h_900,f_auto,q_auto",   // 16:9 hero
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
