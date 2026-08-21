// Netlify Function: custom CAMPAIGN DEFINITIONS created from the "New Campaign" tab (2026-08-21,
// Rick: "lets add a template form and tab for create a campaign").
//
// Campaign definitions were previously either hardcoded SEEDS in src/lib/campaigns.js or fetched
// read-only from a Make webhook (netlify/functions/campaigns.js) — there was NO write path for a
// brand-new campaign at all. This store is that write path. Campaigns created here are kept in
// their own Blobs document, separate from the seeded/webhook set, and merged into getCampaigns()
// client-side (src/lib/campaigns.js) so the rest of the app (pill nav, checklist, state overlay)
// treats a custom campaign exactly like a seeded one — same id space, same campaign-state.js
// overlay for status/checklist ticks.
//
// Shape deliberately differs from campaign-state.js's "client sends the full document" pattern:
// that pattern fits a document that's rewritten wholesale on every autosave. This store only
// ever GROWS, one campaign at a time, from a single form — so the server does a read-modify-write
// UPSERT keyed by campaign id instead. Simpler for the caller (no need to hold/resend the whole
// document) and safer if two creates ever raced (each only touches its own key).
//
// GET  ?tenant=<id>          → { entries, updatedAt }             (any valid read auth)
// POST { tenant, campaign }  → { ok, campaign, updatedAt }        (house/client-admin write auth)
//   campaign = { id, type, name, goal, channels, start, end, owner, strategy, audience, serves? }
//   — id must be unique in this store; src/lib/campaigns.js generates it from the name client-side
//   and passes the current id list in, so a 409 here should be rare (a genuine race, not the
//   common case).
//
// No per-client code — tenant is data.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";
import { withMonitoring } from "./_sentry.js";

const MAX_BYTES = 400_000;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;
// Mirrors CAMPAIGN_TYPES/CHANNELS in src/lib/campaigns.js. Kept as literals (not imported) —
// Netlify Functions bundle separately from the Vite app, same reason campaign-state.js re-lists
// STATUSES rather than importing LIFECYCLE.
const TYPES = ["email", "social", "enrichment"];
const CHANNEL_KEYS = ["retail", "dtc", "social", "foodservice"];

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

const str = (v, max) => (typeof v === "string" ? v.slice(0, max).trim() : "");
const dateStr = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : null);
const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 1e9) : 0;
};

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant, context);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("campaign-defs").get(tenant);
      if (!raw) return json(200, { entries: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { entries: rec.entries || {}, updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Blobs unprovisioned/transient: degrade to empty — the tab still renders seeded/webhook
      // definitions rather than erroring out. Same choice as campaign-state.js.
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
    await logWrite(event, { fn: "campaign-defs", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const input = body.campaign;
  if (!input || typeof input !== "object") return json(400, { error: "Missing campaign" });
  if (!ID_RE.test(input.id || "")) return json(400, { error: "Missing/invalid campaign id" });
  if (!TYPES.includes(input.type)) return json(400, { error: "Missing/invalid campaign type" });
  const name = str(input.name, 160);
  if (!name) return json(400, { error: "Missing campaign name" });

  const channels = (Array.isArray(input.channels) ? input.channels : []).filter((c) => CHANNEL_KEYS.includes(c));
  const audienceLabel = str(input.audience?.label, 160);
  const audienceNote = str(input.audience?.note, 500);
  const audience = (audienceLabel || audienceNote || input.audience?.size != null)
    ? {
        ...(audienceLabel ? { label: audienceLabel } : {}),
        ...(input.audience?.size != null ? { size: int(input.audience.size) } : {}),
        ...(audienceNote ? { note: audienceNote } : {}),
      }
    : null;
  const strategySummary = str(input.strategy, 4000);

  const clean = {
    id: input.id,
    type: input.type,
    name,
    goal: str(input.goal, 500),
    channels,
    start: dateStr(input.start),
    end: dateStr(input.end),
    owner: str(input.owner, 120),
    ...(strategySummary ? { strategy: { summary: strategySummary } } : {}),
    audience,
    // Enrichment campaigns can name the send they unblock (src/lib/campaigns.js scopeOf()).
    ...(input.type === "enrichment" && ID_RE.test(input.serves || "") ? { serves: input.serves } : {}),
    content: [],
    seedStatus: "draft",
    seedDone: [],
    custom: true, // flags a UI-created def vs. seeded/webhook — src/lib/campaigns.js getCampaigns()
    createdAt: new Date().toISOString(),
  };

  try {
    connectLambda(event);
    const store = getStore("campaign-defs");
    let entries = {};
    try {
      const raw = await store.get(tenant);
      if (raw) entries = JSON.parse(raw).entries || {};
    } catch { /* start fresh if the existing document is unreadable */ }

    if (entries[clean.id]) return json(409, { error: "A campaign with this id already exists" });

    entries[clean.id] = clean;
    const updatedAt = new Date().toISOString();
    const payload = JSON.stringify({ entries, updatedAt });
    if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Campaign definitions document too large" });

    await store.set(tenant, payload);
    await logWrite(event, { fn: "campaign-defs", ok: true, tenant, role: writeAuth.role, campaignId: clean.id });
    return json(200, { ok: true, campaign: clean, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("campaign-defs", rawHandler);
