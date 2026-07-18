// Netlify Function: list a tenant's Cloudinary assets for the Media Hub.
// Calls the Cloudinary Admin API server-side so the API secret NEVER reaches the browser.
// Activates when these env vars are set in Netlify (see .env.example):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// Front end uses this when VITE_MEDIA_BACKEND=cloudinary. Maps to the shape src/lib/media.js expects.

const APPROVAL_TAGS = ["approved-for-influencers", "approved-for-press", "draft"];
const FOLDERS = ["products", "brand", "raw", "library"];
// Usage taxonomy (mirror of src/lib/media.js USAGE). Tags that match these become the asset's
// usage[] — what drives the Media Hub's tag tabs and the Product Catalog gate (product-catalog).
const USAGE_IDS = [
  "product-catalog", "hero", "story-block", "lifestyle", "food-styling", "production",
  "social", "press", "event", "brand-asset", "email-campaign", "print", "web-marketing",
];
// Background-removal tag convention (2026-07-18, dispatch/background audit fix #3). Not a usage
// purpose — it's a per-asset quality flag, same idea as the approval tags — so it's surfaced as
// its own boolean rather than folded into usage[].
const BG_REMOVED_TAG = "bg-removed";

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";

// Map one Cloudinary Admin API resource to the shape src/lib/media.js expects. Shared by both
// the legacy (fetch-everything) path and the paged path below so they can never drift.
function mapResource(r) {
  const segs = r.public_id.split("/");
  // Assets sitting at the tenant root (no products/brand/raw subfolder) default to
  // "products" so they show on the Media Hub's default tab.
  const folder = FOLDERS.find((f) => segs.includes(f)) || "products";
  const tags = r.tags || [];
  // Untagged assets are finished, published product photography → "approved-for-press".
  // Only an explicit "draft" tag marks a work-in-progress; this keeps the library from
  // showing a sea of DRAFT badges on real packshots.
  const approvalState = APPROVAL_TAGS.find((s) => tags.includes(s)) || "approved-for-press";
  return {
    publicId: r.public_id,
    sku: r.context?.custom?.sku || "",
    folder,
    title: r.context?.custom?.caption || segs[segs.length - 1],
    alt: r.context?.custom?.alt || "",
    description: r.context?.custom?.description || "",
    usage: tags.filter((t) => USAGE_IDS.includes(t)),
    approvalState,
    bgRemoved: tags.includes(BG_REMOVED_TAG),
    format: r.format,
    width: r.width,
    height: r.height,
    // Added so this ONE live endpoint can also feed the canonical images.json manifest
    // (scripts/sync-images.mjs --live) without needing the Cloudinary Admin API secret
    // locally — version for cache-busting, bytes/modified for display only.
    version: r.version,
    bytes: r.bytes,
    modified: (r.created_at || "").slice(0, 10),
  };
}

// Legacy assets (2026-07-06) get their SKU DERIVED from the filename (monti/01021 → sku 01021)
// when Cloudinary context didn't already set one. Shared by both paths.
function withLegacySku(r, legacy) {
  if (r.context?.custom?.sku) return r;
  const name = r.public_id.slice(legacy.length + 1);
  if (/^[A-Za-z0-9-]+$/.test(name)) {
    return { ...r, context: { ...r.context, custom: { ...r.context?.custom, sku: name } } };
  }
  return r;
}

