// Netlify Function: read the write-action audit log (docs/TRUST_BY_DESIGN_REVIEW_2026-07-07.md).
// House admin only — this is CST's cross-tenant audit trail, not a per-tenant client feature.
// Written by _write-log.js (logWrite) from media-update.js / media-delete.js / items-save.js.
import { connectLambda, getStore } from "@netlify/blobs";
import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";

import { withMonitoring } from "./_sentry.js";
const rawHandler = async (event, context) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = requireWriteAuth(event, "", context);
  if (!auth.ok) return jsonUnauthorized(auth);
  if (auth.role !== "admin") return json(403, { error: "House admin only" });

  try {
    connectLambda(event);
    const store = getStore("write-log");
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

export const handler = withMonitoring("write-log", rawHandler);
