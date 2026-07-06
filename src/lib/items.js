// Item data layer — Media Hub is the source of truth for the item's IDENTITY + COPY record
// (Rick, 2026-07-03): item number, pack size, weight, UPC, short description, long description,
// certification — in that order, mirroring the price & inventory sheet's organization.
// PRICING IS EXPLICITLY NOT HELD OR EDITED HERE — it stays with the Custom Price List Creator
// (one mind, one body). Slides, blogs, emails, and social posts pull descriptions from here.
//
// Storage: ONE raw JSON document per tenant in Cloudinary at `${tenantFolder}/copy/items.json`,
// written server-side by the items-save Netlify function (signed upload, overwrite + invalidate)
// and read by items-get. Mock mode (dev) persists to localStorage behind the same seam.

import { rolesOf } from "./auth.js";
import { seedFor } from "./items-seeds.js";
import { writeAuthHeader } from "./auth-context.jsx";
import { RELOGIN_MSG } from "./media.js";

// Same management tier as asset editing (2026-07-06: tightened to admin/client-admin — see
// media.js canManageMedia and netlify/functions/_write-guard.js, which enforces this server-side
// on items-save too).
export function canManageItems(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client-admin");
}

/** Empty per-tenant document. `items` is keyed by item number (SKU) for O(1) lookups. */
export function emptyDoc() {
  return { version: 2, updatedAt: null, items: {} };
}

/**
 * Empty item record. Field ORDER mirrors the price & inventory sheet:
 * item number → pack size → weight → UPC → short description → long description → certification.
 * NO pricing fields — pricing is owned by the Custom Price List Creator.
 */
export function emptyItem(sku = "") {
  return {
    sku,                   // item number
    name: "",              // product name — THE identity (catalog display name comes from here)
    packSize: "",          // e.g. "12 × 200 g"
    weight: "",            // e.g. "200 g" / "~5.5 lb wheel (catch weight)"
    upc: "",               // e.g. "8 001234 567890"
    milkType: "",          // e.g. "Cow milk"
    minAge: "",            // e.g. "min. 10 months"
    shortDescription: "",  // one-liner — social posts, email subject areas, catalog blurbs
    longDescription: "",   // full story — slides, blog posts, sell sheets
    certification: "",     // e.g. "DOP", "PDO · EU Organic"
    updatedAt: null,
  };
}

// ---- Consumer API (slides / blogs / emails / social pull copy through these) ----------------

/** One item by item number (or null). */
export function getItem(doc, sku) {
  return doc?.items?.[sku] || null;
}

/** All items as a sorted array (by item number). */
export function listItems(doc) {
  return Object.values(doc?.items || {}).sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
}

/**
 * The description block for a SKU at a given length, with graceful fallback to the other if
 * only one is filled. `length` = "short" (social, email) | "long" (slides, blog, sell sheets).
 * @example descriptionFor(doc, "MT-ASIA-200", "short")
 */
/**
 * Compact spec line for an item — "13 lbs · 1/wheel per case · Cow milk · min. 10 months".
 * Used in dialog headers and grid tiles; empty string when nothing is filled.
 */
export function specLine(item) {
  if (!item) return "";
  return [item.weight, item.packSize, item.milkType, item.minAge].filter(Boolean).join(" · ");
}

export function descriptionFor(doc, sku, length = "short") {
  const it = getItem(doc, sku);
  if (!it) return "";
  return length === "long"
    ? (it.longDescription || it.shortDescription || "")
    : (it.shortDescription || it.longDescription || "");
}

// ---- Migration --------------------------------------------------------------------------------

