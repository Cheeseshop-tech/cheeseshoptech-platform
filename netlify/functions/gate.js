// Netlify Function: pilot passcode gate, three tiers (docs/ADMIN_DASHBOARDS_SPEC.md §2).
// Secrets stay server-side, never in the browser bundle. Used when VITE_AUTH_MODE=passcode.
//
//   PORTAL_PASSCODE                      → role "client"        (portal users)
//   PORTAL_ADMIN_PASSCODE_<TENANT_ID>    → role "client-admin"  (per-tenant Manage tier;
//   PORTAL_ADMIN_PASSCODE                  generic fallback if no per-tenant var is set)
//   PORTAL_HOUSE_PASSCODE                → role "admin"         (CheeseShop TECH staff;
//                                          falls back to PORTAL_PASSCODE if unset — pre-F1 behavior)
//
// The request includes the tenant subdomain so per-tenant admin passcodes resolve.
// Replaced by Clerk at client #2; the roles carry over unchanged.
//
// Every real attempt (success or failure) is logged — WHO (IP), WHEN, WHICH tier, for WHICH
// tenant (2026-07-18, closes the "logins aren't tracked at all" gap — writes have been logged
// since 2026-07-06, but the login step itself never was). See _login-log.js / login-log.js.

import { logLogin } from "./_login-log.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const client = process.env.PORTAL_PASSCODE;
  if (!client) return resp(500, { error: "PORTAL_PASSCODE not configured" });

  let passcode = "";
  let tenant = "";
  try {
    const body = JSON.parse(event.body || "{}");
    passcode = (body.passcode || "").toString();
    tenant = (body.tenant || "").toString().toLowerCase().replace(/[^a-z0-9-]/g, "");
  } catch { /* ignore */ }
  // Empty passcode = the Agency Console's health-check ping (pingGate() in agency-console.jsx),
  // not a real login attempt — skip logging so the log isn't noise from every dashboard load.
  if (!passcode) return resp(401, { ok: false });

  const tenantKey = tenant ? `PORTAL_ADMIN_PASSCODE_${tenant.toUpperCase().replace(/-/g, "_")}` : null;
  const clientAdmin = (tenantKey && process.env[tenantKey]) || process.env.PORTAL_ADMIN_PASSCODE;
  const house = process.env.PORTAL_HOUSE_PASSCODE;

  // Most-privileged match wins; tiers must use distinct passcodes to be meaningful.
  let role = null;
  if (house && passcode === house) role = "admin";
  else if (clientAdmin && passcode === clientAdmin) role = "client-admin";
  else if (passcode === client) role = !house ? roleForLegacyHouse(event) : "client";

  await logLogin(event, { ok: !!role, role, tenant: tenant || null });

  if (role) return resp(200, { ok: true, role });
  return resp(401, { ok: false });
};

// Pre-F1, the single passcode unlocked everything including the ?app=1 house view. If no
// house passcode is configured yet, keep that working: the house view needs admin.
function roleForLegacyHouse(event) {
  try {
    const ref = event.headers?.referer || "";
    return /[?&]app=1/.test(ref) ? "admin" : "client";
  } catch { return "client"; }
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}
