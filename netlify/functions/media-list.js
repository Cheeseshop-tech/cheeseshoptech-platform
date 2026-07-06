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

export const handler = async (event) => {
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
  // Page through next_cursor (cap at ~500 assets / 5 pages per prefix) so we don't truncate.
  async function listPrefix(prefix) {
    const base =
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
      `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=100&tags=true&context=true`;
    let resources = [];
    let cursor = null;
    for (let page = 0; page < 5; page++) {
      const res = await fetch(cursor ? `${base}&next_cursor=${encodeURIComponent(cursor)}` : base, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
      const data = await res.json();
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
        // Filename = item code for legacy packshots → derive sku unless context already set one.
        const name = r.public_id.slice(legacy.length + 1);
        if (!r.context?.custom?.sku && /^[A-Za-z0-9-]+$/.test(name)) {
          r.context = { ...r.context, custom: { ...r.context?.custom, sku: name } };
        }
        resources.push(r);
      }
    }

    const assets = resources.map((r) => {
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
    });

    return json(200, assets);
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=60" },
    body: JSON.stringify(body),
  };
}
