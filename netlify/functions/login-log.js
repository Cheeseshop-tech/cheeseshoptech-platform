// Netlify Function: read the login-attempt audit log (see _login-log.js). House admin only —
// same access tier and shape as write-log.js, just a different Blobs store.
import { connectLambda, getStore } from "@netlify/blobs";
import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = requireWriteAuth(event);
  if (!auth.ok) return jsonUnauthorized(auth);
  if (auth.role !== "admin") return json(403, { error: "House admin only" });

  try {
    connectLambda(event);
    const store = getStore("login-log");
    const raw = await store.get("log");
    const log = raw ? JSON.parse(raw) : [];
    log.reverse(); // newest first
    return json(200, { ok: true, count: log.length, entries: log });
  } catch (err) {
    return json(500, { error: "Blobs read failed", detail: String((err && err.message) || err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}
