// Netlify Function: the PRICE LIST OF RECORD per tenant — the FOB base costs the whole quoting
// engine derives from, plus who changed them, when, and under which published effective window.
//
// Why this exists (Rick, 2026-08-21): catalog.json's cost.fob values came in from a spreadsheet
// sync and could only be changed by regenerating and redeploying the bundle. Rick wants the tool
// itself to BE the pricing truth — edit a price, save, publish it with an effective date and a
// valid-until date, and keep a permanent record of every change. This is the store behind that.
//
// TWO-STAGE ON PURPOSE (Rick's call). A draft is private and quotable by nobody; publishing is a
// separate, deliberate act that stamps the effective window and bumps the version. Prices feed
// buyer-facing quotes that print without a second look, so a stray keystroke must not be able to
// reach a customer.
//
//   GET  ?tenant=X                                   -> { published, draft, log }
//   POST { tenant, action:"save-draft", prices, note }  -> writes the draft, logs each change
//   POST { tenant, action:"publish", effectiveDate, validUntil, note } -> promotes draft -> live
//   POST { tenant, action:"discard-draft" }             -> throws the draft away, logged
//
// Blobs store "prices", three keys per tenant:
//   <tenant>          the live published price list (what every surface quotes from)
//   <tenant>--draft   the working copy
//   <tenant>--log     append-only audit trail, newest last
//
// AUTH: reads are any signed-in tier (reps must see prices); WRITES ARE ADMIN / CLIENT-ADMIN ONLY
// via requireWriteAuth — a base rep can quote a price but must never be able to change one.
// The "who" is read from the verified Identity session server-side, NEVER from the request body:
// an audit trail a caller can forge is not an audit trail.
import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";
import { withMonitoring } from "./_sentry.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-portal-passcode",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});

const cleanTenant = (t) => String(t || "").replace(/[^a-z0-9-]/gi, "");
const str = (v, n) => String(v == null ? "" : v).slice(0, n);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

const MAX_SKUS = 2000;     // a tenant catalog is ~110; this is a runaway guard, not a limit
const MAX_LOG = 4000;      // rolling audit window
// Fat-finger guard on the single most dangerous number in the system. A price outside this range
// is a typo, not a price — reject the whole save rather than quietly store it.
const MIN_PRICE = 0.01;
const MAX_PRICE = 100000;

/** Who is making this change, per the VERIFIED Identity session. Never trust the body. */
function actorOf(context, fallbackRole) {
  const u = context?.clientContext?.user || null;
  return str(u?.email || u?.user_metadata?.full_name || `(${fallbackRole || "unknown"} — no Identity session)`, 120);
}

/** The attached source document (the HQ price sheet these numbers came from). Provenance only —
 *  it is never parsed, so a bad read can't move a price. Stored on the draft and carried onto the
 *  published version so a published list can always be traced back to its paperwork. */
