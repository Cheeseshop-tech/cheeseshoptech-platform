// Netlify Function: per-tenant CRM outreach state (pipeline status + notes per company).
// The server-side replacement for the campaign-CRM artifact's localStorage (Prospecting
// Phase 10): status/notes must survive the browser and be shared across the team, but they
// CANNOT live in HubSpot — the private app is deliberately read-only (crm-hubspot.js scope
// note). So they live in Netlify Blobs, keyed by tenant — same pattern as inventory.js.
//
// GET  ?tenant=<id>                 → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }          → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [companyId]: { status, note, rep, temperature, nextStepMode, updatedAt } } —
//   the FULL document each save (last-writer-wins; fine at this team size, same trade-off as
//   items-save.js).
//   `rep` (2026-09-01): free-text "who covers this account", platform-native — not a HubSpot
//   property, no rep entity elsewhere in the app. Booth's territory drill-down is the primary
//   writer (see booth-tool.jsx); the CRM console can edit it too, same field either way.
//   `temperature`/`nextStepMode` (2026-09-19, roadmap item 7 Step A0): booth.js already computes
//   both per capture (TEMPERATURES, NEXT_STEP_MODES) but they used to die in the capturing
//   device's localStorage — invisible to every other device/session. booth-tool.jsx's
//   saveSheet() now mirrors them here, the same overlay `rep` already rides, so
//   src/lib/readiness.js can compute a cross-device readiness score for the Opportunity Engine
//   instead of the capture's temperature being stuck on whichever phone shot the card.
//
// HubSpot stays the CRM of record for accounts/contacts; this store is the thin outreach
// overlay the platform owns. No per-client code — tenant is data.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";
const MAX_BYTES = 400_000; // plenty for thousands of {status,note} rows; guards runaway payloads
const STAGES = ["New", "Emailed", "Replied", "Meeting", "Won", "Lost", "Not a fit"];
// Mirrors booth.js's TEMPERATURES / NEXT_STEP_MODES — duplicated, not imported: this function
// bundles separately from src/lib, same reason STAGES above is a local copy of crm.js's
// OUTREACH_STAGES rather than an import.
const TEMPERATURES = ["hot", "warm", "cold"];
const NEXT_STEP_MODES = ["time", "window", "request"];

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

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant, context);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("crm-outreach").get(tenant);
      if (!raw) return json(200, { entries: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: rec.entries || {}, updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Blobs unprovisioned/transient: degrade to empty — the console still renders read-only.
      return json(200, { entries: {}, updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  // Writes are house/client-admin only — same tiers as every other write endpoint.
  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "crm-outreach", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }
  // Sanitize: keep only known fields, valid stages, bounded note/rep length.
  // `rep` (HANDOFF_2026-09-01_ace-fall-show-booth-integration.md, prompt b) is a free-text,
  // platform-native "who covers this account" field — deliberately NOT a HubSpot property (no
  // tool access to create one there). Same trust model as `note`: bounded length, no format
  // enforced, last-writer-wins.
  const clean = {};
  for (const [id, e] of Object.entries(entries)) {
    if (!/^[0-9]+$/.test(id) || !e || typeof e !== "object") continue;
    const status = STAGES.includes(e.status) ? e.status : null;
    const note = typeof e.note === "string" ? e.note.slice(0, 500) : "";
    const rep = typeof e.rep === "string" ? e.rep.slice(0, 80) : "";
    const temperature = TEMPERATURES.includes(e.temperature) ? e.temperature : null;
    const nextStepMode = NEXT_STEP_MODES.includes(e.nextStepMode) ? e.nextStepMode : null;
    if (!status && !note && !rep && !temperature && !nextStepMode) continue; // nothing worth storing
    clean[id] = {
      ...(status ? { status } : {}), ...(note ? { note } : {}), ...(rep ? { rep } : {}),
      ...(temperature ? { temperature } : {}), ...(nextStepMode ? { nextStepMode } : {}),
      updatedAt: e.updatedAt || new Date().toISOString(),
    };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Outreach document too large" });

  try {
    connectLambda(event);
    await getStore("crm-outreach").set(tenant, payload);
    await logWrite(event, { fn: "crm-outreach", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("crm-outreach", rawHandler);
