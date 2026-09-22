// Netlify Function: durable, shared, cross-device CAPTURE history for Booth-to-Meeting
// (HANDOFF_2026-09-16_booth-history-spec.md v1 + v2). Clone of history.js's pattern (Blobs store,
// dedup-by-id, capped, self-logging) applied to booth captures instead of movement records.
//
// Why this exists: booth captures lived ONLY in localStorage on whatever device took them — Rick
// couldn't see booth activity from a different device, and a Discard tap was instant/permanent
// with no recovery. This is the safety net/reference log; it does NOT replace HubSpot as the CRM
// of record (that's still the deliberate, rep-triggered Sync via crm-push.js).
//
//   GET  /.netlify/functions/booth-history?tenant=<id>
//        -> { records: [...] }                              (any valid auth tier, incl. passcode)
//   POST /.netlify/functions/booth-history { tenant, records:[...] }
//        -> append/create, deduped by id                     (REQUIRES a real Identity JWT — v2)
//   POST /.netlify/functions/booth-history { tenant, id, patch, action: "update" }
//        -> edit an existing record, appends to editedBy      (REQUIRES a real Identity JWT — v2)
//
// v2 (2026-09-16, Rick): individual rep attribution + edit rights, layered on v1's log. A capture
// row now carries WHO captured it and WHO has touched it since, and that provenance can only ever
// come from a server-verified identity — never from anything the client claims in the request
// body.
//
// v3 (2026-09-22, Rick — architecture review): v2's "Identity JWT only, no passcode fallback" was
// unreachable in practice. The live pilot runs the WHOLE portal behind PasscodeGate exclusively
// (VITE_AUTH_MODE=passcode, src/App.jsx:42) — RequireAuth/LoginScreen, the only UI that could ever
// produce a real Identity JWT, is never rendered in production. So no capture, on any device, from
// any rep, could ever satisfy v2's requirement — this is what actually caused the 9/15 Ace Endico
// capture (and everything since) to silently vanish from History while still reaching HubSpot via
// crm-push.js, which accepts passcode auth. (A handful of earlier records DID carry a real
// capturedBy — an out-of-band Identity session, not something reachable through the deployed app.)
// Now accepts the SAME admin/client-admin passcode tiers requireWriteAuth() grants everywhere
// else in this app (campaign-state.js, crm-push.js) — write access stays privileged-tier only, it
// just stops requiring a login screen that doesn't exist here. A real Identity session, when one
// IS present, still wins and still attributes to that actual person; passcode-tier writes get an
// honest synthetic identity (mirrors passcodeUser() in auth-context.jsx) rather than a fabricated
// name, and are restricted to privileged roles for edits (see isPrivileged below) since there's no
// individual to check "did YOU capture this" against.
import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";
import { withMonitoring } from "./_sentry.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode, Authorization",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});
const cleanTenant = (t) => String(t || "").replace(/[^a-z0-9-]/gi, "");
const MAX_BATCH = 200;   // captures per POST — a full show's worth of cards, generous headroom
const MAX_STORED = 5000; // rolling cap per tenant, same as history.js

// Mirrors _write-guard.js's identityRole()/record-login.js's role derivation — duplicated locally
// (not imported) for the same reason record-login.js gives: this wants the FULL role list plus a
// display name, not just the write-tier admin/client-admin verdict _write-guard.js returns.
const ADMIN_ROLES = ["owner", "admin"];
function identityRole(user) {
  const roles = user?.app_metadata?.roles || [];
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return "admin";
  if (roles.includes("client-admin")) return "client-admin";
  if (roles.includes("client")) return "client";
  return roles[0] || null;
}
function identityOf(user) {
  return {
    email: (user?.email || "").toLowerCase(),
    name: user?.user_metadata?.full_name || user?.email || "Unknown",
    role: identityRole(user),
  };
}

// Passcode-tier "who" — same shape as identityOf() above, but honest about not being a real
// person: no email a client could later be checked against, a role-based label instead of a name
// (mirrors passcodeUser() in src/lib/auth-context.jsx exactly, so "who wrote this" reads the same
// way everywhere in the app). `email: ""` is deliberate — sanitizeNew()/the edit ownership check
// below both treat an empty capturedBy.email as "no individual owner," which is correct: nobody
// signed in personally, so nobody personally owns it.
function passcodeWho(role) {
  return {
    email: "",
    name: role === "admin" ? "CST Admin" : role === "client-admin" ? "Portal Admin" : "Portal",
    role,
  };
}

function sanitizeProduct(p) {
  if (!p || typeof p !== "object") return null;
  const name = String(p.name || "").slice(0, 120);
  if (!name) return null;
  return { name, spec: String(p.spec || "").slice(0, 200) };
}

