// Netlify Function: save the tenant's item document to Cloudinary as a RAW asset at
// `${folder}/copy/items.json` (the WRITE counterpart to items-get). Uses a SIGNED upload —
// unsigned presets can't overwrite a fixed public_id — with overwrite + invalidate so the CDN
// serves the new doc immediately. Secret never reaches the browser.
//
// POST { folder: "clients/montitrentini", doc: {version, updatedAt, items} }

import { createHash } from "node:crypto";
import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite, tenantFromPath } from "./_write-log.js";

const MAX_BYTES = 900_000; // items.json is text; ~1 MB guard against runaway payloads

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  // CST (house) or a client's admin only — see _write-guard.js.
  const writeAuth = requireWriteAuth(event);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "items-save", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return json(500, { error: "Cloudinary env vars not configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  const folder = (body.folder || "").replace(/[^a-zA-Z0-9_\-/]/g, "");
  if (!folder) return json(400, { error: "Missing folder" });
  const doc = body.doc;
  if (!doc || typeof doc !== "object" || typeof doc.items !== "object") {
    return json(400, { error: "Missing/invalid doc.items" });
  }

  const payload = JSON.stringify(doc);
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Items document too large" });

  const publicId = `${folder}/copy/items.json`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary upload signature: sorted params (excluding file/api_key/resource_type) + secret.
  const params = { invalidate: "true", overwrite: "true", public_id: publicId, timestamp: String(timestamp) };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHash("sha1").update(toSign + secret).digest("hex");

  const form = new URLSearchParams();
  form.set("file", `data:application/json;base64,${Buffer.from(payload).toString("base64")}`);
  form.set("api_key", key);
  form.set("timestamp", String(timestamp));
  form.set("public_id", publicId);
  form.set("overwrite", "true");
  form.set("invalidate", "true");
  form.set("signature", signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json(res.status, { error: `Cloudinary ${res.status}`, detail: data });
    await logWrite(event, {
      fn: "items-save", ok: true, status: 200, role: writeAuth.role,
      action: `save items ${publicId}`, tenant: tenantFromPath(folder),
    });
    return json(200, { ok: true, publicId, version: data.version, bytes: data.bytes });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