export const handler = async (event) => {
  // Any valid passcode tier (2026-07-16, wiring-audit P0 #1) — the full asset list (including
  // unapproved/draft) used to be readable from a bare URL with zero auth.
  //
  // 2026-07-18 fix: this used to derive the tenant via tenantFromPath(folder), which only ever
  // matches a "clients/<slug>" style path — but `folder` here is a bare Cloudinary folder name
  // (e.g. "monti-trentini"), so it NEVER matched and the per-tenant admin passcode
  // (PORTAL_ADMIN_PASSCODE_<TENANT>) could never unlock this endpoint. crm-summary.js,
  // crm-hubspot.js, inventory.js, and history.js all already take an explicit `tenant` query
  // param instead — matching that pattern here so per-tenant manager passcodes actually work
  // on reads, not just at login (found live-testing the new Monti Trentini manager passcode).
  const readAuth = requireReadAuth(event, (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, ""));
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    return json(500, { error: "Cloudinary env vars not configured" });
  }

  const folderPrefix = (event.queryStringParameters?.folder || "").replace(/[^a-zA-Z0-9/_-]/g, "");
  if (!folderPrefix) return json(400, { error: "Missing folder" });
  // Legacy folders (2026-07-06): some tenants have assets predating the tenant folder — Monti's
  // 71 SKU packshots live at `monti/<itemcode>` with no context/tags, so the Media Hub never
  // showed them. Config-driven (cloudinaryLegacyFolders in config/clients/<tenant>.json),
  // comma-joined by src/lib/media.js. Legacy assets get their SKU DERIVED from the filename
  // (monti/01021 → sku 01021) so they auto-link to item records. We deliberately do NOT
  // move/rename the assets: campaign materials + the pricing tool's codeImageUrl fallback
  // reference the `monti/<code>` delivery URLs. One-folder migration = its own session.
  const legacyFolders = (event.queryStringParameters?.legacy || "")
    .split(",")
    .map((f) => f.replace(/[^a-zA-Z0-9/_-]/g, ""))
    .filter(Boolean);

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  async function fetchPage(prefix, cursor, maxResults) {
    const base =
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
      `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=${maxResults}&tags=true&context=true`;
    const res = await fetch(cursor ? `${base}&next_cursor=${encodeURIComponent(cursor)}` : base, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
    return res.json();
  }

  // ---- PAGED MODE (2026-07-18, media-hub load-time fix) ------------------------------------
  // The Media Hub used to await the WHOLE tenant asset set (main folder + every legacy folder,
  // each internally paged up to 500) before rendering a single tile — fine at dozens of assets,
  // increasingly slow as Rick tags more (292+ today, across `monti-trentini` + legacy `monti`).
  // Opt-in via `paged=1` so the old "everything at once" behavior below is UNCHANGED for the
  // other two callers (MediaPicker, Studio Director) that still want a full list in one call.
  // `cursor` walks: "main:<raw|>" → once main is exhausted, "legacy:<index>:<raw|>" → null.
  if (event.queryStringParameters?.paged) {
    const maxResults = Math.min(Number(event.queryStringParameters?.max_results) || 60, 100);
    const rawCursorParam = event.queryStringParameters?.cursor || `main:`;
    const [source, idxOrCursor, maybeCursor] = rawCursorParam.split(":");

    try {
      if (source === "main") {
        const rawCursor = idxOrCursor || null;
        const data = await fetchPage(folderPrefix, rawCursor, maxResults);
        const assets = (data.resources || []).map(mapResource);
        const nextCursor = data.next_cursor
          ? `main:${data.next_cursor}`
          : legacyFolders.length ? `legacy:0:` : null;
        return json(200, { assets, nextCursor });
      }

      // source === "legacy" — idxOrCursor is the legacy-folder INDEX, maybeCursor its raw cursor.
      const idx = Number(idxOrCursor) || 0;
      const legacy = legacyFolders[idx];
      if (!legacy) return json(200, { assets: [], nextCursor: null });
      const rawCursor = maybeCursor || null;
      const data = await fetchPage(legacy, rawCursor, maxResults);
      const assets = (data.resources || [])
        // Admin-API `prefix` is a STRING match (`monti` also matches `monti-trentini/…`) — keep
        // only assets exactly inside this legacy folder.
        .filter((r) => r.public_id.startsWith(`${legacy}/`))
        .map((r) => withLegacySku(r, legacy))
        .map(mapResource);
      const nextCursor = data.next_cursor
        ? `legacy:${idx}:${data.next_cursor}`
        : legacyFolders[idx + 1] ? `legacy:${idx + 1}:` : null;
      return json(200, { assets, nextCursor });
    } catch (err) {
      return json(502, { error: String(err?.message || err) });
    }
  }

  // ---- FULL MODE (unchanged) — everything in one response, bare array ----------------------
  async function listPrefix(prefix) {
    // Page through next_cursor (cap at ~500 assets / 5 pages per prefix) so we don't truncate.
    let resources = [];
    let cursor = null;
    for (let page = 0; page < 5; page++) {
      const data = await fetchPage(prefix, cursor, 100);
      resources = resources.concat(data.resources || []);
      cursor = data.next_cursor;
      if (!cursor) break;
    }
    return resources;
  }

  try {
    const resources = await listPrefix(folderPrefix);
    const seen = new Set(resources.map((r) => r.public_id));
    for (const legacy of legacyFolders) {
      const extra = await listPrefix(legacy);
      for (const r of extra) {
        // Admin-API `prefix` is a STRING match (`monti` also matches `monti-trentini/…`) —
        // keep only assets exactly inside the legacy folder, and never duplicate.
        if (!r.public_id.startsWith(`${legacy}/`) || seen.has(r.public_id)) continue;
        seen.add(r.public_id);
        resources.push(withLegacySku(r, legacy));
      }
    }

    return json(200, resources.map(mapResource));
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    // no-store (was max-age=60, 2026-07-06): the 60s browser cache meant an edit + reload
    // within a minute served the PRE-edit list — saved changes looked like they didn't stick.
    // The hub fetches once per mount, so caching bought almost nothing.
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}
