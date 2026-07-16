// Shared write-auth guard for the Cloudinary-rewrite endpoints (media-update, media-delete,
// items-save). NOT exported as its own Netlify function (leading underscore — see netlify.toml
// note below); imported by the functions that need it.
//
// Why this exists (2026-07-06): these three endpoints called the Cloudinary Admin API with the
// secret safely server-side, but had NO check on the CALLER — the client-side role gates
// (canManageMedia/canDeleteMedia/canManageItems) only hid buttons in the UI; hitting the
// function URL directly with curl rewrote/deleted assets with zero auth. Rick's call: only CST
// (house passcode) and a client's admin (client-admin passcode) may write; the base "client"
// portal-viewer passcode and unauthenticated requests are blocked. Direct-to-Cloudinary access
// (bypassing this app) was never possible anyway — the API secret never leaves the server; this
// closes the OTHER gap, which was that our OWN write endpoints didn't check who was asking.
//
// Same shared-passcode model as gate.js (pilot auth, docs/AUTH_AND_ROLES.md) — replay the
// passcode the user unlocked the portal with, sent as the x-portal-passcode header (mirrors the
// existing x-publish-secret pattern used by inventory-publish.js). Per-tenant admin passcode key
// mirrors gate.js's PORTAL_ADMIN_PASSCODE_<TENANT>.

function header(event, name) {
  const h = event.headers || {};
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()] || "";
}

/**
 * @param {object} event   Netlify function event.
 * @param {string} [tenant] Optional tenant id/subdomain for the per-tenant admin passcode.
 * @returns {{ok:true, role:"admin"|"client-admin"} | {ok:false, status:number, error:string}}
 */
export function requireWriteAuth(event, tenant = "") {
  const provided = (header(event, "x-portal-passcode") || "").toString();
  if (!provided) return { ok: false, status: 401, error: "Missing passcode (x-portal-passcode header)" };

  const house = process.env.PORTAL_HOUSE_PASSCODE;
  const genericAdmin = process.env.PORTAL_ADMIN_PASSCODE;
  const tenantKey = tenant ? `PORTAL_ADMIN_PASSCODE_${tenant.toUpperCase().replace(/-/g, "_")}` : null;
  const tenantAdmin = tenantKey ? process.env[tenantKey] : null;

  if (house && provided === house) return { ok: true, role: "admin" };
  if (tenantAdmin && provided === tenantAdmin) return { ok: true, role: "client-admin" };
  if (genericAdmin && provided === genericAdmin) return { ok: true, role: "client-admin" };
  // Deliberately NOT checking PORTAL_PASSCODE (base client tier) — writes are admin/client-admin only.
  return { ok: false, status: 401, error: "Invalid passcode for this action" };
}

/**
 * Read-tier auth (2026-07-16, wiring-audit P0 #1): identical model to requireWriteAuth(),
 * with ONE difference — reads ALSO accept the base client-tier passcode (PORTAL_PASSCODE),
 * mirroring exactly the tiers gate.js unlocks the portal with. Rationale: the 2026-07-06 write
 * fix was never extended to reads, so every data-returning function (crm-hubspot, crm-summary,
 * items-get, media-list, inventory, history) answered a bare URL with tenant data. Now any
 * valid passcode tier is required to read; writes stay admin/client-admin only.
 * @param {object} event   Netlify function event.
 * @param {string} [tenant] Optional tenant id/subdomain for the per-tenant admin passcode.
 * @returns {{ok:true, role:"admin"|"client-admin"|"client"} | {ok:false, status:number, error:string}}
 */
export function requireReadAuth(event, tenant = "") {
  const provided = (header(event, "x-portal-passcode") || "").toString();
  if (!provided) return { ok: false, status: 401, error: "Missing passcode (x-portal-passcode header)" };

  const house = process.env.PORTAL_HOUSE_PASSCODE;
  const genericAdmin = process.env.PORTAL_ADMIN_PASSCODE;
  const tenantKey = tenant ? `PORTAL_ADMIN_PASSCODE_${tenant.toUpperCase().replace(/-/g, "_")}` : null;
  const tenantAdmin = tenantKey ? process.env[tenantKey] : null;
  const client = process.env.PORTAL_PASSCODE; // base tier — reads only, mirrors gate.js

  if (house && provided === house) return { ok: true, role: "admin" };
  if (tenantAdmin && provided === tenantAdmin) return { ok: true, role: "client-admin" };
  if (genericAdmin && provided === genericAdmin) return { ok: true, role: "client-admin" };
  if (client && provided === client) return { ok: true, role: "client" };
  return { ok: false, status: 401, error: "Invalid passcode" };
}

export function jsonUnauthorized(result) {
  return {
    statusCode: result.status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: result.error }),
  };
}
