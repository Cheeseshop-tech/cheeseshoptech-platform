// Presentations catalog store (same localStorage-overlay model as brand-kit-edits.js).
// Presentations = a CATALOG of finished proposals (built in the Proposals tool) that the
// brand team saves here to organize and SHARE. Entries persist per-tenant in localStorage and
// merge with any config-defined decks. A real save backend drops in behind these same seams later.
//
// Entry shape:
//   { key, title, eyebrow?, description?, cover, kind, category, url?, slides?, savedAt }
//   - kind "link"/"pdf": `url` is the shareable link to the finished proposal (a public PDF or page)
//   - kind "deck": `slides` is an array of image URLs (config decks render in the slide viewer)
//   - category: the content-type for Content Library organization (see CONTENT_CATEGORIES). Library
//     tabs are views filtered by this. See docs/CONTENT_ORCHESTRATION_SPEC.md §5.

// Content-type taxonomy (Content Orchestration spec §5). The Content Library's category tabs are
// views filtered by this dimension; conceptually it mirrors a Media Hub tag.
export const CONTENT_CATEGORIES = [
  { id: "presentation", label: "Presentations" },
  { id: "slide-deck", label: "Slide decks" },
  { id: "social-post", label: "Social posts" },
  { id: "email-campaign", label: "Email campaigns" },
  { id: "blog-post", label: "Blog posts" },
];
export const DEFAULT_CATEGORY = "presentation";
export const categoryLabel = (id) => CONTENT_CATEGORIES.find((c) => c.id === id)?.label || "Presentations";
/** Every entry resolves to a known category (legacy/un-set entries fall back to the default). */
export const entryCategory = (entry) =>
  CONTENT_CATEGORIES.some((c) => c.id === entry?.category) ? entry.category : DEFAULT_CATEGORY;

// Storage quota (Content Orchestration spec §9). Each client gets a capped number of STORED pieces
// (config/platform decks don't count — only the localStorage catalog). When full, delete or download
// to free a slot. Per-tenant override via resolved.contentQuota.
export const DEFAULT_QUOTA = 10;
export function storedCount(tenantId) { return loadCatalog(tenantId).length; }

/** Force-download version of a Cloudinary delivery URL (adds fl_attachment so the browser saves the
 *  file instead of navigating). Non-Cloudinary URLs return unchanged. Spec §10 download-to-device. */
export function downloadHref(url) {
  if (!url) return url;
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/fl_attachment/")
    : url;
}

const KEY = (tenantId) => `cs-presentations-${tenantId}`;

export function loadCatalog(tenantId) {
  try { return JSON.parse(localStorage.getItem(KEY(tenantId))) || []; } catch { return []; }
}

function saveCatalog(tenantId, list) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(list)); } catch { /* quota */ }
  return list;
}

export function addEntry(tenantId, entry) {
  const list = loadCatalog(tenantId);
  const key = entry.key || `pres-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const next = [{ ...entry, key, savedAt: new Date().toISOString() }, ...list];
  return saveCatalog(tenantId, next);
}

export function removeEntry(tenantId, key) {
  return saveCatalog(tenantId, loadCatalog(tenantId).filter((e) => e.key !== key));
}

/** Patch one entry in place (e.g. status changes from house review). */
export function updateEntry(tenantId, key, patch) {
  return saveCatalog(tenantId, loadCatalog(tenantId).map((e) => (e.key === key ? { ...e, ...patch } : e)));
}

// Gated publishing (Content Orchestration spec §7). A piece composed/loaded by a client or
// client-admin lands as "submitted"; CheeseShop TECH (house) reviews → "posted" or "returned".
// Legacy/house-created entries with no status default to "posted" (already live).
export const STATUS = { submitted: "submitted", posted: "posted", returned: "returned" };
export const entryStatus = (e) =>
  (e?.status === "submitted" || e?.status === "returned" ? e.status : "posted");

/** Keys of entries that look like duplicates — share a normalized title or an identical url. A
 *  review aid (spec §3 de-dup), not a hard block. */
export function duplicateKeys(entries) {
  const byTitle = {}, byUrl = {};
  for (const e of entries || []) {
    const t = (e.title || "").trim().toLowerCase();
    if (t) (byTitle[t] = byTitle[t] || []).push(e.key);
    if (e.url) (byUrl[e.url] = byUrl[e.url] || []).push(e.key);
  }
  const dupes = new Set();
  for (const group of [...Object.values(byTitle), ...Object.values(byUrl)]) {
    if (group.length > 1) group.forEach((k) => dupes.add(k));
  }
  return dupes;
}

/** Normalize a user-entered cover: full URL as-is, else treat as a Cloudinary public_id. */
export function coverUrl(cover, cldUrlFn) {
  if (!cover) return "";
  if (/^https?:\/\//i.test(cover)) return cover;
  return cldUrlFn ? cldUrlFn(cover, "card") : cover;
}
