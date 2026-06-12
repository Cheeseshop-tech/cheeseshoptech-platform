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
  if (!passcode) return resp(401, { ok: false });

  const tenantKey = tenant ? `PORTAL_ADMIN_PASSCODE_${tenant.toUpperCase().replace(/-/g, "_")}` : null;
  const clientAdmin = (tenantKey && process.env[tenantKey]) || process.env.PORTAL_ADMIN_PASSCODE;
  const house = process.env.PORTAL_HOUSE_PASSCODE;

  // Most-privileged match wins; tiers must use distinct passcodes to be meaningful.
  if (house && passcode === house) return resp(200, { ok: true, role: "admin" });
  if (clientAdmin && passcode === clientAdmin) return resp(200, { ok: true, role: "client-admin" });
  if (passcode === client) return resp(200, { ok: true, role: !house ? roleForLegacyHouse(event) : "client" });
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