// Fields a CREATE may set. `capturedBy` is deliberately absent here — it is stamped server-side
// from the verified Identity user below, never taken from the client (spec: "ignoring anything
// the client sends for that field").
function sanitizeNew(r, capturedBy) {
  if (!r || typeof r !== "object") return null;
  const id = String(r.id || "").slice(0, 60);
  if (!id) return null;
  return {
    id,
    capturedAt: String(r.capturedAt || new Date().toISOString()).slice(0, 30),
    name: String(r.name || "").slice(0, 120),
    company: String(r.company || "").slice(0, 160),
    email: String(r.email || "").slice(0, 160),
    phone: String(r.phone || "").slice(0, 60),
    contactRole: String(r.contactRole || "").slice(0, 60),
    temperature: ["hot", "warm", "cold"].includes(r.temperature) ? r.temperature : "cold",
    nextStepMode: ["time", "window", "request", ""].includes(r.nextStepMode) ? r.nextStepMode : "",
    // notes (2026-09-22 fix): omitted here from day one, so every capture that ever auto-synced
    // landed in History with blank notes no matter what the rep typed — notes only ever attached
    // via a later manual Edit. Same 2000-char cap sanitizePatch() already applies below.
    notes: String(r.notes || "").slice(0, 2000),
    products: Array.isArray(r.products) ? r.products.slice(0, 20).map(sanitizeProduct).filter(Boolean) : [],
    scopeId: r.scopeId ? String(r.scopeId).slice(0, 80) : null,
    pushedAt: r.pushedAt ? String(r.pushedAt).slice(0, 30) : null,
    capturedBy,
    editedBy: [],
  };
}

// Fields an EDIT may touch (spec: "small form — name/company/phone/email/next step/notes").
// Whitelisted rather than a raw merge so an edit call can never smuggle in capturedBy/editedBy/id.
const EDITABLE_FIELDS = ["name", "company", "phone", "email", "nextStepMode", "notes"];
function sanitizePatch(patch) {
  const out = {};
  if (!patch || typeof patch !== "object") return out;
  for (const key of EDITABLE_FIELDS) {
    if (!(key in patch)) continue;
    if (key === "nextStepMode") {
      out[key] = ["time", "window", "request", ""].includes(patch[key]) ? patch[key] : "";
    } else if (key === "notes") {
      out[key] = String(patch[key] || "").slice(0, 2000);
    } else {
      out[key] = String(patch[key] || "").slice(0, 160);
    }
  }
  return out;
}

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const tenant = cleanTenant(
    event.queryStringParameters?.tenant ||
      (() => { try { return JSON.parse(event.body || "{}").tenant; } catch { return ""; } })()
  );
  if (!tenant) return json(400, { error: "Missing tenant" });

  // GET stays on the same any-valid-tier read model as history.js/crm-summary/etc. — this is a
  // team's own capture log, not a HubSpot write, so it doesn't need the stricter identity check
  // that create/edit require below.
  const readAuth = requireReadAuth(event, tenant, context);
  if (!readAuth.ok) return jsonUnauthorized(readAuth);

  try {
    connectLambda(event);
    const store = getStore("booth-history");

    if (event.httpMethod === "GET") {
      const raw = await store.get(tenant);
      return json(200, { records: raw ? JSON.parse(raw) : [] });
    }

    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

    // Create/edit need privileged write access — same admin/client-admin gate as every other
    // write endpoint in this app (v3, 2026-09-22; see the header comment for why the old
    // Identity-only requirement was unreachable in production). A real Identity session, when
    // present, still wins and attributes to that actual signed-in person; a passcode-tier caller
    // gets an honest synthetic "who" instead (passcodeWho() above) rather than fabricating a name.
    const identityUser = context?.clientContext?.user || null;
    let who;
    if (identityUser) {
      who = identityOf(identityUser);
    } else {
      const auth = requireWriteAuth(event, tenant, context);
      if (!auth.ok) {
        await logWrite(event, { fn: "booth-history", ok: false, status: auth.status, tenant, action: body.action || "create" });
        return jsonUnauthorized(auth);
      }
      who = passcodeWho(auth.role);
    }

    // ---- Edit -----------------------------------------------------------------------------
    if (body.action === "update") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "Missing id" });
      const raw = await store.get(tenant);
      const existing = raw ? JSON.parse(raw) : [];
      const idx = existing.findIndex((r) => r.id === id);
      if (idx === -1) return json(404, { error: "Record not found" });

      const record = existing[idx];
      const isOwner = (record.capturedBy?.email || "").toLowerCase() === who.email;
      const isPrivileged = who.role === "admin" || who.role === "client-admin";
      if (!isOwner && !isPrivileged) {
        await logWrite(event, { fn: "booth-history", ok: false, status: 403, tenant, action: "update", id });
        return json(403, { error: "You can only edit records you captured" });
      }

      const patch = sanitizePatch(body.patch);
      const editedBy = [...(record.editedBy || []), { email: who.email, name: who.name, at: new Date().toISOString() }];
      const updated = { ...record, ...patch, editedBy };
      existing[idx] = updated;
      await store.set(tenant, JSON.stringify(existing));
      await logWrite(event, { fn: "booth-history", ok: true, role: who.role, tenant, action: `edit ${id}` });
      return json(200, { ok: true, record: updated });
    }

    // ---- Create (append) -------------------------------------------------------------------
    const incoming = Array.isArray(body.records)
      ? body.records.slice(0, MAX_BATCH).map((r) => sanitizeNew(r, who)).filter(Boolean)
      : [];
    if (!incoming.length) return json(400, { error: "No valid records" });

    const raw = await store.get(tenant);
    const existing = raw ? JSON.parse(raw) : [];
    const seen = new Set(existing.map((r) => r.id));
    const merged = existing.concat(incoming.filter((r) => !seen.has(r.id))).slice(-MAX_STORED);
    await store.set(tenant, JSON.stringify(merged));
    await logWrite(event, {
      fn: "booth-history", ok: true, role: who.role,
      action: `log ${incoming.length} capture(s)`, tenant,
    });
    return json(200, { ok: true, added: incoming.length, total: merged.length });
  } catch (err) {
    return json(500, { error: "booth-history store error", detail: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("booth-history", rawHandler);
