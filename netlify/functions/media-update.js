// Netlify Function: update one Cloudinary asset's metadata for the Media Hub (the WRITE counterpart
// to media-list). Calls the Cloudinary Admin API server-side so the API secret NEVER reaches the
// browser. Reuses the same env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
//
// Body (JSON): { publicId, displayName?, usage?[], sku?, alt?, approvalState? }
// Tags written  = approvalState (if valid) + usage ids  (REPLACES the asset's tags)
// Context written = caption / sku / alt  (REPLACES the asset's context)

const APPROVAL_TAGS = ["approved-for-influencers", "approved-for-press", "draft"];
const USAGE_IDS = [
  "product-catalog", "hero", "story-block", "lifestyle", "food-styling", "production",
  "social", "press", "event", "brand-asset", "email-campaign", "print", "web-marketing",
];

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return json(500, { error: "Cloudinary env vars not configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  const publicId = (body.publicId || "").toString();
  if (!publicId) return json(400, { error: "Missing publicId" });

  // Tags = validated approval + validated usage (whitelist guards against junk tags).
  const usage = Array.isArray(body.usage) ? body.usage.filter((u) => USAGE_IDS.includes(u)) : [];
  const approval = APPROVAL_TAGS.includes(body.approvalState) ? body.approvalState : null;
  const tags = [...(approval ? [approval] : []), ...usage];

  // Context = caption / sku / alt. Cloudinary context is key=value|key=value, so strip | and =.
  const clean = (s) => (s == null ? "" : String(s)).replace(/[|=\r\n]/g, " ").trim();
  const ctx = [];
  if (body.displayName != null) ctx.push(`caption=${clean(body.displayName)}`);
  if (body.sku != null) ctx.push(`sku=${clean(body.sku)}`);
  if (body.alt != null) ctx.push(`alt=${clean(body.alt)}`);
  if (body.description != null) ctx.push(`description=${clean(body.description)}`);

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const form = new URLSearchParams();
  form.set("tags", tags.join(",")); // replaces the asset's tags
  if (ctx.length) form.set("context", ctx.join("|")); // replaces the asset's context

  // Admin API update-resource endpoint. public_id keeps its slashes in the path.
  const url = `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${publicId}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json(res.status, { error: `Cloudinary ${res.status}`, detail: data });
    return json(200, { ok: true, publicId, usage, approvalState: approval });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
