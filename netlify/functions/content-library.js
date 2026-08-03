// Netlify Function: per-tenant CONTENT LIBRARY catalog — the organized catalog of finished work
// (CONTENT_ORCHESTRATION_SPEC §2: "one organized catalog of finished work… no fact or file has
// two homes").
//
// WHY THIS EXISTS (Rick, 2026-08-03: "let's connect it"). The catalog was `localStorage`, keyed
// `cs-presentations-<tenant>`. That meant a piece saved from Compose existed ONLY in the browser
// that saved it: invisible to the rest of the team, gone with a cache clear, and impossible to
// review — which breaks the spec's own flow, where CST reviews what a client submitted. It also
// can't be "the source for content approval" (Rick's stated intent) while it's browser-local.
// Same reasoning that put outreach state in Blobs instead of localStorage (crm-outreach.js).
//
// This store holds the CATALOG only — links, thumbnails and metadata. Physical files stay in
// Cloudinary behind the Media Hub (spec §1: the catalog never hauls heavy files around).
//
// GET  ?tenant=<id>            → { entries, updatedAt }   (any valid passcode tier)
// POST { tenant, entries }     → { ok, updatedAt }        (house/client-admin passcode)
//   entries = the FULL catalog array each save (last-writer-wins, same as crm-outreach.js).
//
// NOTE the write tier. The spec (§3/§4) makes CST the sole reviewer/publisher, but the catalog
// is WRITTEN by client-admins too (Compose submits land here as `submitted`). requireWriteAuth
// admits house + client-admin, which is exactly that split; the review ACTION — moving something
// to `posted` — stays gated in the UI on the admin role.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

const MAX_BYTES = 1_800_000; // catalog metadata + authored text; files still live in Cloudinary
const MAX_ENTRIES = 500;     // far above any per-tenant quota; a runaway guard, not the quota
const MAX_BODY = 20_000;     // one piece of authored copy (email body, call script)
// `call-script` joins the spec's §5 taxonomy (2026-08-03). Campaign copy and call scripts are
// finished, approved work like anything else here — folding them in is what lets the Library be
// the SINGLE approval vocabulary instead of campaigns keeping a parallel one.
const CATEGORIES = ["presentation", "slide-deck", "social-post", "email-campaign", "blog-post", "call-script"];
const STATUSES = ["submitted", "posted", "returned"];
const KINDS = ["link", "pdf", "deck", "text"];

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
      const raw = await getStore("content-library").get(tenant);
      if (!raw) return json(200, { entries: [], updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: Array.isArray(rec.entries) ? rec.entries : [], updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Blobs unprovisioned/transient: degrade to an empty catalog so the Library still renders
      // its config decks read-only rather than erroring. Same choice as crm-outreach.js.
      return json(200, { entries: [], updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const writeAuth = requireWriteAuth(event, tenant);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "content-library", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  if (!Array.isArray(body.entries)) return json(400, { error: "Missing/invalid entries" });

  const clean = body.entries.slice(0, MAX_ENTRIES)
    .filter((e) => e && typeof e === "object" && str(e.key, 80))
    .map((e) => ({
      key: str(e.key, 80),
      title: str(e.title, 200) || "Untitled",
      eyebrow: str(e.eyebrow, 120),
      description: str(e.description, 1000),
      cover: str(e.cover, 600),
      kind: KINDS.includes(e.kind) ? e.kind : "link",
      category: CATEGORIES.includes(e.category) ? e.category : "presentation",
      url: str(e.url, 1000),
      // Copy authored in the platform (kind "text"): email bodies, call scripts. Still metadata,
      // not a file — anything heavy remains a Cloudinary reference via `url`.
      ...(e.body ? { body: str(e.body, MAX_BODY) } : {}),
      // The campaign this piece was written for, when it was. Lets a campaign show its own
      // content without the catalog forking into a second per-campaign store.
      ...(/^[a-z0-9][a-z0-9-]{0,63}$/i.test(e.campaignId || "") ? { campaignId: e.campaignId } : {}),
      // Deck slides are Cloudinary URLs/public_ids — references, never file payloads.
      ...(Array.isArray(e.slides) ? { slides: e.slides.slice(0, 100).map((s) => str(s, 600)).filter(Boolean) } : {}),
      status: STATUSES.includes(e.status) ? e.status : "posted",
      reviewNote: str(e.reviewNote, 500),
      savedAt: str(e.savedAt, 40) || new Date().toISOString(),
    }));

  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ entries: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Content catalog too large" });

  try {
    connectLambda(event);
    await getStore("content-library").set(tenant, payload);
    await logWrite(event, { fn: "content-library", ok: true, tenant, role: writeAuth.role, count: clean.length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};
