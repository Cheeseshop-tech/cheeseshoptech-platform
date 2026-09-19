#!/usr/bin/env node
/* publish-attention.mjs — push the "Priority — response needed" items to the live Agency Console
   dashboard WITHOUT a rebuild. POSTs to the attention-publish Netlify function, which stores them
   in Netlify Blobs; the dashboard's attention.js reads them back on next load (once
   VITE_ATTENTION_BACKEND=function is set — see docs, one-time setup).

   Input file = a JSON array of items:
     [{ id, kind: "email"|"task"|"commitment", urgency: "urgent"|"high"|"normal",
        who, what, due: "YYYY-MM-DD" (optional), action (optional) }]
   An empty array is valid and will be published as-is — it means the desk is clear.

   Env required:
     ATTENTION_PUBLISH_URL     e.g. https://<your-site>/.netlify/functions/attention-publish
     ATTENTION_PUBLISH_SECRET  must match the same env var set in Netlify
   Or a gitignored local config, same shape as .market-news-publish.json:
     scripts/.attention-publish.json -> { "url": "...", "secret": "..." }

   Usage: node scripts/publish-attention.mjs [--in <attention.json>] [--tenant montitrentini]
   Exit codes: 0 published · 1 bad input/credentials · 2 publish rejected.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const tenant = getArg("--tenant") || "montitrentini";
const file = getArg("--in") || path.resolve(__dirname, `../src/data/${tenant}/attention.json`);

let URL_ = process.env.ATTENTION_PUBLISH_URL;
let SECRET = process.env.ATTENTION_PUBLISH_SECRET;
if (!URL_ || !SECRET) {
  const cfgPath = path.resolve(__dirname, ".attention-publish.json");
  if (fs.existsSync(cfgPath)) {
    try { const c = JSON.parse(fs.readFileSync(cfgPath, "utf8")); URL_ = URL_ || c.url; SECRET = SECRET || c.secret; } catch { /* ignore */ }
  }
}
if (!URL_ || !SECRET) {
  console.error("✗ No publish credentials. Set ATTENTION_PUBLISH_URL + ATTENTION_PUBLISH_SECRET env vars,");
  console.error("  or create scripts/.attention-publish.json with { \"url\": ..., \"secret\": ... } (gitignored).");
  process.exit(1);
}
if (!fs.existsSync(file)) { console.error(`✗ attention file not found: ${file}`); process.exit(1); }

const items = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(items)) {
  console.error("✗ refusing to publish: file is not a JSON array of attention items");
  process.exit(1);
}

const res = await fetch(URL_, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-publish-secret": SECRET },
  body: JSON.stringify({ tenant, items }),
});
const body = await res.text();
if (!res.ok) { console.error(`✗ publish failed ${res.status}: ${body}`); process.exit(2); }
console.log(`✓ published ${tenant} priority attention (${items.length} item${items.length === 1 ? "" : "s"}) -> live dashboard. ${body}`);
