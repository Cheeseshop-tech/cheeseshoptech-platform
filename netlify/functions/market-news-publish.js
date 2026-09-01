// Netlify Function: receive the overnight market-news brief and store it in Netlify Blobs.
// Called by scripts/publish-market-news.mjs (run by the scheduled morning research routine) —
// NOT the browser. Publishing this way needs NO app rebuild/redeploy: the read function
// (market-news.js) serves whatever is in Blobs on the next page load.
//
// Auth: shared secret in header `x-publish-secret`, compared to env MARKETNEWS_PUBLISH_SECRET.
// Mirrors inventory-publish.js — same pattern, same guardrail philosophy.
import { connectLambda, getStore } from "@netlify/blobs";

import { withMonitoring } from "./_sentry.js";
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const CATEGORIES = ["trade", "consumer"];
const MAX_ITEMS = 200;

// These headlines are written by an automated research routine and rendered as target="_blank"
// links, so the URL is the one field that must never be taken on trust: anything that isn't
// plain http(s) is dropped rather than published.
function safeUrl(u) {
  if (typeof u !== "string" || !u) return "";
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

// Structural guardrails, same intent as inventory-publish's: a malformed or empty overnight run
// must never be able to blank out a good brief that's already live.
function validate(news) {
  const errs = [];
  if (!Array.isArray(news)) return ["payload.news is not an array"];
  if (news.length === 0) errs.push("empty news array — refusing to blank the live brief");
  if (news.length > MAX_ITEMS) errs.push(`${news.length} items (max ${MAX_ITEMS})`);
  news.forEach((it, i) => {
    if (!it || typeof it !== "object") { errs.push(`item ${i}: not an object`); return; }
    if (!it.id) errs.push(`item ${i}: missing id`);
    if (!it.headline) errs.push(`item ${i}: missing headline`);
    if (!CATEGORIES.includes(it.category)) errs.push(`item ${i}: category must be trade|consumer`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date || "")) errs.push(`item ${i}: date must be YYYY-MM-DD`);
  });
  const ids = news.map((it) => it && it.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) errs.push("duplicate item ids");
  return errs.slice(0, 20); // keep the error payload readable
}

// Keep only the fields the card renders — an automated writer can't smuggle extra keys into Blobs.
function normalize(it) {
  return {
    id: String(it.id),
    category: it.category,
    headline: String(it.headline),
    summary: it.summary ? String(it.summary) : "",
    url: safeUrl(it.url),
    source: it.source ? String(it.source) : "",
    date: it.date,
    tags: Array.isArray(it.tags) ? it.tags.slice(0, 12).map(String) : [],
  };
}

const rawHandler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.MARKETNEWS_PUBLISH_SECRET;
  if (!secret) return json(503, { error: "MARKETNEWS_PUBLISH_SECRET not configured" });
  if ((event.headers["x-publish-secret"] || "") !== secret) return json(401, { error: "Unauthorized" });

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  const tenant = (payload.tenant || "").replace(/[^a-z0-9-]/gi, "");
  const news = payload.news;
  if (!tenant) return json(400, { error: "Missing tenant" });

  const errs = validate(news);
  if (errs.length) return json(422, { error: "Validation failed", details: errs });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("market-news");
    const clean = news.map(normalize);
    await store.set(tenant, JSON.stringify({ news: clean, updatedAt: new Date().toISOString() }));
    return json(200, { ok: true, tenant, items: clean.length });
  } catch (err) {
    return json(500, { error: "Blobs write failed", detail: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("market-news-publish", rawHandler);
