// Netlify Function: per-tenant CAMPAIGN CONTENT — the authored pieces a campaign sends, with an
// approval state on each one (Rick, 2026-08-03 feedback: "where will we upload or how will
// proposed content, email copy, phone campaign scripts and approvals be handled?").
//
// The answer this implements: TEXT pieces are authored and approved HERE, in the platform, so the
// approved working copy is one click from the campaign that uses it. BINARY assets (one-sheets,
// PDFs, packshots) stay in the Media Hub / Cloudinary — this store never holds a file, only text
// plus an optional link out to wherever the file already lives.
//
// `approvalState` deliberately reuses the Media Hub's vocabulary (src/lib/media.js) rather than
// inventing a second approval language: draft → in-review → approved. Only `approved` pieces
// surface as the working script on the enrichment console.
//
// This is a SEPARATE store from campaign-state on purpose: state is a small hot document written
// on every checkbox tick, content is a large cold one written when someone edits copy. Mixing
// them would push a few KB of ticks through a megabyte of email copy on every click.
//
// GET  ?tenant=<id>              → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }       → { ok, updatedAt }        (house/client-admin passcode)
//   entries = { [campaignId]: { items: [ {id, kind, title, body, url, approvalState, …} ] } }

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

const MAX_BYTES = 1_500_000;   // email copy + call scripts across a tenant's campaigns
const MAX_BODY = 20_000;       // one piece of copy; longer than this belongs in a doc, not here
const MAX_ITEMS = 30;          // per campaign
const KINDS = ["email", "script", "doc", "blog", "social", "other"];
const APPROVAL = ["draft", "in-review", "approved"];
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
const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("campaign-content").get(tenant);
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
    await logWrite(event, { fn: "campaign-content", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return json(400, { error: "Missing/invalid entries" });
  }

  const clean = {};
  for (const [campaignId, e] of Object.entries(entries)) {
    if (!ID_RE.test(campaignId) || !e || typeof e !== "object") continue;
    const items = (Array.isArray(e.items) ? e.items : []).slice(0, MAX_ITEMS)
      .filter((it) => it && typeof it === "object" && ID_RE.test(it.id || ""))
      .map((it) => {
        const approvalState = APPROVAL.includes(it.approvalState) ? it.approvalState : "draft";
        return {
          id: it.id,
          kind: KINDS.includes(it.kind) ? it.kind : "other",
          title: str(it.title, 160) || "Untitled",
          body: str(it.body, MAX_BODY),
          url: str(it.url, 500),
          approvalState,
          // Approval provenance only means anything once approved — cleared on any step back,
          // so a piece can never show a stale "approved by" after being sent back to draft.
          ...(approvalState === "approved"
            ? { approvedBy: str(it.approvedBy, 80), approvedAt: str(it.approvedAt, 40) || new Date().toISOString() }
            : {}),
          updatedAt: str(it.updatedAt, 40) || new Date().toISOString(),
        };
      });
    if (items.length) clean[campaignId] = { items };
  }

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Campaign content document too large" });

  try {
    connectLambda(event);
    await getStore("campaign-content").set(tenant, payload);
    await logWrite(event, { fn: "campaign-content", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};
