// Presentations catalog store (same localStorage-overlay model as brand-kit-edits.js).
// Presentations = a CATALOG of finished proposals (built in the Proposals tool) that the
// brand team saves here to organize and SHARE. Entries persist per-tenant in localStorage and
// merge with any config-defined decks. A real save backend drops in behind these same seams later.
//
// Entry shape:
//   { key, title, eyebrow?, description?, cover, kind: "link"|"pdf"|"deck", url?, slides?, savedAt }
//   - kind "link"/"pdf": `url` is the shareable link to the finished proposal (a public PDF or page)
//   - kind "deck": `slides` is an array of image URLs (config decks render in the slide viewer)

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

/** Normalize a user-entered cover: full URL as-is, else treat as a Cloudinary public_id. */
export function coverUrl(cover, cldUrlFn) {
  if (!cover) return "";
  if (/^https?:\/\//i.test(cover)) return cover;
  return cldUrlFn ? cldUrlFn(cover, "card") : cover;
}
