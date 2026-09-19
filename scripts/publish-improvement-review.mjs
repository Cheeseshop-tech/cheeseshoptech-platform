#!/usr/bin/env node
/* publish-improvement-review.mjs — push the weekly continual-improvement review to the live
   Command Center WITHOUT a rebuild. POSTs to the improvement-review Netlify function, which
   stores it in Netlify Blobs; the Agency Console's panel reads it on next load.
   Same shape as publish-inventory.mjs / publish-market-news.mjs.

   Auth: this endpoint is guarded by netlify/functions/_write-guard.js (requireWriteAuth), which
   accepts the AGENT_GATE_PASSCODE credential built specifically for unattended scripts/agents
   (2026-09-17) — sent as the x-portal-passcode header, same as reassign-asset-code.mjs and
   validate-item-standards.mjs. No new per-feature secret invented for this.

   Credentials: env vars win; otherwise fall back to a gitignored local config so the unattended
   weekly run can authenticate without the secret living in the scheduled-task prompt (mirrors
   scripts/.inventory-publish.json / scripts/.market-news-publish.json).
     scripts/.improvement-review-publish.json  ->  { "url": "https://<site>/.netlify/functions/improvement-review", "secret": "<AGENT_GATE_PASSCODE value>" }

   Usage: node scripts/publish-improvement-review.mjs [--in <improvement-review.json>]
   Exit codes: 0 published · 1 bad input/credentials · 2 publish rejected.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const file = getArg("--in") || path.resolve(__dirname, "../src/data/cst/improvement-review.json");

let URL = process.env.IMPROVEMENT_REVIEW_PUBLISH_URL || process.env.PLATFORM_BASE
  ? `${(process.env.PLATFORM_BASE || "").replace(/\/$/, "")}/.netlify/functions/improvement-review`
  : null;
let SECRET = process.env.AGENT_GATE_PASSCODE || process.env.PORTAL_PASSCODE;
if (process.env.IMPROVEMENT_REVIEW_PUBLISH_URL) URL = process.env.IMPROVEMENT_REVIEW_PUBLISH_URL;

if (!URL || !SECRET) {
  const cfgPath = path.resolve(__dirname, ".improvement-review-publish.json");
  if (fs.existsSync(cfgPath)) {
    try { const c = JSON.parse(fs.readFileSync(cfgPath, "utf8")); URL = URL || c.url; SECRET = SECRET || c.secret; } catch { /* ignore */ }
  }
}
if (!URL || !SECRET) {
  console.error("✗ No publish credentials. Set AGENT_GATE_PASSCODE + PLATFORM_BASE (or IMPROVEMENT_REVIEW_PUBLISH_URL) env vars,");
  console.error("  or create scripts/.improvement-review-publish.json with { \"url\": ..., \"secret\": ... } (gitignored).");
  console.error("  See docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md for one-time setup.");
  process.exit(1);
}
if (!fs.existsSync(file)) { console.error(`✗ review file not found: ${file}`); process.exit(1); }

const review = JSON.parse(fs.readFileSync(file, "utf8"));

const res = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-portal-passcode": SECRET },
  body: JSON.stringify(review),
});
const body = await res.text();
if (!res.ok) { console.error(`✗ publish failed ${res.status}: ${body}`); process.exit(2); }
console.log(`✓ published improvement review (week of ${review.weekOf || "?"}) -> Command Center. ${body}`);
