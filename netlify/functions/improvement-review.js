// Netlify Function: the weekly continual-improvement review, surfaced live in the house Command
// Center (Agency Console) instead of only ever landing as a chat message from the
// "weekly-improvement-review" scheduled task. House admin only — this is CST's own build-ops
// reporting, not a per-tenant client feature (same tier as write-log.js / login-log.js).
//
// Why this exists (2026-09-18, Rick: "weekly improvement updates live in the command center as
// it is a CST build operation reporting. automate this also. so it updates on its own."): the
// review used to only exist as a scheduled-task chat transcript — useful once, invisible a week
// later. Same "no rebuild" shape as inventory/campaign-state/market-news: a routine writes, the
// app reads on next load, nobody redeploys to see this week's numbers.
//
// GET  (no body)                     → { ok, latest, history }   (house admin only)
// POST { weekOf, shippedSummary,
//        shelfLife, dataFreshnessNote,
//        backlogNow, backlogNext,
//        recommendation, blocked,
//        openRisks }                 → { ok, updatedAt }         (house admin only)
//   `latest` is the newest POSTed review; `history` is newest-first, capped at MAX_HISTORY.
//   generatedAt/weekOf are set/stamped server-side — never trust a client-supplied timestamp.
//
// Auth: requireWriteAuth() from _write-guard.js, restricted to role === "admin" (tenant-agnostic
// CST staff), same pattern as write-log.js/login-log.js. That guard already accepts
// AGENT_GATE_PASSCODE (2026-09-17) — the dedicated credential for exactly this kind of unattended
// script/agent write — so no new secret was invented for this pipeline; see
// docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md for the publish script that uses it.

import { connectLambda, getStore } from "@netlify/blobs";
import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";

const STORE = "improvement-review";
const KEY = "doc";
const MAX_HISTORY = 26; // ~6 months of weekly reviews — enough trend, bounded size
const MAX_BYTES = 60_000; // one review is a KB or two of text; this is a generous ceiling

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
const strArr = (v, maxItems, maxLen) =>
  (Array.isArray(v) ? v : []).slice(0, maxItems).map((x) => str(x, maxLen)).filter(Boolean);
const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(Math.floor(n), 1_000_000)) : 0;
};

// Sanitize a posted review into the known shape only — unknown keys dropped, everything bounded.
// Mirrors campaign-state.js's approach: known fields, bounded strings/arrays, nothing free-form.
function cleanReview(body) {
  const shelfLifeIn = body.shelfLife && typeof body.shelfLife === "object" ? body.shelfLife : {};
  const topLots = (Array.isArray(shelfLifeIn.topLots) ? shelfLifeIn.topLots : [])
    .slice(0, 5)
    .filter((l) => l && typeof l === "object")
    .map((l) => ({
      code: str(l.code, 20),
      name: str(l.name, 80),
      lot: str(l.lot, 20),
      exp: str(l.exp, 20),
      cases: int(l.cases),
      dleft: Number.isFinite(Number(l.dleft)) ? Math.floor(Number(l.dleft)) : null,
    }));

  const recIn = body.recommendation && typeof body.recommendation === "object" ? body.recommendation : {};

  const blocked = (Array.isArray(body.blocked) ? body.blocked : [])
    .slice(0, 10)
    .filter((b) => b && typeof b === "object")
    .map((b) => ({ item: str(b.item, 200), blocker: str(b.blocker, 200) }))
    .filter((b) => b.item);

  return {
    weekOf: str(body.weekOf, 20) || new Date().toISOString().slice(0, 10),
    shippedSummary: str(body.shippedSummary, 500),
    shelfLife: {
      expired: int(shelfLifeIn.expired),
      urgent: int(shelfLifeIn.urgent),
      watch: int(shelfLifeIn.watch),
      atRiskCases: int(shelfLifeIn.atRiskCases),
      topLots,
    },
    dataFreshnessNote: str(body.dataFreshnessNote, 300),
    backlogNow: strArr(body.backlogNow, 10, 220),
    backlogNext: strArr(body.backlogNext, 12, 220),
    recommendation: { title: str(recIn.title, 160), why: str(recIn.why, 500) },
    blocked,
    openRisks: strArr(body.openRisks, 10, 220),
    generatedAt: new Date().toISOString(), // server-stamped, never client-supplied
  };
}

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const auth = requireWriteAuth(event, "", context);
    if (!auth.ok) return jsonUnauthorized(auth);
    if (auth.role !== "admin") return json(403, { error: "House admin only" });

    try {
      connectLambda(event);
      const raw = await getStore(STORE).get(KEY);
      if (!raw) return json(200, { ok: true, latest: null, history: [] });
      const doc = JSON.parse(raw);
      return json(200, { ok: true, latest: doc.latest || null, history: doc.history || [] });
    } catch (err) {
      // Blobs unprovisioned/transient: degrade to empty — the panel shows "no review yet" rather
      // than erroring the whole console out (same choice as campaign-state.js).
      return json(200, { ok: true, latest: null, history: [], note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = requireWriteAuth(event, "", context);
  if (!auth.ok) {
    await logWrite(event, { fn: "improvement-review", ok: false, status: auth.status });
    return jsonUnauthorized(auth);
  }
  if (auth.role !== "admin") return json(403, { error: "House admin only" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  const entry = cleanReview(body);
  const payloadCheck = JSON.stringify(entry);
  if (Buffer.byteLength(payloadCheck) > MAX_BYTES) return json(413, { error: "Review document too large" });

  try {
    connectLambda(event);
    const store = getStore(STORE);
    const raw = await store.get(KEY);
    const prior = raw ? JSON.parse(raw) : { history: [] };
    const history = [entry, ...(prior.history || [])].slice(0, MAX_HISTORY);
    const doc = { latest: entry, history };
    await store.set(KEY, JSON.stringify(doc));
    await logWrite(event, { fn: "improvement-review", ok: true, role: auth.role, weekOf: entry.weekOf });
    return json(200, { ok: true, updatedAt: entry.generatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("improvement-review", rawHandler);
