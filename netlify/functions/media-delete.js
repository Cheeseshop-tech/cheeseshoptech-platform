// Netlify Function: permanently delete one Cloudinary asset for the Media Hub (admin clearance).
// Calls the Cloudinary Admin API server-side so the API secret NEVER reaches the browser.
// Reuses the same env as media-list/media-update: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
// CLOUDINARY_API_SECRET.
//
// Body (JSON): { publicId, resourceType? }   resourceType defaults to "image".
// This is DESTRUCTIVE and irreversible — the UI gates it to admins and confirms before calling.

import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite, tenantFromPath } from "./_write-log.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  // Destructive — CST (house) or a client's admin only. See _write-guard.js.
  const writeAuth = requireWriteAuth(event);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "media-delete", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return json(500, { error: "Cloudinary env vars not configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  const publicId = (body.publicId || "").toString();
  if (!publicId) return json(400, { error: "Missing publicId" });
  const resourceType = ["image", "video", "raw"].includes(body.resourceType) ? body.resourceType : "image";

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  // Admin API delete-resources. public_id keeps its slashes; invalidate clears CDN copies.
  const url =
    `https://api.cloudinary.com/v1_1/${cloud}/resources/${resourceType}/upload` +
    `?public_ids[]=${encodeURIComponent(publicId)}&invalidate=true`;

  try {
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Basic ${auth}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json(res.status, { error: `Cloudinary ${res.status}`, detail: data });

    const outcome = data?.deleted?.[publicId]; // "deleted" | "not_found"
    if (outcome !== "deleted" && outcome !== "not_found") {
      return json(502, { error: "Delete not confirmed", detail: data });
    }
    await logWrite(event, {
      fn: "media-delete", ok: true, status: 200, role: writeAuth.role,
      action: `delete ${publicId} (${outcome})`, tenant: tenantFromPath(publicId),
    });
    return json(200, { ok: true, publicId, outcome });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