function sanitizeSourceDoc(d) {
  if (!d || typeof d !== "object") return null;
  const url = str(d.url, 500);
  if (url && !/^https:\/\//i.test(url)) return null; // never store a non-https reference
  return {
    name: str(d.name, 200),
    url,
    publicId: str(d.publicId, 300),
    format: str(d.format, 12),
    bytes: Number.isFinite(Number(d.bytes)) ? Number(d.bytes) : null,
    uploadedAt: str(d.uploadedAt, 30),
    uploadedBy: str(d.uploadedBy, 120),
  };
}

/** Normalise + validate the submitted price map. Returns {prices, errors}. */
function sanitizePrices(raw) {
  const errors = [];
  const prices = {};
  if (!raw || typeof raw !== "object") return { prices, errors: ["prices must be an object"] };
  const codes = Object.keys(raw).slice(0, MAX_SKUS);
  for (const code of codes) {
    const key = str(code, 20);
    const v = raw[code] || {};
    const out = {};
    for (const field of ["fob", "fobCase"]) {
      if (v[field] === undefined || v[field] === null || v[field] === "") continue;
      const n = Number(v[field]);
      if (!Number.isFinite(n)) { errors.push(`${key}.${field} is not a number`); continue; }
      if (n < MIN_PRICE || n > MAX_PRICE) { errors.push(`${key}.${field} = ${n} is outside ${MIN_PRICE}–${MAX_PRICE}`); continue; }
      out[field] = Math.round(n * 100) / 100;
    }
    if (Object.keys(out).length) prices[key] = out;
  }
  return { prices, errors };
}

const readJson = async (store, key, fallback) => {
  const raw = await store.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
};

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  let body = {};
  if (event.httpMethod === "POST") {
    try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }
  }
  const tenant = cleanTenant(event.queryStringParameters?.tenant || body.tenant);

  // Reads: any signed-in tier. Writes: admin / client-admin only.
  const auth = event.httpMethod === "POST"
    ? requireWriteAuth(event, tenant, context)
    : requireReadAuth(event, tenant, context);
  if (!auth.ok) {
    if (event.httpMethod === "POST") await logWrite(event, { fn: "prices", ok: false, status: auth.status });
    return jsonUnauthorized(auth);
  }
  if (!tenant) return json(400, { error: "Missing tenant" });

  try {
    connectLambda(event);
    const store = getStore("prices");
    const K = { pub: tenant, draft: `${tenant}--draft`, log: `${tenant}--log` };

    if (event.httpMethod === "GET") {
      const [published, draft, log] = await Promise.all([
        readJson(store, K.pub, null),
        readJson(store, K.draft, null),
        readJson(store, K.log, []),
      ]);
      // Newest first for display; the stored array stays append-ordered.
      return json(200, { published, draft, log: log.slice(-500).reverse() });
    }

    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    const at = new Date().toISOString();
    const by = actorOf(context, auth.role);
    const log = await readJson(store, K.log, []);
    const appendLog = (entries) => {
      const merged = log.concat(entries).slice(-MAX_LOG);
      return store.set(K.log, JSON.stringify(merged));
    };
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    /* ---- save draft ---- */
    if (body.action === "save-draft") {
      const { prices, errors } = sanitizePrices(body.prices);
      if (errors.length) return json(400, { error: "Rejected — price values out of range", detail: errors.slice(0, 20) });

      const published = await readJson(store, K.pub, null);
      const prevDraft = await readJson(store, K.draft, null);
      // `from` comes from OUR OWN stored state, never the caller. null means there was no prior
      // override at all — the value in play was the bundled catalog's, which this store can't see.
      const priorOf = (code, field) =>
        prevDraft?.prices?.[code]?.[field] ?? published?.prices?.[code]?.[field] ?? null;

      const changes = [];
      for (const code of Object.keys(prices)) {
        for (const field of Object.keys(prices[code])) {
          const to = prices[code][field];
          const from = priorOf(code, field);
          if (from === to) continue;
          changes.push({ id: newId(), at, by, action: "draft", skuCode: code, field, from, to });
        }
      }

      // A newly attached document wins; otherwise keep whatever the draft already carried.
      const incomingDoc = sanitizeSourceDoc(body.sourceDoc);
      const sourceDoc = incomingDoc
        ? { ...incomingDoc, uploadedAt: incomingDoc.uploadedAt || at, uploadedBy: by }
        : (prevDraft?.sourceDoc || null);
      await store.set(K.draft, JSON.stringify({
        updatedAt: at, updatedBy: by, note: str(body.note, 300), prices, sourceDoc,
      }));
      if (incomingDoc) changes.push({ id: newId(), at, by, action: "attach-source", note: incomingDoc.name });
      if (changes.length) await appendLog(changes);
      await logWrite(event, {
        fn: "prices", ok: true, role: auth.role, tenant,
        action: `save price draft — ${changes.length} change(s) by ${by}`,
      });
      return json(200, { ok: true, saved: Object.keys(prices).length, changed: changes.length });
    }

    /* ---- publish ---- */
    if (body.action === "publish") {
      const draft = await readJson(store, K.draft, null);
      if (!draft || !draft.prices || !Object.keys(draft.prices).length) {
        return json(400, { error: "Nothing to publish — save a draft first" });
      }
      if (!isDate(body.effectiveDate)) return json(400, { error: "effectiveDate required (YYYY-MM-DD)" });
      if (body.validUntil && !isDate(body.validUntil)) return json(400, { error: "validUntil must be YYYY-MM-DD" });
      if (body.validUntil && body.validUntil < body.effectiveDate) {
        return json(400, { error: "validUntil cannot be before effectiveDate" });
      }

      const published = await readJson(store, K.pub, null);
      const version = (published?.version || 0) + 1;
      const doc = {
        version,
        publishedAt: at,
        publishedBy: by,
        effectiveDate: body.effectiveDate,
        validUntil: body.validUntil || "",
        note: str(body.note ?? draft.note, 300),
        prices: draft.prices,
        // The paperwork travels with the published list, not just the draft.
        sourceDoc: draft.sourceDoc || null,
      };
      await store.set(K.pub, JSON.stringify(doc));
      await store.delete(K.draft).catch(() => { /* draft already gone is fine */ });
      await appendLog([{
        id: newId(), at, by, action: "publish", version,
        effectiveDate: doc.effectiveDate, validUntil: doc.validUntil,
        count: Object.keys(doc.prices).length, note: doc.note,
        sourceDoc: doc.sourceDoc ? doc.sourceDoc.name : "",
      }]);
      await logWrite(event, {
        fn: "prices", ok: true, role: auth.role, tenant,
        action: `PUBLISH price list v${version} eff ${doc.effectiveDate} — ${Object.keys(doc.prices).length} SKU(s) by ${by}`,
      });
      return json(200, { ok: true, published: doc });
    }

    /* ---- discard draft ---- */
    if (body.action === "discard-draft") {
      await store.delete(K.draft).catch(() => {});
      await appendLog([{ id: newId(), at, by, action: "discard-draft" }]);
      await logWrite(event, { fn: "prices", ok: true, role: auth.role, tenant, action: `discard price draft by ${by}` });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    return json(500, { error: "prices store error", detail: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("prices", rawHandler);
