#!/usr/bin/env node
/* publish-signals.mjs — push market "signals" to the live Opportunities card WITHOUT a rebuild.
   POSTs to the signals-publish Netlify function, which stores them in Netlify Blobs; the
   dashboard's signals.js reads them back on next load (once VITE_SIGNALS_BACKEND=function is set).

   Unlike publish-attention.mjs, this REFUSES an empty array (see signals-publish.js) — signals are
   a merged watch list, not a today's-snapshot. The caller (mt-seed-topics-scan) is responsible for
   merging new findings into the existing src/data/<tenant>/signals.json before calling this.

   Input file = a JSON array of signal items:
     [{ id, scope: "market"|"segment", audience: [...], type: "seasonal"|"category-trend"|
        "competitive"|"intent", title, insight, suggestedAngle, storyHints: [...], skus: [...],
        source, freshness: "YYYY-MM-DD" }]

   Env required:
     SIGNALS_PUBLISH_URL     e.g. https://<your-site>/.netlify/functions/signals-publish
     SIGNALS_PUBLISH_SECRET  must match the same env var set in Netlify
   Or a gitignored local config, same shape as .attention-publish.json:
     scripts/.signals-publish.json -> { "url": "...", "secret": "..." }

   Usage: node scripts/publish-signals.mjs [--in <signals.json>] [--tenant montitrentini]
   Exit codes: 0 published · 1 bad input/credentials · 2 publish rejected.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const tenant = getArg("--tenant") || "montitrentini";
const file = getArg("--in") || path.resolve(__dirname, `../src/data/${tenant}/signals.json`);

let URL_ = process.env.SIGNALS_PUBLISH_URL;
let SECRET = process.env.SIGNALS_PUBLISH_SECRET;
if (!URL_ || !SECRET) {
  const cfgPath = path.resolve(__dirname, ".signals-publish.json");
  if (fs.existsSync(cfgPath)) {
    try { const c = JSON.parse(fs.readFileSync(cfgPath, "utf8")); URL_ = URL_ || c.url; SECRET = SECRET || c.secret; } catch { /* ignore */ }
  }
}
if (!URL_ || !SECRET) {
  console.error("✗ No publish credentials. Set SIGNALS_PUBLISH_URL + SIGNALS_PUBLISH_SECRET env vars,");
  console.error("  or create scripts/.signals-publish.json with { \"url\": ..., \"secret\": ... } (gitignored).");
  process.exit(1);
}
if (!fs.existsSync(file)) { console.error(`✗ signals file not found: ${file}`); process.exit(1); }

const items = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(items)) {
  console.error("✗ refusing to publish: file is not a JSON array of signal items");
  process.exit(1);
}
if (items.length === 0) {
  console.error("✗ refusing to publish an empty signals array — the function will reject it too");
  process.exit(1);
}

const res = await fetch(URL_, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-publish-secret": SECRET },
  body: JSON.stringify({ tenant, items }),
});
const body = await res.text();
if (!res.ok) { console.error(`✗ publish failed ${res.status}: ${body}`); process.exit(2); }
console.log(`✓ published ${tenant} signals (${items.length} item${items.length === 1 ? "" : "s"}) -> live dashboard. ${body}`);
