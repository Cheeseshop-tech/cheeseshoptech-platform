// Netlify Function: per-tenant SALES REP CALL capture — the rep-qualification half of a
// combined territory-outreach + rep-qualification campaign (Rick, 2026-09-01: "combine the
// territory outreach and the rep qualification and add the call console to the reps and
// prospects"). A phone pass through the distributor's OWN sales reps, not target-prospect
// accounts: the ask on each call is "what's your territory", and the outcome records what they
// said, not a missing buyer/email like campaign-enrichment.js.
//
// Distinct store from campaign-enrichment.js on purpose — same reasoning that file gives for
// being distinct from crm-outreach.js: different facts, different key space. Rep contacts here
// are seeded in code (lib/campaigns.js audience.salesReps), not live HubSpot company records, so
// they have no numeric HubSpot id to key on — this store keys by the rep's email instead.
//
// GET  ?tenant=<id>          → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }   → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [repEmailLowercased]: { outcome, territory, note, calledAt } }

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";
const MAX_BYTES = 400_000;
// Same vocabulary as campaign-enrichment.js's OUTCOMES — "not-a-prospect" reused to mean
// "confirmed this contact isn't actually a field rep" (the sales rep list is seeded from every
// HubSpot contact under the distributor, admin/back-office titles included; a call is often the
// only way to find out which).
const OUTCOMES = ["not-called", "cleared", "left-message", "no-answer", "callback", "bad-number", "do-not-contact", "not-a-prospect"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant, context);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("campaign-rep-calls").get(tenant);
      if (!raw) return json(200, { entries: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: rec.entries || {}, updatedAt: rec.updatedAt || null });
    } catch (err) {
      return json(200, { entries: {}, updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "campaign-rep-calls", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }

  const clean = {};
  for (const [email, e] of Object.entries(entries)) {
    const key = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(key) || !e || typeof e !== "object") continue;
    const outcome = OUTCOMES.includes(e.outcome) ? e.outcome : "";
    const territory = str(e.territory, 200);
    const note = str(e.note, 1000);
    if (!outcome && !territory && !note) continue; // nothing captured = nothing stored
    clean[key] = {
      ...(outcome && outcome !== "not-called" ? { outcome } : {}),
      ...(territory ? { territory } : {}),
      ...(note ? { note } : {}),
      calledAt: str(e.calledAt, 40) || new Date().toISOString(),
    };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Rep-call document too large" });

  try {
    connectLambda(event);
    await getStore("campaign-rep-calls").set(tenant, payload);
    await logWrite(event, { fn: "campaign-rep-calls", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("campaign-rep-calls", rawHandler);
