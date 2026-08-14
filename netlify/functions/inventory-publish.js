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
function validate(inv) {
  const errs = [];
  if (!inv || typeof inv !== "object") return ["payload is not an object"];
  if (inv.schemaVersion !== "1.2") errs.push(`unexpected schemaVersion ${inv.schemaVersion}`);
  const n = inv.skus && typeof inv.skus === "object" ? Object.keys(inv.skus).length : 0;
  if (n < 80) errs.push(`only ${n} SKUs (expected ~110+)`);
  let lots = 0;
  for (const k of Object.keys(inv.skus || {})) lots += (inv.skus[k].lots || []).length;
  if (lots < 80) errs.push(`only ${lots} lots (expected ~120)`);
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

  const errs = validate(inventory);
  if (errs.length) return json(422, { error: "Validation failed", details: errs });

  try {
    connectLambda(event); // wire Blobs context for handler-style functions
    const store = getStore("inventory");
    await store.set(tenant, JSON.stringify({ inventory, updatedAt: new Date().toISOString() }));
    return json(200, { ok: true, tenant, skus: Object.keys(inventory.skus).length });
  } catch (err) {
    return json(500, { error: "Blobs write failed", detail: String(err && err.message || err) });
  }
};

export const handler = withMonitoring("inventory-publish", rawHandler);
