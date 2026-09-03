// Content Library catalog store. The Library is the organized catalog of finished work
// (CONTENT_ORCHESTRATION_SPEC §2) — links + thumbnails that REFERENCE Media Hub assets, never
// copies. Entries persist per-tenant in Netlify Blobs via netlify/functions/content-library.js
// and merge with any config-defined decks.
//
// 2026-08-03: connected to a real backend. This was localStorage-only, which made the catalog
// browser-local — see the "Backing store" note below for why that had to change.
//
import { authHeaders } from "./auth-context.jsx";
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
  // 2026-08-03: campaign copy and call scripts are finished, approved work too. Folding them
  // into this taxonomy is what lets the Library own approval outright, instead of campaigns
  // running a parallel draft/in-review/approved vocabulary (spec §1: no fact has two homes).
  { id: "call-script", label: "Call scripts" },
];

/** Entries a campaign owns — the pieces authored for it, in catalog order. */
export function entriesForCampaign(entries, campaignId) {
  return (entries || []).filter((e) => e.campaignId === campaignId);
}

/** Approved-and-live pieces of a category — what a campaign may actually use. */
export function postedOfCategory(entries, category, campaignId) {
  return (entries || []).filter((e) =>
    entryStatus(e) === "posted" &&
    (!category || e.category === category) &&
    (!campaignId || e.campaignId === campaignId));
}
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

// ---- Backing store ---------------------------------------------------------------------------
// CONNECTED to Netlify Blobs (Rick, 2026-08-03: "let's connect it"). It was localStorage, which
// meant a piece saved from Compose existed only in the browser that saved it — invisible to the
// team, lost on a cache clear, and impossible for CST to review, which breaks the spec's own
// Compose → Submit → Review → Post flow. It also can't be "the source for content approval"
// while it's browser-local. Same move, same reason, as crm-outreach.js.
//
// The sync API is kept EXACTLY as it was, because Compose and the proposal builder call
// loadCatalog()/addEntry() synchronously mid-render (quota checks). So: an in-memory cache is
// the synchronous source of truth, hydrated once by fetchCatalog(), and every mutation writes
// through to Blobs on a short debounce. localStorage stays as a one-time migration source and
// as an offline mirror, never as the system of record.

const KEY = (tenantId) => `cs-presentations-${tenantId}`;
const cache = new Map();      // tenantId -> entries[]
const hydrated = new Set();   // tenants whose Blobs catalog has been loaded
let saveTimer = null;
let pendingTenant = null;
const saveListeners = new Set();
function setSaveState(s) { for (const fn of saveListeners) fn(s); }

/** Subscribe to catalog save status ("saving" | "saved" | "denied" | "failed"). */
export function subscribeSaveState(fn) {
  saveListeners.add(fn);
  return () => saveListeners.delete(fn);
}

function localRead(tenantId) {
  try { return JSON.parse(localStorage.getItem(KEY(tenantId))) || []; } catch { return []; }
}
function localWrite(tenantId, list) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(list)); } catch { /* quota */ }
}

/**
 * Hydrate the catalog for a tenant from Blobs. Call once per tenant before rendering the Library.
 * If the remote catalog is empty but this browser still holds localStorage entries, those are
 * MIGRATED up on first load — so nothing anyone saved before this change is silently orphaned.
 */
export async function fetchCatalog(tenantId) {
  try {
    const res = await fetch(`/.netlify/functions/content-library?tenant=${encodeURIComponent(tenantId)}`, {
      headers: { ...(await authHeaders()) },
    });
    if (!res.ok) {
      // 2026-09-03 hardening audit: this used to fall back to { entries: [] } here, which is
      // INDISTINGUISHABLE from a genuinely-empty catalog to the migration check just below --
      // entries.length === 0 with legacy localStorage entries present would fire scheduleSave()
      // and overwrite the real remote catalog with just this browser's stale local cache. Treat
      // an HTTP failure the same safe, read-only way the catch{} block below already does.
      const legacy = localRead(tenantId);
      cache.set(tenantId, legacy);
      return legacy;
    }
    const data = await res.json();
    let entries = Array.isArray(data.entries) ? data.entries : [];

    const legacy = localRead(tenantId);
    if (entries.length === 0 && legacy.length > 0) {
      entries = legacy;
      cache.set(tenantId, entries);
      hydrated.add(tenantId);
      scheduleSave(tenantId);        // push the migration up
      return entries;
    }
    cache.set(tenantId, entries);
    hydrated.add(tenantId);
    localWrite(tenantId, entries);   // offline mirror only
    return entries;
  } catch {
    // Network/function unavailable: fall back to whatever this browser has, read-only in effect.
    const legacy = localRead(tenantId);
    cache.set(tenantId, legacy);
    return legacy;
  }
}

/** Synchronous read of the hydrated catalog. Falls back to localStorage before hydration. */
export function loadCatalog(tenantId) {
  if (cache.has(tenantId)) return cache.get(tenantId);
  const legacy = localRead(tenantId);
  cache.set(tenantId, legacy);
  return legacy;
}

function scheduleSave(tenantId) {
  pendingTenant = tenantId;
  setSaveState("saving");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const t = pendingTenant;
    try {
      const res = await fetch("/.netlify/functions/content-library", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ tenant: t, entries: cache.get(t) || [] }),
      });
      setSaveState(res.ok ? "saved" : res.status === 401 ? "denied" : "failed");
    } catch {
      setSaveState("failed");
    }
  }, 700);
}

/** Write through: update the sync cache + the offline mirror, then push to Blobs. */
function saveCatalog(tenantId, list) {
  cache.set(tenantId, list);
  localWrite(tenantId, list);
  scheduleSave(tenantId);
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
