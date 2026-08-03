// Netlify Function: per-tenant CONTACT ENRICHMENT capture — what a phone pass actually produces
// (Rick, 2026-08-03 feedback: "how will we track phone call notes and fill in the enrichment so
// that it uploads to HubSpot?").
//
// WHY THIS IS A STORE AND NOT A HUBSPOT WRITE. The HubSpot private app is READ-ONLY by design:
// crm-hubspot.js declares crm.objects.companies.read / crm.objects.contacts.read / sales-email-read
// and every call it makes is a POST to HubSpot's /search endpoint, which is a read. There is no
// write scope anywhere in this codebase. So a call outcome CANNOT go straight back to HubSpot
// today. It lands here, and leaves as a HubSpot-import-shaped CSV (see enrichmentCsv() in
// src/lib/campaigns.js). Turning that into a live write needs `crm.objects.contacts.write` on the
// private app plus a push function — a deliberate decision, not something to switch on quietly.
//
// Distinct from crm-outreach.js on purpose: that store is the OUTREACH PIPELINE overlay
// ({status, note} per company, and its sanitizer drops anything else). Enrichment captures
// different facts — the buyer name and email that were MISSING, plus the call outcome — so it
// gets its own shape rather than bending the outreach schema around a second job.
//
// GET  ?tenant=<id>          → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }   → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [companyId]: { buyer, title, email, phone, outcome, note, calledAt, campaignId } }

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

const MAX_BYTES = 600_000;
// The outcome of one call attempt. "cleared" is the one that counts as the gap being closed.
const OUTCOMES = ["not-called", "cleared", "left-message", "no-answer", "callback", "bad-number", "do-not-contact"];
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

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

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("campaign-enrichment").get(tenant);
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

  const writeAuth = requireWriteAuth(event, tenant);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "campaign-enrichment", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }

  const clean = {};
  for (const [companyId, e] of Object.entries(entries)) {
    // HubSpot company record ids are numeric; keep the check as loose as crm-outreach.js's.
    if (!/^[0-9]+$/.test(companyId) || !e || typeof e !== "object") continue;
    const outcome = OUTCOMES.includes(e.outcome) ? e.outcome : "";
    const rec = {
      buyer: str(e.buyer, 120),
      title: str(e.title, 120),
      email: str(e.email, 160),
      phone: str(e.phone, 40),
      note: str(e.note, 1000),
      ...(outcome && outcome !== "not-called" ? { outcome } : {}),
      ...(ID_RE.test(e.campaignId || "") ? { campaignId: e.campaignId } : {}),
    };
    // Nothing captured = nothing stored, so an accidental focus/blur never writes a row.
    if (!rec.buyer && !rec.email && !rec.note && !rec.outcome && !rec.phone && !rec.title) continue;
    clean[companyId] = { ...rec, calledAt: str(e.calledAt, 40) || new Date().toISOString() };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Enrichment document too large" });

  try {
    connectLambda(event);
    await getStore("campaign-enrichment").set(tenant, payload);
    await logWrite(event, { fn: "campaign-enrichment", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};
