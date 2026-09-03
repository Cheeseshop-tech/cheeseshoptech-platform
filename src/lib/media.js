// Media data layer. Today this serves a MOCK backend so the Media Hub is fully buildable and
// previewable before any Cloudinary account wiring. The real backend (Cloudinary Admin API via
// a Netlify function — secrets never in the browser) drops in behind the same listAssets() seam.
// See docs/MEDIA_HUB.md.

import { rolesOf } from "./auth.js";
import { authHeaders } from "./auth-context.jsx";

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
  { id: "production", label: "Production / Cheese making" },
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

// Editing/re-tagging/SKU-linking an EXISTING asset writes to Cloudinary (media-update) — CST
// (admin) or a client's admin only (Rick, 2026-07-06: base "client" portal-viewers can browse
// but not rewrite). The Netlify function enforces this too (_write-guard.js) — this client-side
// check just keeps the UI honest with what the server will actually allow.
export function canManageMedia(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client-admin");
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
// renders real images in dev. Real assets keep the product SKU in the product's cloudinaryFolder
// (OM §6) — MOCK is keyed by that same value, so it must match config/clients/<id>.json exactly.
//
// Fix (2026-07-19): this key was "clients/montitrentini" — the OLD tenant-folder convention
// (still used by config/clients/demo.json's "clients/demo"). Monti's config was migrated to the
// flat "monti-trentini" folder name at some point without updating this key, so listAssets()'s
// `MOCK[tenantFolder] || []` silently fell through to an empty array for Monti specifically —
// mock mode (the DEFAULT when VITE_MEDIA_BACKEND isn't set, e.g. a plain `npm run dev` with no
// local .env) showed zero images in every variable-slot MediaPicker with no error at all. Live
// Cloudinary data was never affected — this only broke local dev without the live backend wired.
const MOCK = {
  "monti-trentini": [
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

// Exported so the UI can warn instead of silently showing sample/empty data (2026-07-19 —
// the Monti mock-key mismatch above went undetected for a while precisely because nothing told
// Rick he was looking at mock mode at all). `npm run dev` never sees Netlify's env vars — only
// `netlify dev` does — so mock mode is the DEFAULT for a plain local dev server with no `.env`.
export const IS_MOCK_MODE = USE_MOCK;
export const MOCK_MODE_MSG =
  "Mock mode — VITE_MEDIA_BACKEND isn't set, so you're seeing sample placeholder images, not your " +
  "real Cloudinary library (a plain `npm run dev` never sees Netlify's env vars). Run `netlify dev` " +
  "instead, or use the live site, to browse real assets.";

/**
 * List assets for a tenant folder, filtered to what the user's roles may see.
 * `legacyFolders` (config cloudinaryLegacyFolders): extra Cloudinary folders predating the
 * tenant folder — e.g. Monti's 71 `monti/<itemcode>` packshots — surfaced with SKU derived
 * from the filename server-side (see media-list.js).
 * @returns {Promise<Array>} assets
 */
export async function listAssets({ folder, tenantFolder, legacyFolders, user, tenantId = "" }) {
  let assets;
  if (USE_MOCK) {
    assets = MOCK[tenantFolder] || [];
  } else {
    // Real adapter (deferred to launch): call a Netlify function that proxies the
    // Cloudinary Admin API for `${tenantFolder}/...` and maps approvalState from tags.
    const legacy = (legacyFolders || []).length
      ? `&legacy=${encodeURIComponent(legacyFolders.join(","))}`
      : "";
    // Reads now require the passcode header server-side (2026-07-16) — replay the unlock passcode.
    // `tenantId` (2026-07-18 fix): explicit tenant id/subdomain so a per-tenant admin passcode
    // (PORTAL_ADMIN_PASSCODE_<TENANT>) actually authorizes this read — media-list.js used to try
    // deriving it from `folder`, which never matched (see media-list.js for the full story).
    const res = await fetch(
      `/.netlify/functions/media-list?folder=${encodeURIComponent(tenantFolder)}${legacy}&tenant=${encodeURIComponent(tenantId)}`,
      { headers: { ...(await authHeaders()) } }
    );
    if (res.status === 401) throw new Error(RELOGIN_MSG); // pre-update unlock — no stashed passcode
    // 2026-09-03 hardening audit: any OTHER failure used to silently fall back to [] (empty
    // grid, indistinguishable from "this folder truly has no images") -- same fix as
    // listAssetsPage() below (2026-09-03 rollout): throw so callers get a visible failure
    // instead of a silent empty picker.
    if (!res.ok) throw new Error(`Media list failed (${res.status})`);
    assets = await res.json();
  }
  const allowed = visibleStatesFor(user);
  return assets
    .filter((a) => allowed.has(a.approvalState))
    .filter((a) => (folder ? a.folder === folder : true));
}

/**
 * Paginated sibling of listAssets() (2026-07-18, media-hub load-time fix). Fetches ONE page at a
 * time from the live backend instead of awaiting the whole tenant asset set — the Media Hub was
 * blocking its first paint on every asset (main folder + every legacy folder) before rendering a
 * single tile, and that only gets slower as more assets get tagged. Mock mode has too little data
 * to bother paging — it returns everything in one "page" with no next cursor.
 *
 * Other callers (MediaPicker, Studio Director) are UNCHANGED — they still call listAssets() and
 * get the full list in one call, which is fine for an on-demand picker opened after a click.
 *
 * @param {object} o
 * @param {string} [o.cursor] Opaque cursor from a previous call's `nextCursor` (omit for page 1).
 * @param {number} [o.maxResults=60] Assets per page (server caps at 100).
 * @returns {Promise<{assets: Array, nextCursor: string|null}>}
 */
export async function listAssetsPage({ tenantFolder, legacyFolders, user, cursor, maxResults = 60, tenantId = "" }) {
  const allowed = visibleStatesFor(user);
  if (USE_MOCK) {
    const assets = (MOCK[tenantFolder] || [])
      .filter((a) => allowed.has(a.approvalState));
    return { assets, nextCursor: null };
  }
  const legacy = (legacyFolders || []).length
    ? `&legacy=${encodeURIComponent(legacyFolders.join(","))}`
    : "";
  const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
  // `tenantId` (2026-07-18 fix): see listAssets() above — same explicit tenant id/subdomain.
  const res = await fetch(
    `/.netlify/functions/media-list?paged=1&max_results=${maxResults}&folder=${encodeURIComponent(tenantFolder)}${legacy}${cursorParam}&tenant=${encodeURIComponent(tenantId)}`,
    { headers: { ...(await authHeaders()) } }
  );
  if (res.status === 401) throw new Error(RELOGIN_MSG);
  // CRM-05 follow-up (2026-09-03): any OTHER failure used to silently return an empty page,
  // indistinguishable from "this folder genuinely has no assets" — the Media Hub grid would just
  // look empty with no explanation. The 401 case above already throws and media-hub.jsx already
  // catches that into a "Media didn't load" toast; extending the same throw to every failure
  // means every failure gets that same visible toast instead of a silent empty grid.
  if (!res.ok) throw new Error(`Media list failed (${res.status})`);
  const data = await res.json();
  return {
    assets: (data.assets || []).filter((a) => allowed.has(a.approvalState)),
    nextCursor: data.nextCursor || null,
  };
}

/**
 * Update one asset's metadata (name, usage, sku, alt, approval). Live backend writes to Cloudinary
 * via the media-update function (secret stays server-side); mock mode is a no-op success so the UI
 * still works in dev. Returns the patch of fields to merge into local state.
 */
export async function updateAsset({ publicId, displayName, usage, sku, alt, description, approvalState, tenantId = "" }) {
  const patch = {};
  if (displayName != null) patch.title = displayName;
  if (Array.isArray(usage)) patch.usage = usage;
  if (sku != null) patch.sku = sku;
  if (alt != null) patch.alt = alt;
  if (description != null) patch.description = description;
  if (approvalState) patch.approvalState = approvalState;
  if (USE_MOCK) return patch; // dev: update local state only
  // `tenantId` (2026-07-18 fix): media-update.js used to check auth with NO tenant at all, so a
  // per-tenant admin passcode could never authorize this write — now sent explicitly.
  const res = await fetch("/.netlify/functions/media-update", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ publicId, displayName, usage, sku, alt, description, approvalState, tenant: tenantId }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error(RELOGIN_MSG);
    const msg = await res.text().catch(() => "");
    throw new Error(`Update failed (${res.status}) ${msg}`);
  }
  return patch;
}

// 401 from a write endpoint (2026-07-06 write guard) or a read endpoint (2026-07-16 read guard)
// almost always means the browser unlocked BEFORE the guard deployed, so there's no passcode
// stashed to replay — tell the user the actual fix instead of a bare status code.
export const RELOGIN_MSG =
  "Not authorized — sign out and re-enter your passcode (a security update now requires it), then retry.";

/**
 * Permanently delete one asset from Cloudinary (admin clearance). Live backend calls the
 * media-delete function (secret stays server-side); mock mode is a no-op success for dev.
 * DESTRUCTIVE — callers must gate on canDeleteMedia() and confirm with the user first.
 * @returns {Promise<{ok:true, publicId:string}>}
 */
export async function deleteAsset({ publicId, resourceType = "image", tenantId = "" }) {
  if (!publicId) throw new Error("Missing publicId");
  if (USE_MOCK) return { ok: true, publicId }; // dev: drop from local state only
  // `tenantId` (2026-07-18 fix): media-delete.js used to check auth with NO tenant at all — see
  // updateAsset() above for the same story.
  const res = await fetch("/.netlify/functions/media-delete", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ publicId, resourceType, tenant: tenantId }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error(RELOGIN_MSG);
    const msg = await res.text().catch(() => "");
    throw new Error(`Delete failed (${res.status}) ${msg}`);
  }
  return { ok: true, publicId };
}
