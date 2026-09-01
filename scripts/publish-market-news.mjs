#!/usr/bin/env node
/* publish-market-news.mjs — push the overnight market-news brief to the live app WITHOUT a rebuild.
   POSTs to the market-news-publish Netlify function, which stores it in Netlify Blobs; the app's
   market-news.js function then serves it to the browser on the next load.

   Input file = a JSON array of news items:
     [{ id, category: "trade"|"consumer", headline, summary, url, source, date: "YYYY-MM-DD", tags[] }]

   Env required:
     MARKETNEWS_PUBLISH_URL     e.g. https://<your-site>/.netlify/functions/market-news-publish
     MARKETNEWS_PUBLISH_SECRET  must match the same env var set in Netlify
   Usage: node scripts/publish-market-news.mjs [--in <market-news.json>] [--tenant montitrentini]
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const tenant = getArg("--tenant") || "montitrentini";
const file = getArg("--in") || path.resolve(__dirname, `../src/data/${tenant}/market-news.json`);

// Credentials: env vars win; otherwise fall back to a gitignored local config so the unattended
// nightly run can authenticate without the secret living in the scheduled-task prompt.
//   scripts/.market-news-publish.json -> { "url": "https://<site>/.netlify/functions/market-news-publish", "secret": "..." }
let URL_ = process.env.MARKETNEWS_PUBLISH_URL;
let SECRET = process.env.MARKETNEWS_PUBLISH_SECRET;
if (!URL_ || !SECRET) {
  const cfgPath = path.resolve(__dirname, ".market-news-publish.json");
  if (fs.existsSync(cfgPath)) {
    try { const c = JSON.parse(fs.readFileSync(cfgPath, "utf8")); URL_ = URL_ || c.url; SECRET = SECRET || c.secret; } catch { /* ignore */ }
  }
}
if (!URL_ || !SECRET) {
  console.error("✗ No publish credentials. Set MARKETNEWS_PUBLISH_URL + MARKETNEWS_PUBLISH_SECRET env vars,");
  console.error("  or create scripts/.market-news-publish.json with { \"url\": ..., \"secret\": ... } (gitignored).");
  process.exit(1);
}
if (!fs.existsSync(file)) { console.error(`✗ market-news file not found: ${file}`); process.exit(1); }

const news = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(news) || news.length === 0) {
  console.error("✗ refusing to publish: file is not a non-empty JSON array of news items");
  process.exit(1);
}

const res = await fetch(URL_, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-publish-secret": SECRET },
  body: JSON.stringify({ tenant, news }),
});
const body = await res.text();
if (!res.ok) { console.error(`✗ publish failed ${res.status}: ${body}`); process.exit(2); }
console.log(`✓ published ${tenant} market news (${news.length} items) -> live store. ${body}`);
