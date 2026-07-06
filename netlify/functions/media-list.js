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

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const base =
    `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
    `?type=upload&prefix=${encodeURIComponent(folderPrefix)}&max_results=100&tags=true&context=true`;

  try {
    // Page through next_cursor (cap at ~500 assets / 5 pages) so we don't truncate a folder.
    let resources = [];
    let cursor = null;
    for (let page = 0; page < 5; page++) {
      const res = await fetch(cursor ? `${base}&next_cursor=${encodeURIComponent(cursor)}` : base, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) return json(res.status, { error: `Cloudinary ${res.status}` });
      const data = await res.json();
      resources = resources.concat(data.resources || []);
      cursor = data.next_cursor;
      if (!cursor) break;
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
