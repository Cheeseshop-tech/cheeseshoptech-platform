// Netlify Function: receive market "signals" (docs/MARKET_INTELLIGENCE_SPEC.md §2a, Tier 2) and
// store them in Netlify Blobs. Called by scripts/publish-signals.mjs (run by the weekly
// mt-seed-topics-scan automation) — NOT the browser. Publishing this way needs NO app
// rebuild/redeploy: the read function (signals-list.js) serves whatever is in Blobs on the next
// page load.
//
// Auth: shared secret in header `x-publish-secret`, compared to env SIGNALS_PUBLISH_SECRET.
// Mirrors attention-publish.js / market-news-publish.js. Signals behave like market-news, NOT like
// attention: they're a merged, deduped, capped watch list (a fall-boards signal is still true next
// week), not a wholesale-replace-each-run snapshot — so the CALLER (scripts/publish-signals.mjs)
// is responsible for merging with what's already published; this function just validates and
// stores exactly the array it's given.
import { connectLambda, getStore } from "@netlify/blobs";

import { withMonitoring } from "./_sentry.js";
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const SCOPES = ["market", "segment"];
const TYPES = ["seasonal", "category-trend", "competitive", "intent"];
const MAX_ITEMS = 24; // a skimmable watch list, not an archive

function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}
function strArr(v, maxItems, maxLen) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, maxItems).map((x) => x.slice(0, maxLen)) : [];
}

// Structural guardrails: a malformed run must never be able to publish garbage to a card that
// feeds directly into rankOpportunities() and the proposal composer.
function validate(items) {
  const errs = [];
  if (!Array.isArray(items)) return ["payload.items is not an array"];
  if (items.length > MAX_ITEMS) errs.push(`${items.length} items (max ${MAX_ITEMS})`);
  items.forEach((it, i) => {
    if (!it || typeof it !== "object") { errs.push(`item ${i}: not an object`); return; }
    if (!it.id) errs.push(`item ${i}: missing id`);
    if (!it.title) errs.push(`item ${i}: missing title`);
    if (!it.insight) errs.push(`item ${i}: missing insight`);
    if (!SCOPES.includes(it.scope)) errs.push(`item ${i}: scope must be one of ${SCOPES.join("|")}`);
    if (!TYPES.includes(it.type)) errs.push(`item ${i}: type must be one of ${TYPES.join("|")}`);
    if (it.freshness && !/^\d{4}-\d{2}-\d{2}$/.test(it.freshness)) errs.push(`item ${i}: freshness must be YYYY-MM-DD`);
  });
  const ids = items.map((it) => it && it.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) errs.push("duplicate item ids");
  return errs.slice(0, 20); // keep the error payload readable
}

// Keep only the fields the engine/card use — an automated writer can't smuggle extra keys through.
function normalize(it) {
  return {
    id: str(it.id, 80),
    scope: it.scope,
    audience: strArr(it.audience, 6, 40),
    type: it.type,
    title: str(it.title, 140),
    insight: str(it.insight, 400),
    suggestedAngle: str(it.suggestedAngle, 300),
    storyHints: strArr(it.storyHints, 6, 60),
    skus: strArr(it.skus, 10, 60),
    source: str(it.source, 60),
    freshness: it.freshness ? str(it.freshness, 10) : "",
  };
}

const rawHandler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.SIGNALS_PUBLISH_SECRET;
  if (!secret) return json(503, { error: "SIGNALS_PUBLISH_SECRET not configured" });
  if ((event.headers["x-publish-secret"] || "") !== secret) return json(401, { error: "Unauthorized" });

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  const tenant = (payload.tenant || "").replace(/[^a-z0-9-]/gi, "");
  const items = payload.items;
  if (!tenant) return json(400, { error: "Missing tenant" });
  // Unlike attention, an empty signals array is refused — a failed research run must never blank
  // a good live watch list (mirrors market-news-publish.js's guardrail, not attention's).
  if (Array.isArray(items) && items.length === 0) return json(422, { error: "Refusing to publish an empty signals array" });

  const errs = validate(items);
  if (errs.length) return json(422, { error: "Validation failed", details: errs });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("signals");
    const clean = items.map(normalize);
    await store.set(tenant, JSON.stringify({ items: clean, updatedAt: new Date().toISOString() }));
    return json(200, { ok: true, tenant, items: clean.length });
  } catch (err) {
    return json(500, { error: "Blobs write failed", detail: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("signals-publish", rawHandler);
