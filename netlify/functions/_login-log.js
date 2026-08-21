// Login-attempt log — mirrors _write-log.js's audit-trail pattern (Trust-by-design review,
// 2026-07-07). Until 2026-07-18 the login step recorded nothing at all — no IP, no timestamp,
// not even success vs failure — while everything AFTER login (writes) has been logged since
// 2026-07-06. This closes that gap.
//
// Same Netlify Blobs pattern, same "never block or fail the request it's describing" contract,
// but its OWN store — login volume (every portal open) is a different shape than write volume
// (occasional edits), so it gets its own rolling window rather than crowding write-log's.
//
// TWO call sites write here, so entries have two shapes (2026-08-21, Rick: "show names of who
// is logging in"):
//   - gate.js (legacy passcode gate, VITE_AUTH_MODE=passcode): { ok, role, tenant } — a shared
//     secret has no individual identity behind it, so these rows never carry a name/email.
//   - record-login.js (real Netlify Identity, the live mode since 2026-08-17): adds
//     { source: "identity", email, name, roles }, verified server-side from the Identity JWT —
//     never client-supplied, so it can't be spoofed. This is the source that actually answers
//     "who logged in" and the reason record-login.js exists.
// Readers (login-log.js, the Access log UI) must treat name/email/source as OPTIONAL and fall
// back gracefully — most history predates this and plenty of rows will always be passcode-era.
import { connectLambda, getStore } from "@netlify/blobs";
import { callerIp } from "./_write-log.js";

const STORE = "login-log";
const KEY = "log";
const MAX_ENTRIES = 500; // rolling window — bounded size, enough history for one operator
const GEO_TIMEOUT_MS = 2500;

// Best-effort city/state lookup (2026-07-18, Rick asked "can we see city or state"). Netlify's
// OWN geo data (context.geo) only exists on the newer Functions API — this codebase's handlers
// are all the classic Lambda-style `export const handler = async (event) => {}`, so migrating
// just this one function's runtime style for one field would make it the odd one out. Cheaper
// and lower-risk: ipwho.is (free, no API key, HTTPS, 1,000 lookups/day — plenty at pilot volume).
// Skipped for missing/private/local IPs; NEVER allowed to slow down or break the login it's
// describing beyond a short timeout — same "logging never breaks the real thing" contract as
// the rest of this module.
async function geoLookup(ip) {
  if (!ip || /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost)/.test(ip)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.success) return null;
    return { city: data.city || null, region: data.region || null };
  } catch {
    return null;
  }
}

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
    const ip = callerIp(event);
    const geo = await geoLookup(ip);
    log.push({ ts: new Date().toISOString(), ip, city: geo?.city || null, region: geo?.region || null, ...entry });
    while (log.length > MAX_ENTRIES) log.shift(); // drop oldest
    await store.set(KEY, JSON.stringify(log));
  } catch {
    // Never let logging break an actual login.
  }
}
