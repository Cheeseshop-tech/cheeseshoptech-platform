// Netlify Function: receive the "Priority — response needed" attention items and store them in
// Netlify Blobs. Called by scripts/publish-attention.mjs (run by the Gmail-driven priority-
// response automation) — NOT the browser. Publishing this way needs NO app rebuild/redeploy: the
// read function (attention-list.js) serves whatever is in Blobs on the next page load.
//
// Auth: shared secret in header `x-publish-secret`, compared to env ATTENTION_PUBLISH_SECRET.
// Mirrors market-news-publish.js — same pattern, same guardrail philosophy. One deliberate
// difference: an EMPTY items array is valid and published as-is (an empty desk is real good news
// here, unlike a blank news feed, which market-news-publish.js treats as a bug and refuses).
import { connectLambda, getStore } from "@netlify/blobs";

import { withMonitoring } from "./_sentry.js";
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const KINDS = ["email", "task", "commitment"];
const URGENCIES = ["urgent", "high", "normal"];
const MAX_ITEMS = 30; // this card is a "handle today" list, not an archive

function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

// Structural guardrails: a malformed run must never be able to publish garbage to a card that
// sits at the top of the dashboard.
function validate(items) {
  const errs = [];
  if (!Array.isArray(items)) return ["payload.items is not an array"];
  if (items.length > MAX_ITEMS) errs.push(`${items.length} items (max ${MAX_ITEMS})`);
  items.forEach((it, i) => {
    if (!it || typeof it !== "object") { errs.push(`item ${i}: not an object`); return; }
    if (!it.id) errs.push(`item ${i}: missing id`);
    if (!it.who) errs.push(`item ${i}: missing who`);
    if (!it.what) errs.push(`item ${i}: missing what`);
    if (!KINDS.includes(it.kind)) errs.push(`item ${i}: kind must be one of ${KINDS.join("|")}`);
    if (!URGENCIES.includes(it.urgency)) errs.push(`item ${i}: urgency must be one of ${URGENCIES.join("|")}`);
    if (it.due && !/^\d{4}-\d{2}-\d{2}$/.test(it.due)) errs.push(`item ${i}: due must be YYYY-MM-DD`);
  });
  const ids = items.map((it) => it && it.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) errs.push("duplicate item ids");
  return errs.slice(0, 20); // keep the error payload readable
}

// Keep only the fields the card renders — an automated writer can't smuggle extra keys into Blobs.
function normalize(it) {
  return {
    id: str(it.id, 80),
    kind: it.kind,
    urgency: it.urgency,
    who: str(it.who, 120),
    what: str(it.what, 300),
    due: it.due ? str(it.due, 10) : "",
    action: it.action ? str(it.action, 40) : "",
  };
}

const rawHandler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.ATTENTION_PUBLISH_SECRET;
  if (!secret) return json(503, { error: "ATTENTION_PUBLISH_SECRET not configured" });
  if ((event.headers["x-publish-secret"] || "") !== secret) return json(401, { error: "Unauthorized" });

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  const tenant = (payload.tenant || "").replace(/[^a-z0-9-]/gi, "");
  const items = payload.items;
  if (!tenant) return json(400, { error: "Missing tenant" });

  const errs = validate(items);
  if (errs.length) return json(422, { error: "Validation failed", details: errs });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("attention");
    const clean = items.map(normalize);
    await store.set(tenant, JSON.stringify({ items: clean, updatedAt: new Date().toISOString() }));
    return json(200, { ok: true, tenant, items: clean.length });
  } catch (err) {
    return json(500, { error: "Blobs write failed", detail: String((err && err.message) || err) });
  }
};

export const handler = withMonitoring("attention-publish", rawHandler);
