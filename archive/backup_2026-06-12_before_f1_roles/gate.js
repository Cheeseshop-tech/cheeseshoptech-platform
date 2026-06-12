// Netlify Function: pilot passcode gate. Checks a submitted passcode against the server-side
// PORTAL_PASSCODE secret (never in the browser bundle). Used when VITE_AUTH_MODE=passcode — a
// simple shared-passcode front door for the single-client pilot, before per-user auth (Clerk).
// See docs/AUTH_AND_ROLES.md.

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const expected = process.env.PORTAL_PASSCODE;
  if (!expected) return resp(500, { error: "PORTAL_PASSCODE not configured" });

  let passcode = "";
  try { passcode = (JSON.parse(event.body || "{}").passcode || "").toString(); } catch { /* ignore */ }

  if (passcode && passcode === expected) return resp(200, { ok: true });
  return resp(401, { ok: false });
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}
