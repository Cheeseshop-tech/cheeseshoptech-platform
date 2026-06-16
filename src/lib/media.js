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

// Usage taxonomy (Rick, 2026-06-13) — an asset can serve MANY purposes (multi-select on upload).
// Saved as Cloudinary tags. `product-catalog` is special: it's the ONLY usage the Product Catalog
// pulls — social / press / lifestyle / food-styling never appear there unless also tagged product.
export const USAGE = [
  { id: "product-catalog", label: "Product Catalog", catalog: true },
  { id: "hero", label: "Hero" },
  { id: "story-block", label: "Story block" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "food-styling", label: "Food styling" },
  { id: "social", label: "Social" },
  { id: "press", label: "Press / PR" },
  { id: "event", label: "Event" },
  { id: "brand-asset", label: "Brand asset" },
  { id: "email-campaign", label: "Email / Campaign" },
  { id: "print", label: "Print / Sell-sheet" },
  { id: "web-marketing", label: "Web / Marketing" },
];
export const PRODUCT_USAGE_ID = "product-catalog";
export const usageLabel = (id) => USAGE.find((u) => u.id === id)?.label || id;

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

// Permanent deletion is destructive and irreversible — gated to the management/admin tier
// (owner, admin, client-admin). "owner" is injected as "admin" upstream, so this covers it.
// Plain client / creator / pr / influencer cannot delete.
export function canDeleteMedia(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client-admin");
}

// ---- MOCK backend ---------------------------------------------------------
// public_ids point at Cloudinary's public "demo" cloud food samples so the gallery
// renders real images in dev. Real assets keep the product SKU in the public_id (OM §6).
const MOCK = {
  "clients/montitrentini": [
    { publicId: "samples/food/spices", sku: "MT-ASIA-200", folder: "products", title: "Asiago DOP — hero", approvalState: "approved-for-press", format: "jpg", usage: ["product-catalog", "hero"] },
    { publicId: "samples/food/dessert", sku: "MT-GORG-150", folder: "products", title: "Gorgonzola Dolce", approvalState: "approved-for-influencers", format: "jpg", usage: ["product-catalog"] },
    { publicId: "samples/food/fish-vegetables", sku: "MT-GRAN-1K", folder: "products", title: "Grana Padano board", approvalState: "draft", format: "jpg", usage: ["product-catalog", "food-styling"] },
    { publicId: "samples/food/pot-mussels", sku: "MT-PROV-500", folder: "products", title: "Provolone wheel", approvalState: "approved-for-press", format: "jpg", usage: ["product-catalog"] },
    { publicId: "samples/landscapes/beach-boat", sku: "", folder: "brand", title: "Brand lifestyle — coast", approvalState: "approved-for-influencers", format: "jpg", usage: ["lifestyle", "social"] },
    { publicId: "samples/landscapes/nature-mountains", sku: "", folder: "brand", title: "Brand — Trentino peaks", approvalState: "approved-for-press", format: "jpg", usage: ["lifestyle", "hero", "brand-asset"] },
    { publicId: "samples/people/kitchen-bar", sku: "", folder: "raw", title: "Raw — kitchen shoot", approvalState: "draft", format: "jpg", usage: ["food-styling", "event"] },
    { publicId: "samples/coffee", sku: "", folder: "raw", title: "Raw — table setting", approvalState: "draft", format: "jpg", usage: ["lifestyle", "social"] },
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

/**
 * Update one asset's metadata (name, usage, sku, alt, approval). Live backend writes to Cloudinary
 * via the media-update function (secret stays server-side); mock mode is a no-op success so the UI
 * still works in dev. Returns the patch of fields to merge into local state.
 */
export async function updateAsset({ publicId, displayName, usage, sku, alt, approvalState }) {
  const patch = {};
  if (displayName != null) patch.title = displayName;
  if (Array.isArray(usage)) patch.usage = usage;
  if (sku != null) patch.sku = sku;
  if (alt != null) patch.alt = alt;
  if (approvalState) patch.approvalState = approvalState;
  if (USE_MOCK) return patch; // dev: update local state only
  const res = await fetch("/.netlify/functions/media-update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicId, displayName, usage, sku, alt, approvalState }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Update failed (${res.status}) ${msg}`);
  }
  return patch;
}

/**
 * Permanently delete one asset from Cloudinary (admin clearance). Live backend calls the
 * media-delete function (secret stays server-side); mock mode is a no-op success for dev.
 * DESTRUCTIVE — callers must gate on canDeleteMedia() and confirm with the user first.
 * @returns {Promise<{ok:true, publicId:string}>}
 */
export async function deleteAsset({ publicId, resourceType = "image" }) {
  if (!publicId) throw new Error("Missing publicId");
  if (USE_MOCK) return { ok: true, publicId }; // dev: drop from local state only
  const res = await fetch("/.netlify/functions/media-delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicId, resourceType }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Delete failed (${res.status}) ${msg}`);
  }
  return { ok: true, publicId };
}
