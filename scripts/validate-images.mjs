// Validate the tenant's Cloudinary asset tagging for the dispatch + background-removal criteria
// (docs/IMAGE_DISPATCH_AUDIT_2026-07-18.md §5 fix #4). Run any time: `npm run validate:images`.
// Same dual-mode as sync-images.mjs (Admin API secrets, or --live via the deployed media-list
// function) so it can run from a laptop with no secrets too.
//
// This is a REPORT ONLY — it never writes to Cloudinary or to images.json. It exists so "did my
// new tag + item number actually qualify" is a one-command check instead of a manual look.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;
const tenant = process.env.TENANT || "montitrentini";
const folder = process.env.CLOUDINARY_FOLDER || "monti-trentini";
const LIVE = process.argv.includes("--live") || !(cloud && key && secret);

const APPROVAL_TAGS = ["approved-for-influencers", "approved-for-press", "draft"];
const APPROVED_STATES = ["approved-for-press", "approved-for-influencers"];
const PRODUCT_TAG = "product-catalog";
const BG_REMOVED_TAG = "bg-removed"; // convention proposed 2026-07-18; not yet in use anywhere

const clientConfigPath = path.join(__dirname, `../config/clients/${tenant}.json`);
const clientConfig = fs.existsSync(clientConfigPath) ? JSON.parse(fs.readFileSync(clientConfigPath, "utf8")) : {};
const legacyFolders = clientConfig.cloudinaryLegacyFolders || [];

let resources = [];

if (!LIVE) {
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  async function listPrefix(prefix) {
    const base =
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
      `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=500&tags=true&context=true`;
    const out = [];
    let cursor = null;
    do {
      const res = await fetch(cursor ? `${base}&next_cursor=${encodeURIComponent(cursor)}` : base, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) { console.error(`Cloudinary ${res.status}: ${await res.text()}`); process.exit(1); }
      const data = await res.json();
      out.push(...(data.resources || []));
      cursor = data.next_cursor;
    } while (cursor);
    return out;
  }
  resources = await listPrefix(folder);
  const seen = new Set(resources.map((r) => r.public_id));
  for (const legacy of legacyFolders) {
    const extra = await listPrefix(legacy);
    for (const r of extra) {
      if (!r.public_id.startsWith(`${legacy}/`) || seen.has(r.public_id)) continue;
      seen.add(r.public_id);
      if (!r.context?.custom?.sku) {
        const name = r.public_id.slice(legacy.length + 1);
        if (/^[A-Za-z0-9-]+$/.test(name)) {
          r.context = { ...r.context, custom: { ...r.context?.custom, sku: name } };
        }
      }
      resources.push(r);
    }
  }
} else {
  const BASE = process.env.PLATFORM_BASE || "https://montitrentini.cheeseshoptech.com";
  const legacyParam = legacyFolders.length ? `&legacy=${encodeURIComponent(legacyFolders.join(","))}` : "";
  const res = await fetch(`${BASE}/.netlify/functions/media-list?folder=${encodeURIComponent(folder)}${legacyParam}`);
  if (!res.ok) { console.error(`media-list ${res.status}: ${await res.text()}`); process.exit(1); }
  const data = await res.json();
  const assets = data.assets || data;
  // Normalize to the same shape the Admin-API branch uses (tags[] + context.custom).
  resources = assets.map((a) => ({
    public_id: a.publicId,
    tags: a.usage || [],
    context: { custom: { sku: a.sku || "" } },
    format: a.format,
    _approvalState: a.approvalState,
    _bgRemoved: a.bgRemoved, // media-list.js surfaces this as its own boolean, not folded into usage[]
  }));
}

const rows = resources.map((r) => {
  const tags = r.tags || [];
  const sku = r.context?.custom?.sku || r.context?.custom?.code || "";
  const approvalState = r._approvalState || APPROVAL_TAGS.find((s) => tags.includes(s)) || "approved-for-press";
  return {
    publicId: r.public_id,
    sku,
    hasProductTag: tags.includes(PRODUCT_TAG),
    approved: APPROVED_STATES.includes(approvalState),
    approvalState,
    bgRemoved: r._bgRemoved != null ? !!r._bgRemoved : tags.includes(BG_REMOVED_TAG),
    format: r.format,
  };
});

const qualifying = rows.filter((r) => r.sku && r.hasProductTag && r.approved);
const skuOnlyNoTag = rows.filter((r) => r.sku && !r.hasProductTag); // the "20724 cow photo" class
const tagOnlyNoSku = rows.filter((r) => !r.sku && r.hasProductTag); // e.g. truffle-caciotta, family shots
const draftButTagged = rows.filter((r) => r.sku && r.hasProductTag && !r.approved);
const missingBgRemoved = qualifying.filter((r) => !r.bgRemoved);

const bySku = {};
qualifying.forEach((r) => { (bySku[r.sku] ||= []).push(r.publicId); });
const duplicateSkus = Object.entries(bySku).filter(([, ids]) => ids.length > 1);

console.log(`\n=== Image dispatch + background validation — ${tenant} (${LIVE ? "live" : "Admin API"} mode) ===\n`);
console.log(`Total assets scanned:            ${rows.length}`);
console.log(`Qualifying (tag + item# + approved): ${qualifying.length}`);
console.log(`  ...missing 'bg-removed' tag:      ${missingBgRemoved.length} of ${qualifying.length}`);
console.log(`Has item# but NO product-catalog tag: ${skuOnlyNoTag.length}  ← would leak into the manifest without the 2026-07-18 gate`);
console.log(`Tagged product-catalog but NO item#:  ${tagOnlyNoSku.length}`);
console.log(`Tagged + numbered but still draft:    ${draftButTagged.length}`);
console.log(`Duplicate item numbers (2+ photos):   ${duplicateSkus.length}`);

if (skuOnlyNoTag.length) {
  console.log(`\n-- Item numbers on non-product-tagged assets (verify these are correct on purpose) --`);
  skuOnlyNoTag.forEach((r) => console.log(`  ${r.sku.padEnd(10)} ${r.publicId}`));
}
if (duplicateSkus.length) {
  console.log(`\n-- Duplicate item numbers (decide which asset should own the code) --`);
  duplicateSkus.forEach(([sku, ids]) => console.log(`  ${sku}: ${ids.join("  vs  ")}`));
}
if (draftButTagged.length) {
  console.log(`\n-- Tagged + numbered but still draft (won't reach customers until approved) --`);
  draftButTagged.forEach((r) => console.log(`  ${r.sku.padEnd(10)} ${r.publicId}`));
}

console.log("");
