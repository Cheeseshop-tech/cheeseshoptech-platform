// Netlify Function: receive a regenerated inventory JSON and store it in Netlify Blobs.
// Called by scripts/publish-inventory.mjs (run by the weekly Cowork sync) — NOT the browser.
// Updating inventory this way needs NO app rebuild/redeploy: the read function (inventory.js)
// serves whatever is in Blobs on the next page load.
//
// Auth: a shared secret in header `x-publish-secret`, compared to env INVENTORY_PUBLISH_SECRET.
// (No Netlify token / no Google Cloud needed — the write happens inside the site's own function,
// which has implicit Blobs access.)
import { connectLambda, getStore } from "@netlify/blobs";

import { withMonitoring } from "./_sentry.js";
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

// Same guardrails the sync script applies — refuse obviously-bad payloads so a malformed
// upload can never replace good live data.
//
// ---- FRESHNESS (added 2026-09-25) ---------------------------------------------------------
// Until now nothing anywhere asserted that the inventory being published was RECENT or that its
// date came from a trustworthy place. That single gap is the common cause of three separate
// incidents:
//   · 2026-07-25 — the sheet's hand-typed banner read "28 July", three days in the future. It
//     shipped, and the agency console rendered stock age as a negative number.
//   · 2026-09-17..24 — the validation gate correctly blocked two promotes, so the live catalog
//     quietly served week-old stock. Nothing said so; a stuck gate looked like a calm week.
//   · 2026-09-25 — the daily task was found DISABLED. A disabled scheduler, a stuck gate and a
//     healthy pipeline are indistinguishable from the app, because the app only ever sees a date
//     that looks like a date.
// One check catches all three: the date must exist, must come from Drive, must not be in the
// future, and must not be older than MAX_AGE_DAYS.
//
// This is also where the "never publish a hand-typed date" rule finally becomes code. It has
// existed since July as English prose in monti-inventory-watch/SKILL.md, which enforces nothing —
// the sheet's banner has been stale by 8+ days for over a week while Drive stayed correct.
const MAX_AGE_DAYS = 10; // the sheet lands ~weekly; 10 allows one missed drop plus slack
const DAY_MS = 86_400_000;

/** Exported for tests only (scripts/test-inventory-freshness.mjs) — not part of the HTTP contract. */
export function validate(inv, { allowStale = false } = {}) {
  const errs = [];
  if (!inv || typeof inv !== "object") return ["payload is not an object"];
  if (inv.schemaVersion !== "1.2") errs.push(`unexpected schemaVersion ${inv.schemaVersion}`);
  const n = inv.skus && typeof inv.skus === "object" ? Object.keys(inv.skus).length : 0;
  if (n < 80) errs.push(`only ${n} SKUs (expected ~110+)`);
  let lots = 0;
  for (const k of Object.keys(inv.skus || {})) lots += (inv.skus[k].lots || []).length;
  if (lots < 80) errs.push(`only ${lots} lots (expected ~120)`);

  // Provenance. NOT overridable: a date nobody can vouch for is worse than no publish at all,
  // and the fix (re-run with the Drive sidecar) is always available.
  if (inv.lastUpdatedSource !== "drive-modifiedTime") {
    errs.push(
      `lastUpdatedSource is "${inv.lastUpdatedSource || "absent"}", expected "drive-modifiedTime" — ` +
      `re-run: node scripts/sync-inventory.mjs --require-drive-meta --promote`
    );
  }

  // Freshness.
  const t = Date.parse(inv.lastUpdated || "");
  if (!Number.isFinite(t)) {
    errs.push(`lastUpdated is missing or unparseable ("${inv.lastUpdated || ""}")`);
  } else {
    const ageDays = Math.floor((Date.now() - t) / DAY_MS);
    // A future date is ALWAYS a bug — no override. This is the exact 2026-07-25 failure.
    if (ageDays < 0) {
      errs.push(`lastUpdated ${inv.lastUpdated} is ${-ageDays} day(s) in the FUTURE — almost certainly a typo in the sheet banner`);
    } else if (ageDays > MAX_AGE_DAYS && !allowStale) {
      // Overridable, because re-publishing known-good data to recover an empty Blobs store is a
      // real and legitimate need. The caller has to ask for it explicitly, so it can't happen by
      // accident and it shows up in the request.
      errs.push(
        `lastUpdated ${inv.lastUpdated} is ${ageDays} days old (max ${MAX_AGE_DAYS}) — the sheet or ` +
        `the sync has been stuck. Fix the source, or pass "allowStale": true to republish deliberately.`
      );
    }
  }
  return errs;
}

const rawHandler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.INVENTORY_PUBLISH_SECRET;
  if (!secret) return json(503, { error: "INVENTORY_PUBLISH_SECRET not configured" });
  if ((event.headers["x-publish-secret"] || "") !== secret) return json(401, { error: "Unauthorized" });

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  const tenant = (payload.tenant || "").replace(/[^a-z0-9-]/gi, "");
  const inventory = payload.inventory;
  if (!tenant) return json(400, { error: "Missing tenant" });

  const errs = validate(inventory, { allowStale: payload.allowStale === true });
  if (errs.length) return json(422, { error: "Validation failed", details: errs });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("inventory");
    await store.set(tenant, JSON.stringify({ inventory, updatedAt: new Date().toISOString() }));
    // Report the age back so the caller (and its failure email) can state how fresh the live
    // catalog now is without re-deriving it.
    const ageDays = Math.floor((Date.now() - Date.parse(inventory.lastUpdated)) / DAY_MS);
    return json(200, {
      ok: true,
      tenant,
      skus: Object.keys(inventory.skus).length,
      lastUpdated: inventory.lastUpdated,
      ageDays,
      ...(payload.allowStale === true ? { staleOverrideUsed: true } : {}),
    });
  } catch (err) {
    return json(500, { error: "Blobs write failed", detail: String(err && err.message || err) });
  }
};

export const handler = withMonitoring("inventory-publish", rawHandler);
