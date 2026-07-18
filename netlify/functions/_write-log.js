// Shared write-action log — minimal audit trail for the write endpoints guarded by
// _write-guard.js. Closes the "visibility" gap flagged in
// docs/TRUST_BY_DESIGN_REVIEW_2026-07-07.md: write auth existed (2026-07-06, _write-guard.js)
// but nothing recorded WHO did WHAT, WHEN — only the UI hid buttons; a direct curl left no trace
// either way. This does the minimum useful thing: one rolling log, no dashboard yet.
//
// Storage: Netlify Blobs (same pattern as inventory.js / inventory-publish.js — no new infra,
// no new secret). A single capped array under one key; fine at solo-operator/one-tenant volume.
//
// Contract: logging must NEVER block or fail the write it's describing. Every failure inside
// this module is swallowed — visibility is best-effort, not a dependency of the write path.
import { connectLambda, getStore } from "@netlify/blobs";

const STORE = "write-log";
const KEY = "log";
const MAX_ENTRIES = 500; // rolling window — bounded size, enough history for one operator

export function callerIp(event) {
  const h = (event && event.headers) || {};
  const raw = h["x-nf-client-connection-ip"] || h["client-ip"] || h["x-forwarded-for"] || "";
  // 2026-07-18 fix: `x-forwarded-for` can be a comma-separated proxy chain
  // ("client-ip, proxy1-ip, proxy2-ip") — the CLIENT's own IP is always first. Passing the
  // whole raw string straight into a geo lookup (see _login-log.js geoLookup()) isn't a valid
  // single IP and fails outright (confirmed: ipwho.is returns a 404 for a multi-IP string) —
  // this is why the Access log's city/state column was showing blank for every entry.
  return raw.split(",")[0].trim();
}

/**
 * Append one entry to the write log. Fire-and-forget from the caller — never throws.
 * @param {object} event Netlify function event (for best-effort caller IP + Blobs context).
 * @param {object} entry { fn, ok, role, status, action, tenant? } — see call sites for shape.
 */
export async function logWrite(event, entry) {
  try {
    connectLambda(event);
    const store = getStore(STORE);
    const raw = await store.get(KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.push({ ts: new Date().toISOString(), ip: callerIp(event), ...entry });
    while (log.length > MAX_ENTRIES) log.shift(); // drop oldest
    await store.set(KEY, JSON.stringify(log));
  } catch {
    // Never let logging break the actual write.
  }
}

// Best-effort tenant guess from a Cloudinary publicId / folder path like "clients/montitrentini/...".
// Returns null (not "unknown") when the path doesn't match — callers decide how to display that.
export function tenantFromPath(path) {
  const m = /^clients\/([a-z0-9-]+)/i.exec((path || "").toString());
  return m ? m[1] : null;
}
