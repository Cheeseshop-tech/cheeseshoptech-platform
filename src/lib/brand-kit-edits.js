// Brand-kit edit overlay (same model as catalog-edits.js). CheeseShop TECH edits a tenant's
// brand kit in the worksheet; edits persist per-tenant in localStorage and overlay the bundled
// brand-kit.json (the committed source of truth). Export → CST commits the JSON to the repo so
// the single source updates. A real house-admin save backend drops in behind the same seam later.

const KEY = (tenantId) => `cs-brandkit-${tenantId}`;

export function loadKitEdits(tenantId) {
  try { return JSON.parse(localStorage.getItem(KEY(tenantId))) || null; } catch { return null; }
}

export function saveKitEdits(tenantId, kit) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(kit)); } catch { /* quota */ }
  return kit;
}

export function clearKitEdits(tenantId) {
  try { localStorage.removeItem(KEY(tenantId)); } catch { /* ignore */ }
}

/** The working kit = localStorage edits if present, else the bundled source. Deep-cloned. */
export function workingKit(tenantId, bundled) {
  const edits = loadKitEdits(tenantId);
  return edits || (bundled ? JSON.parse(JSON.stringify(bundled)) : null);
}

/** Immutably set a dotted path (e.g. "voice.motto", "identity.colors.primary.hex") on a kit. */
export function setPath(obj, path, value) {
  const next = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Download the kit as JSON for committing to src/data/<tenant>/brand-kit.json. */
export function exportKit(tenantId, kit) {
  const payload = { ...kit, updatedAt: new Date().toISOString().slice(0, 10) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${tenantId}-brand-kit.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function parseKitFile(text) {
  const k = JSON.parse(text);
  if (!k || typeof k !== "object" || !k.schemaVersion) throw new Error("Not a brand-kit file");
  return k;
}
