// Login-attempt log — mirrors _write-log.js's audit-trail pattern (Trust-by-design review,
// 2026-07-07) but for the passcode gate itself (netlify/functions/gate.js). Until 2026-07-18 the
// login step recorded nothing at all — no IP, no timestamp, not even success vs failure — while
// everything AFTER login (writes) has been logged since 2026-07-06. This closes that gap.
//
// Same Netlify Blobs pattern, same "never block or fail the request it's describing" contract,
// but its OWN store — login volume (every portal open) is a different shape than write volume
// (occasional edits), so it gets its own rolling window rather than crowding write-log's.
import { connectLambda, getStore } from "@netlify/blobs";
import { callerIp } from "./_write-log.js";

const STORE = "login-log";
const KEY = "log";
const MAX_ENTRIES = 500; // rolling window — bounded size, enough history for one operator

/**
 * Append one entry to the login-attempt log. Fire-and-forget from the caller — never throws.
 * @param {object} event Netlify function event (for best-effort caller IP + Blobs context).
 * @param {object} entry { ok, role, tenant } — see gate.js for shape.
 */
export async function logLogin(event, entry) {
  try {
    connectLambda(event);
    const store = getStore(STORE);
    const raw = await store.get(KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.push({ ts: new Date().toISOString(), ip: callerIp(event), ...entry });
    while (log.length > MAX_ENTRIES) log.shift(); // drop oldest
    await store.set(KEY, JSON.stringify(log));
  } catch {
    // Never let logging break an actual login.
  }
}
