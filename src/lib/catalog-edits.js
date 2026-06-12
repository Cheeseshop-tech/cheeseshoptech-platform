// Catalog metadata edits (F3, ADMIN_DASHBOARDS_SPEC §4). Client-admins fix titles, item
// codes, and descriptions in the portal; edits overlay the bundled catalog data. Pilot
// persistence = per-tenant localStorage + export/import JSON (same model as the standalone
// catalog app, whose key was monti_catalog_edits_v1). The export feeds the price-list
// workflow; a real backend (Netlify function over the canonical store) replaces this seam
// later with the same shape.
//
// Shape: { [imageId]: { code?, title?, description? } }

const KEY = (tenantId) => `cs-catalog-edits-${tenantId}`;

export function loadEdits(tenantId) {
  try { return JSON.parse(localStorage.getItem(KEY(tenantId))) || {}; } catch { return {}; }
}

export function saveEdits(tenantId, edits) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(edits)); } catch { /* quota */ }
  return edits;
}

export function setEdit(tenantId, edits, imageId, field, value) {
  const next = { ...edits, [imageId]: { ...(edits[imageId] || {}) } };
  const v = (value || "").trim();
  if (v) next[imageId][field] = v;
  else delete next[imageId][field];
  if (Object.keys(next[imageId]).length === 0) delete next[imageId];
  return saveEdits(tenantId, next);
}

/** Overlay edits onto the bundled image list (non-destructive). */
export function applyEdits(images, edits) {
  if (!edits || Object.keys(edits).length === 0) return images;
  return images.map((im) => (edits[im.id] ? { ...im, ...edits[im.id] } : im));
}

/** Download the edits as JSON (wrapped with provenance, same as the standalone app). */
export function exportEdits(tenantId, edits) {
  const payload = {
    exported: new Date().toISOString(),
    tenant: tenantId,
    count: Object.keys(edits).length,
    edits,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${tenantId}-catalog-edits-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Parse an edits file; supports the wrapped payload and a raw edits map. */
export function parseEditsFile(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed.edits || parsed;
  if (typeof incoming !== "object" || Array.isArray(incoming)) throw new Error("Not an edits file");
  return incoming;
}