// v1 docs (2026-07-03, short-lived) had `cards[]` + `pricing{}`. Coerce to the v2 shape:
// first short-ish card body → shortDescription, longest card body → longDescription.
// Pricing is DROPPED by decision — it never belonged here.
function migrateItem(raw) {
  const base = emptyItem(raw.sku || "");
  const out = { ...base, ...pick(raw, Object.keys(base)) };
  if (!out.shortDescription && !out.longDescription && Array.isArray(raw.cards) && raw.cards.length) {
    const bodies = raw.cards.map((c) => c?.body || "").filter(Boolean);
    if (bodies.length) {
      const sorted = [...bodies].sort((a, b) => a.length - b.length);
      out.shortDescription = sorted[0];
      out.longDescription = sorted[sorted.length - 1] !== sorted[0] ? sorted[sorted.length - 1] : "";
    }
  }
  if (!out.packSize && raw.casePack) out.packSize = raw.casePack; // v1 name
  return out;
}

function pick(obj, keys) {
  const o = {};
  keys.forEach((k) => { if (obj[k] != null) o[k] = obj[k]; });
  return o;
}

function migrateDoc(doc) {
  const items = {};
  Object.entries(doc?.items || {}).forEach(([sku, it]) => { items[sku] = migrateItem({ ...it, sku }); });
  return { version: 2, updatedAt: doc?.updatedAt || null, items };
}

/**
 * Fill blanks from the tenant's catalog-generated seed so EVERY product carries specs +
 * descriptions out of the box. Field-level: a saved (non-empty) value always beats the seed;
 * items missing from the doc are created wholesale from the seed.
 */
function withSeed(doc, tenantFolder) {
  const seed = seedFor(tenantFolder);
  if (!seed?.items) return doc;
  const items = { ...doc.items };
  Object.entries(seed.items).forEach(([sku, s]) => {
    const cur = items[sku];
    if (!cur) { items[sku] = { ...emptyItem(sku), ...s }; return; }
    const merged = { ...cur };
    Object.entries(s).forEach(([k, v]) => { if (v && !merged[k]) merged[k] = v; });
    items[sku] = merged;
  });
  return { ...doc, items };
}

// ---- Load / save ------------------------------------------------------------------------------

const USE_MOCK = (import.meta.env.VITE_MEDIA_BACKEND || "mock") === "mock";
const LS_KEY = (tenantFolder) => `cs-items-${tenantFolder}`;

/** Load the tenant's item document. Never throws for "not created yet" — returns emptyDoc(). */
export async function loadItems(tenantFolder) {
  if (USE_MOCK) {
    try { return withSeed(migrateDoc(JSON.parse(localStorage.getItem(LS_KEY(tenantFolder)) || "{}")), tenantFolder); }
    catch { return withSeed(emptyDoc(), tenantFolder); }
  }
  const res = await fetch(`/.netlify/functions/items-get?folder=${encodeURIComponent(tenantFolder)}`);
  if (res.status === 404) return withSeed(emptyDoc(), tenantFolder);
  if (!res.ok) throw new Error(`Items load failed (${res.status})`);
  return withSeed(migrateDoc(await res.json()), tenantFolder);
}

/** Save the WHOLE document (single-writer model — fine for a solo/small team tenant). */
export async function saveItems(tenantFolder, doc) {
  const out = { ...doc, version: 2, updatedAt: new Date().toISOString() };
  if (USE_MOCK) {
    try { localStorage.setItem(LS_KEY(tenantFolder), JSON.stringify(out)); } catch { /* quota */ }
    return out;
  }
  const res = await fetch("/.netlify/functions/items-save", {
    method: "POST",
    headers: { "content-type": "application/json", ...writeAuthHeader() },
    body: JSON.stringify({ folder: tenantFolder, doc: out }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error(RELOGIN_MSG);
    const msg = await res.text().catch(() => "");
    throw new Error(`Items save failed (${res.status}) ${msg}`);
  }
  return out;
}

/** Upsert one item into a doc (pure — returns a new doc for React state). */
export function upsertItem(doc, item) {
  const sku = (item.sku || "").trim();
  if (!sku) throw new Error("Item needs an item number");
  return {
    ...doc,
    items: { ...doc.items, [sku]: { ...item, sku, updatedAt: new Date().toISOString() } },
  };
}

/** Remove one item (pure). */
export function removeItem(doc, sku) {
  const items = { ...doc.items };
  delete items[sku];
  return { ...doc, items };
}
