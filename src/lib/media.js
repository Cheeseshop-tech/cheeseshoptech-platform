// Media data layer. Today this serves a MOCK backend so the Media Hub is fully buildable and
// previewable before any Cloudinary account wiring. The real backend (Cloudinary Admin API via
// a Netlify function — secrets never in the browser) drops in behind the same listAssets() seam.
// See docs/MEDIA_HUB.md.

import { rolesOf } from "./auth.js";

// Approval states (lightweight, per POSITIONING.md content-studio → media-hub flow).
export const APPROVAL = {
  draft: { label: "Draft", tone: "muted" },
  "approved-for-press": { label: "Approved · Press", tone: "info" },
  "approved-for-influencers": { label: "Approved · Influencers", tone: "success" },
};

export const FOLDERS = ["products", "brand", "raw"];

// Which approval states each role may see (least privilege).
const ROLE_VISIBILITY = {
  admin: ["draft", "approved-for-press", "approved-for-influencers"],
  client: ["draft", "approved-for-press", "approved-for-influencers"],
  creator: ["draft"], // external creators collaborate on drafts
  pr: ["approved-for-press"],
  influencer: ["approved-for-influencers"],
};

export function visibleStatesFor(user) {
  const roles = rolesOf(user);
  const set = new Set();
  roles.forEach((r) => (ROLE_VISIBILITY[r] || []).forEach((s) => set.add(s)));
  // default: if no known role, see nothing
  return set;
}

export function canManageMedia(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client");
}

export function canUpload(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client") || roles.includes("creator");
}

// ---- MOCK backend ---------------------------------------------------------
// public_ids point at Cloudinary's public "demo" cloud food samples so the gallery
// renders real images in dev. Real assets keep the product SKU in the public_id (OM §6).
const MOCK = {
  "clients/montitrentini": [
    { publicId: "samples/food/spices", sku: "MT-ASIA-200", folder: "products", title: "Asiago DOP — hero", approvalState: "approved-for-press", format: "jpg" },
    { publicId: "samples/food/dessert", sku: "MT-GORG-150", folder: "products", title: "Gorgonzola Dolce", approvalState: "approved-for-influencers", format: "jpg" },
    { publicId: "samples/food/fish-vegetables", sku: "MT-GRAN-1K", folder: "products", title: "Grana Padano board", approvalState: "draft", format: "jpg" },
    { publicId: "samples/food/pot-mussels", sku: "MT-PROV-500", folder: "products", title: "Provolone wheel", approvalState: "approved-for-press", format: "jpg" },
    { publicId: "samples/landscapes/beach-boat", sku: "", folder: "brand", title: "Brand lifestyle — coast", approvalState: "approved-for-influencers", format: "jpg" },
    { publicId: "samples/landscapes/nature-mountains", sku: "", folder: "brand", title: "Brand — Trentino peaks", approvalState: "approved-for-press", format: "jpg" },
    { publicId: "samples/people/kitchen-bar", sku: "", folder: "raw", title: "Raw — kitchen shoot", approvalState: "draft", format: "jpg" },
    { publicId: "samples/coffee", sku: "", folder: "raw", title: "Raw — table setting", approvalState: "draft", format: "jpg" },
  ],
};

const USE_MOCK = (import.meta.env.VITE_MEDIA_BACKEND || "mock") === "mock";

/**
 * List assets for a tenant folder, filtered to what the user's roles may see.
 * @returns {Promise<Array>} assets
 */
export async function listAssets({ folder, tenantFolder, user }) {
  let assets;
  if (USE_MOCK) {
    assets = MOCK[tenantFolder] || [];
  } else {
    // Real adapter (deferred to launch): call a Netlify function that proxies the
    // Cloudinary Admin API for `${tenantFolder}/...` and maps approvalState from tags.
    const res = await fetch(`/.netlify/functions/media-list?folder=${encodeURIComponent(tenantFolder)}`);
    assets = res.ok ? await res.json() : [];
  }
  const allowed = visibleStatesFor(user);
  return assets
    .filter((a) => allowed.has(a.approvalState))
    .filter((a) => (folder ? a.folder === folder : true));
}
