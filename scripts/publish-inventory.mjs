#!/usr/bin/env node
/* publish-inventory.mjs — push the canonical inventory.json to the live app WITHOUT a rebuild.
   POSTs to the inventory-publish Netlify function, which stores it in Netlify Blobs; the app's
   inventory.js function then serves it to the browser on the next load.

   Env required:
     INVENTORY_PUBLISH_URL     e.g. https://<your-site>/.netlify/functions/inventory-publish
     INVENTORY_PUBLISH_SECRET  must match the same env var set in Netlify
   Usage: node scripts/publish-inventory.mjs [--in <inventory.json>] [--tenant montitrentini]
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const tenant = getArg("--tenant") || "montitrentini";
const file = getArg("--in") || path.resolve(__dirname, "../src/data/montitrentini/inventory.json");

// Credentials: env vars win; otherwise fall back to a gitignored local config so the unattended
// weekly run can authenticate without the secret living in the scheduled-task prompt.
//   scripts/.inventory-publish.json  ->  { "url": "https://<site>/.netlify/functions/inventory-publish", "secret": "..." }
let URL = process.env.INVENTORY_PUBLISH_URL;
let SECRET = process.env.INVENTORY_PUBLISH_SECRET;
if (!URL || !SECRET) {
  const cfgPath = path.resolve(__dirname, ".inventory-publish.json");
  if (fs.existsSync(cfgPath)) {
    try { const c = JSON.parse(fs.readFileSync(cfgPath, "utf8")); URL = URL || c.url; SECRET = SECRET || c.secret; } catch { /* ignore */ }
  }
}
if (!URL || !SECRET) {
  console.error("✗ No publish credentials. Set INVENTORY_PUBLISH_URL + INVENTORY_PUBLISH_SECRET env vars,");
  console.error("  or create scripts/.inventory-publish.json with { \"url\": ..., \"secret\": ... } (gitignored).");
  process.exit(1);
}
if (!fs.existsSync(file)) { console.error(`✗ inventory file not found: ${file}`); process.exit(1); }

const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
const n = inventory.skus ? Object.keys(inventory.skus).length : 0;

const res = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-publish-secret": SECRET },
  body: JSON.stringify({ tenant, inventory }),
});
const body = await res.text();
if (!res.ok) { console.error(`✗ publish failed ${res.status}: ${body}`); process.exit(2); }
console.log(`✓ published ${tenant} inventory (${n} SKUs) -> live store. ${body}`);
