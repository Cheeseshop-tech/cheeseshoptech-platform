// Netlify Function: read the tenant's item document (Media Hub = source of truth for items).
// The doc lives in Cloudinary as a RAW asset at `${folder}/copy/items.json`. We hit the Admin API
// first to learn the current VERSION, then fetch the versioned delivery URL — so we never serve a
// stale CDN copy after a save. Same env as the other media functions; secret stays server-side.
//
// GET ?folder=clients/montitrentini  ->  200 {version, updatedAt, items} | 404 if never saved

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";

export const handler = async (event) => {
  // Any valid passcode tier (2026-07-16, wiring-audit P0 #1) — item identity/copy docs used to
  // be readable from a bare URL with zero auth.
  //
  // 2026-07-18 fix: this used to derive the tenant via tenantFromPath(folder), which only ever
  // matches a "clients/<slug>" style path — but `folder` here is a bare Cloudinary folder name
  // (e.g. "monti-trentini"), so it NEVER matched and the per-tenant admin passcode
  // (PORTAL_ADMIN_PASSCODE_<TENANT>) could never unlock this endpoint. crm-summary.js,
  // crm-hubspot.js, inventory.js, and history.js all already take an explicit `tenant` query
  // param instead — matching that pattern here (found live-testing the new Monti Trentini
  // manager passcode: it unlocked the portal fine but every item/photo read still 401'd).
  const readAuth = requireReadAuth(event, (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, ""));
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return json(500, { error: "Cloudinary env vars not configured" });

  const folder = (event.queryStringParameters?.folder || "").replace(/[^a-zA-Z0-9_\-/]/g, "");
  if (!folder) return json(400, { error: "Missing folder" });

  const publicId = `${folder}/copy/items.json`;
  const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");

  try {
    // 1) Admin API: current version of the raw asset (404 = doc not created yet).
    const meta = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/raw/upload/${encodeURIComponent(publicId)}`,
      { headers: { Authorization: auth } }
    );
    if (meta.status === 404) return json(404, { error: "No items document yet" });
    if (!meta.ok) return json(meta.status, { error: `Cloudinary ${meta.status}` });
    const { version } = await meta.json();

    // 2) Versioned delivery URL — version in the path makes the fetch cache-proof.
    const res = await fetch(`https://res.cloudinary.com/${cloud}/raw/upload/v${version}/${publicId}`);
    if (!res.ok) return json(res.status, { error: `Delivery ${res.status}` });
    const doc = await res.json();
    return json(200, doc);
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
