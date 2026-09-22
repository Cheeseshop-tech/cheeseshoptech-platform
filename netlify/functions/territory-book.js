// Netlify Function: per-tenant TERRITORY BOOK — the named territories a distributor's reps cover,
// and which accounts are in each (ADR-002_territory-as-first-class-entity_2026-09-22.md).
//
// WHY THIS IS TENANT-WIDE, NOT PER-CAMPAIGN. Rep calls already are (this file's sibling,
// campaign-rep-calls.js), but territory and account assignments were living inside
// campaign-state[id].repVisits — so the conversation carried into the next campaign and the map
// built out of that conversation did not. Rick, 2026-09-22: "while I develop my communication and
// relationship with the rep I will build in the accounts and the territories." Building only
// counts if it accumulates, so the book outlives every campaign that reads it.
//
// WHY MEMBERSHIP IS AN EXPLICIT LIST, NOT A STATE/CITY RULE. Decided 2026-09-21 and re-affirmed
// in ADR-002: a geometric rule cannot express "this one account is the scattered exception" without
// also over- or under-grabbing its neighbours, and a mis-assigned account sends a rep to the wrong
// door. `builtFrom` records which checkboxes produced a membership so the UI can OFFER newly
// matching accounts — it is provenance, never authority. Nothing here re-derives membership.
//
// Crossover is normal (`repEmails` is a list, Rick 2026-09-22: "a few opperating in the same or
// crossover areas"), and a scattered account simply appears in two territories' accountIds. Both
// directions — rep→accounts and account→reps — are DERIVED from this one object in
// src/lib/territories.js; there is no second map to drift out of sync.
//
// GET  ?tenant=<id>              → { territories, updatedAt }   (any valid passcode tier)
// POST { tenant, territories }   → { ok, updatedAt }            (house/client-admin passcode)
//   territories = { [territoryId]: { id, name, repEmails[], accountIds[], builtFrom, notes,
//                                    createdAt, updatedAt } }

import { connectLambda, getStore } from "@netlify/blobs";
import { requireReadAuth, requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";

// Roomier than campaign-rep-calls' 400KB: this document holds account-id LISTS, not one short
// record per rep. At the 5,000-account cap with ~10-character HubSpot ids that is well under
// 200KB even with every account in several territories, so 800KB is headroom, not a target.
const MAX_BYTES = 800_000;
const MAX_TERRITORIES = 500;        // ADR-002 Scale: 20-40 expected; revisit past ~500
const MAX_REPS_PER_TERRITORY = 25;
const MAX_ACCOUNTS_PER_TERRITORY = 5_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode, Authorization",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v) => (Array.isArray(v) ? v : []);

/** Territory ids are generated client-side from the name; normalize hard so a hand-edited or
 *  legacy id can never become a path-ish or duplicate-by-case key. */
const territoryId = (v) =>
  String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

/** Provenance only — the checkbox shape a membership was built from, so the UI can offer newly
 *  matching accounts later. Deliberately NOT read as a filter anywhere. */
function cleanBuiltFrom(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const states = arr(raw.states).slice(0, 60).map((s) => str(s, 4).toUpperCase()).filter(Boolean);
  const cities = Object.fromEntries(
    Object.entries(raw.cities && typeof raw.cities === "object" && !Array.isArray(raw.cities) ? raw.cities : {})
      .slice(0, 60)
      .map(([st, list]) => [
        str(st, 4).toUpperCase(),
        arr(list).slice(0, 200).map((v) => str(v, 80).toLowerCase()).filter(Boolean),
      ])
      .filter(([st, list]) => st && list.length)
  );
  if (!states.length && !Object.keys(cities).length) return null;
  return { ...(states.length ? { states } : {}), ...(Object.keys(cities).length ? { cities } : {}) };
}

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  if (event.httpMethod === "GET") {
    const tenant = (event.queryStringParameters?.tenant || "").replace(/[^a-z0-9-]/gi, "");
    if (!tenant) return json(400, { error: "Missing tenant" });
    const readAuth = requireReadAuth(event, tenant, context);
    if (!readAuth.ok) return jsonUnauthorized(readAuth);
    try {
      connectLambda(event);
      const raw = await getStore("territory-book").get(tenant);
      if (!raw) return json(200, { territories: {}, updatedAt: null });
      const rec = JSON.parse(raw);
      return json(200, { territories: rec.territories || {}, updatedAt: rec.updatedAt || null });
    } catch (err) {
      // Same posture as every other overlay store here: a read failure degrades to "empty book"
      // with a note rather than an error status, so the panel still renders and the campaign's
      // own legacy assignments can carry the UI (see territoriesFromLegacy, src/lib/territories.js).
      return json(200, { territories: {}, updatedAt: null, note: String(err?.message || err) });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "territory-book", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const territories = body.territories;
  if (!territories || typeof territories !== "object" || Array.isArray(territories)) {
    return json(400, { error: "Missing/invalid territories" });
  }

  const now = new Date().toISOString();
  const clean = {};
  for (const [rawId, t] of Object.entries(territories).slice(0, MAX_TERRITORIES)) {
    const id = territoryId(t?.id || rawId);
    if (!id || !t || typeof t !== "object") continue;
    const name = str(t.name, 120);
    if (!name) continue; // an unnamed territory can't be looked up or reported on — that's the point

    const repEmails = [...new Set(
      arr(t.repEmails).map((v) => str(v, 200).toLowerCase()).filter((v) => EMAIL_RE.test(v))
    )].slice(0, MAX_REPS_PER_TERRITORY);

    const accountIds = [...new Set(
      arr(t.accountIds).map((v) => str(v, 40)).filter(Boolean)
    )].slice(0, MAX_ACCOUNTS_PER_TERRITORY);

    const builtFrom = cleanBuiltFrom(t.builtFrom);
    const notes = str(t.notes, 2000);

    clean[id] = {
      id,
      name,
      ...(repEmails.length ? { repEmails } : {}),
      ...(accountIds.length ? { accountIds } : {}),
      ...(builtFrom ? { builtFrom } : {}),
      ...(notes ? { notes } : {}),
      createdAt: str(t.createdAt, 40) || now,
      updatedAt: now,
    };
  }

  const updatedAt = now;
  const payload = JSON.stringify({ territories: clean, updatedAt });
  if (Buffer.byteLength(payload) > MAX_BYTES) return json(413, { error: "Territory book too large" });

  try {
    connectLambda(event);
    await getStore("territory-book").set(tenant, payload);
    await logWrite(event, { fn: "territory-book", ok: true, tenant, role: writeAuth.role, count: Object.keys(clean).length });
    return json(200, { ok: true, updatedAt });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("territory-book", rawHandler);
