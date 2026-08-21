// Netlify Function: record a REAL Netlify Identity sign-in to the Access log (login-log.js /
// _login-log.js). Rewired 2026-08-21 (Rick: "show names of who is logging in") — until now the
// only thing that ever wrote to this log was gate.js, the legacy passcode gate. The portal has
// signed people in with real per-user Identity since 2026-08-17 (docs/HANDOFF_2026-08-17_
// identity-write-guard-fix.md), and NOTHING recorded those logins — the Access log stopped
// reflecting reality the moment Identity went live and every row since has been either stale
// passcode-era history or nothing at all.
//
// Called once, client-side, right after a successful login() (src/lib/auth-context.jsx) —
// fire-and-forget, same simple pattern as the rest of this app's logging (_write-log.js,
// _login-log.js) rather than a Netlify Identity webhook/trigger. Crucially, the name/email/
// roles/tenant recorded here are NOT taken from anything the client sends in the request body —
// there isn't one. Netlify verifies the Identity JWT's signature and populates
// context.clientContext.user itself before this code ever runs (same mechanism _write-guard.js
// already trusts for every write), so a signed-in user cannot claim to be someone else here.
import { logLogin } from "./_login-log.js";

import { withMonitoring } from "./_sentry.js";

// Mirrors _write-guard.js's identityRole() — kept local/duplicated rather than imported because
// that helper returns only the write-tier role ("admin"/"client-admin"); logging wants the
// user's full role list plus a single best-label role for the table's Tier column.
const ADMIN_ROLES = ["owner", "admin"];

const rawHandler = async (event, context) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  // The only "auth" this endpoint needs: Netlify already verified the bearer JWT and populated
  // this before our code runs. No JWT, no clientContext.user, nothing to record.
  const user = context?.clientContext?.user || null;
  if (!user) return json(401, { error: "Not signed in" });

  const roles = user.app_metadata?.roles || [];
  const role = roles.includes("owner")
    ? "owner"
    : roles.includes("admin")
    ? "admin"
    : roles.includes("client-admin")
    ? "client-admin"
    : roles.includes("client")
    ? "client"
    : roles[0] || null;
  const tenant =
    user.app_metadata?.tenant ||
    roles.find((r) => r.startsWith("tenant:"))?.slice("tenant:".length) ||
    null;

  await logLogin(event, {
    ok: true,
    source: "identity",
    email: user.email || null,
    name: user.user_metadata?.full_name || null,
    role,
    roles,
    tenant,
  });

  return json(200, { ok: true });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

export const handler = withMonitoring("record-login", rawHandler);
