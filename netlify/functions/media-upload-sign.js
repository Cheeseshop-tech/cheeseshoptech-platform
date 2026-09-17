// Netlify Function: sign a Cloudinary upload so file uploads get REAL server-side admin auth
// (Rick, 2026-09-17). Before this, both the top-bar "Upload" button and the Media Hub's new
// "Replace image" action went straight to Cloudinary's UNSIGNED upload preset — a client-side
// role check (canUpload()) was the only gate; the preset name and cloud name both ship in the
// browser bundle, so anyone who found them could upload directly to Cloudinary with zero server
// involvement. This mirrors media-update.js/media-delete.js: requireWriteAuth() (admin or
// client-admin only) decides who gets a valid signature. The file bytes themselves still go
// straight from the browser to Cloudinary, never through this function, so there's no Lambda
// payload-size limit on upload size.
//
// Body (JSON): { tenant, folder, usage?[], displayName? }
// Returns: { cloud, apiKey, timestamp, signature, folder, tags, context } — the caller MUST
// upload using exactly these values; changing any signed param invalidates the signature.

import crypto from "node:crypto";
import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";
import { withMonitoring } from "./_sentry.js";

const USAGE_IDS = [
  "product-catalog", "hero", "back-shot", "unwrapped", "map-reference", "story-block", "lifestyle", "food-styling", "production",
  "social", "press", "event", "brand-asset", "email-campaign", "print", "web-marketing",
];
const APPROVAL_TAGS = ["approved-for-influencers", "approved-for-press", "draft"];

const rawHandler = async (event, context) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  const tenant = (body.tenant || "").toString().replace(/[^a-z0-9-]/gi, "");
  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "media-upload-sign", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return json(500, { error: "Cloudinary env vars not configured" });

  // Two modes:
  //  NEW upload  — caller passes `folder`; Cloudinary auto-names the asset and it starts "draft".
  //  REPLACE     — caller passes the `publicId` of an existing asset plus overwrite, re-uploading
  //                the same document in place (2026-09-17: the Monti Scheda spec sheets shipped
  //                without their font embedded, so the corrected files had to land on the SAME
  //                public_id — the manifest, the Buyer Catalog download links and the Media Hub
  //                tiles all address them by that id). A replace carries the asset's existing tags
  //                forward, so it must NOT be forced back to "draft" the way a new upload is —
  //                that would silently un-gate an already-approved document.
  const folder = (body.folder || "").toString().replace(/^\/+|\/+$/g, "");
  const publicId = (body.publicId || "").toString().replace(/^\/+/, "");
  if (!folder && !publicId) return json(400, { error: "Missing folder or publicId" });
  if (folder && publicId) return json(400, { error: "Pass folder (new upload) or publicId (replace), not both" });

  // resource_type rides in the URL path, NOT the signature — "raw" covers PDFs/spec sheets.
  const resourceType = body.resourceType === "raw" ? "raw" : "image";

  const usage = Array.isArray(body.usage) ? body.usage.filter((u) => USAGE_IDS.includes(u)) : [];
  let tags;
  if (publicId) {
    // Replace: the caller states the tag set to carry forward (read from media-list first).
    // Whitelisted the same way media-update.js does, plus the document/gating markers.
    const allowed = [...USAGE_IDS, ...APPROVAL_TAGS, "spec-sheet", "new-sku-pending", "bg-removed"];
    const asked = Array.isArray(body.tags) ? body.tags.filter((t) => allowed.includes(t)) : [];
    tags = [...new Set([...asked, ...usage])].join(",");
  } else {
    // New uploads always start "draft" (same as the old unsigned path) — approval is a separate,
    // deliberate step via media-update.js, never granted at upload time.
    tags = ["draft", ...usage].join(",");
  }

  // Cloudinary context is key=value|key=value — strip characters that would break that shape
  // (mirrors media-update.js's clean()). Named uploadContext, NOT context — that name is already
  // the Lambda context param above (caught by a local test run: redeclaring it is a SyntaxError).
  const clean = (s) => (s == null ? "" : String(s)).replace(/[|=\r\n]/g, " ").trim();
  const uploadContext = `caption=${clean(body.displayName)}`;

  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary's signature rule: sort every param that will be sent (other than file, cloud_name,
  // resource_type, api_key, signature) alphabetically by key, join as key=value&key=value, append
  // the API secret, SHA-1 hex digest. The caller echoes back exactly these values — it cannot add,
  // remove, or edit a signed param without invalidating the signature. Built from a map here (it
  // used to be one hardcoded string) so replace-mode's extra params land in the right sort order.
  const signed = { context: uploadContext, tags, timestamp };
  if (folder) signed.folder = folder;
  if (publicId) {
    signed.public_id = publicId;
    signed.overwrite = "true";
    signed.invalidate = "true"; // purge the CDN copy, or buyers keep getting the stale file
  }
  const toSign = Object.keys(signed).sort().map((k) => `${k}=${signed[k]}`).join("&") + secret;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  await logWrite(event, {
    fn: "media-upload-sign", ok: true, status: 200, role: writeAuth.role,
    action: publicId
      ? `sign-replace ${resourceType} ${publicId} tags=${tags}`
      : `sign-upload folder=${folder} tags=${tags}`,
    tenant: tenant || null,
  });

  return json(200, {
    cloud, apiKey: key, timestamp, signature, resourceType, tags, context: uploadContext,
    ...(folder ? { folder } : {}),
    ...(publicId ? { publicId, overwrite: "true", invalidate: "true" } : {}),
  });
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export const handler = withMonitoring("media-upload-sign", rawHandler);
