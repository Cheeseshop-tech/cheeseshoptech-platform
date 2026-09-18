// Structural data/image integrity audit across the three sources of truth for one tenant's
// catalog: the ITEM record store (Media Hub → Items, live in Cloudinary Blobs via items-get.js),
// the IMAGE manifest (src/data/<tenant>/images.json, built by sync-images.mjs), and the PRICING
// sheet (src/data/<tenant>/catalog.json). Built 2026-09-17 after a placeholder item (sku "tbd")
// was found live in the Buyer Catalog with a whole-wheel photo in a 7oz-wedge slot — a class of
// bug a script CAN catch (something structural: a placeholder SKU, a missing link, an orphaned
// tag) even though it can't judge whether a photo itself is the right portion/format (that still
// needs an actual look — see docs/CUT_AND_WRAP_PORTION_RULE_2026-09-17.md for that kind of check).
//
// Usage:
//   PORTAL_PASSCODE=<agent gate or admin passcode> node scripts/audit-catalog-integrity.mjs
//   node scripts/audit-catalog-integrity.mjs --offline   # skip the live items fetch, use the
//                                                          local items-seed.json snapshot instead
//                                                          (may be stale vs. the live Blobs store)
//
// Writes docs/CATALOG_INTEGRITY_AUDIT_<today>.md and prints a summary to the console. Exits 1 if
// any HIGH-severity finding exists (placeholder SKU live, or an item with zero photos), so it can
// gate a CI step later without needing another flag.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tenant = process.env.TENANT || "montitrentini";
const folder = process.env.CLOUDINARY_FOLDER || "monti-trentini";
const OFFLINE = process.argv.includes("--offline");

const PLACEHOLDER_SKU = /^(tbd|todo|pending|n\/?a|xxx+|unknown|\?+)$/i;

function readJson(rel) {
  const p = path.join(__dirname, "..", rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

async function loadLiveItems() {
  const passcode = process.env.PORTAL_PASSCODE;
  if (!passcode) {
    console.error(
      "Missing PORTAL_PASSCODE (an admin or Agent Gate passcode) -- run with:\n" +
      "  PORTAL_PASSCODE=<passcode> node scripts/audit-catalog-integrity.mjs\n" +
      "or pass --offline to use the local items-seed.json snapshot instead (may be stale)."
    );
    process.exit(1);
  }
  const base = process.env.PLATFORM_BASE || "https://montitrentini.cheeseshoptech.com";
  const res = await fetch(`${base}/.netlify/functions/items-get?folder=${encodeURIComponent(folder)}&tenant=${encodeURIComponent(tenant)}`, {
    headers: { "x-portal-passcode": passcode },
  });
  if (res.status === 404) return { items: {} }; // no doc saved yet — not this script's problem
  if (!res.ok) { console.error(`items-get ${res.status}: ${await res.text()}`); process.exit(1); }
  return res.json();
}

const itemsDoc = OFFLINE
  ? (readJson(`src/data/${tenant}/items-seed.json`) || { items: {} })
  : await loadLiveItems();
const itemsRaw = itemsDoc.items || itemsDoc; // items-seed.json and items-get.js shapes both work
const items = itemsRaw && !Array.isArray(itemsRaw) ? itemsRaw : {};

const manifest = readJson(`src/data/${tenant}/images.json`);
if (!manifest) { console.error(`No manifest at src/data/${tenant}/images.json -- run sync-images.mjs first.`); process.exit(1); }
const images = manifest.images || [];

const catalog = readJson(`src/data/${tenant}/catalog.json`);
const pricingSkus = new Set();
for (const product of catalog?.products || []) {
  for (const sku of product.skus || []) if (sku.code) pricingSkus.add(String(sku.code));
}

// ---- Build lookups ---------------------------------------------------------------------------
const itemSkus = Object.keys(items);
// 2026-09-18: a spec-sheet PDF (kind: "document") is stored as an image-type Cloudinary asset
// (2026-09-17 migration, for real thumbnails) and carries the same `code` context a real photo
// does -- so it is NOT proof a SKU has a photo. Track photo-kind and document-kind links
// separately; conflating them is exactly how 12 SKUs' spec sheets ended up rendering as their
// "product photo" in Pricing/Proposals/Quote Builder (imageForCode() had the same conflation --
// fixed 2026-09-18, see src/lib/images.js -- this script needs the same fix so it can catch a
// repeat). See docs/PRODUCT_ID_AND_IMAGE_TRUTH_2026-09-18.md.
const imagesByCode = new Map(); // code -> [publicId, ...] (photos only, kind !== "document")
const docsByCode = new Map(); // code -> [publicId, ...] (documents only, e.g. spec sheets)
for (const im of images) {
  if (!im.code) continue;
  const bucket = im.kind === "document" ? docsByCode : imagesByCode;
  if (!bucket.has(im.code)) bucket.set(im.code, []);
  bucket.get(im.code).push(im.publicId);
}

// ---- Checks -----------------------------------------------------------------------------------
const high = [];   // buyer-visible or data-loss-risk problems
const medium = []; // inconsistencies worth a look, not urgent
const info = [];   // asymmetries that may be intentional

for (const sku of itemSkus) {
  const it = items[sku];
  const name = it?.name || "(no name)";
  if (PLACEHOLDER_SKU.test(sku)) {
    high.push(`Placeholder SKU "${sku}" is live in the buyer-facing Items store — "${name}". ` +
      `Give it a real item number (Media Hub → Items → New item, then re-link its photo and delete this one) before it's customer-visible.`);
    continue; // don't also flag "no photo" — a placeholder shouldn't be judged on photo coverage
  }
  if (!imagesByCode.has(sku)) {
    if (docsByCode.has(sku)) {
      high.push(`Item "${sku}" — "${name}" has a spec sheet/document on file but no real photo — ` +
        `Pricing/Proposals/Quote Builder will show no image (correct, not the document) until a real photo is linked.`);
    } else {
      high.push(`No photo linked for item "${sku}" — "${name}".`);
    }
  }
}

for (const [code, publicIds] of imagesByCode) {
  if (!items[code]) {
    medium.push(`Photo(s) tagged for item "${code}" but no matching item record exists: ${publicIds.join(", ")}. ` +
      `Either the item was deleted and the photo was never unlinked, or the code was mistyped when tagging.`);
  }
}

for (const code of pricingSkus) {
  if (!items[code]) info.push(`SKU "${code}" is on the price list (catalog.json) but has no item record (name/description/photo) yet.`);
}
for (const sku of itemSkus) {
  if (!PLACEHOLDER_SKU.test(sku) && !pricingSkus.has(sku)) info.push(`Item "${sku}" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).`);
}

// ---- Report -------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const lines = [
  `# Catalog integrity audit — ${tenant} — ${today}`,
  "",
  `Sources checked: item store (${OFFLINE ? "local items-seed.json snapshot, possibly stale" : "live items-get.js"}), ` +
  `image manifest (src/data/${tenant}/images.json), pricing (src/data/${tenant}/catalog.json).`,
  "",
  `**${itemSkus.length} items · ${images.length} images (${imagesByCode.size} distinct codes) · ${pricingSkus.size} priced SKUs.**`,
  "",
  "Structural checks only — a script can tell you a link is missing or a SKU is a placeholder, " +
  "not whether a linked photo is actually the right portion/format. For that, see " +
  "docs/CUT_AND_WRAP_PORTION_RULE_2026-09-17.md's approach: look at the photos.",
  "",
  `## High (${high.length}) — buyer-visible or data-loss risk`,
  ...(high.length ? high.map((l) => `- ${l}`) : ["- none"]),
  "",
  `## Medium (${medium.length}) — inconsistent, worth a look`,
  ...(medium.length ? medium.map((l) => `- ${l}`) : ["- none"]),
  "",
  `## Info (${info.length}) — asymmetries that may be intentional`,
  ...(info.length ? info.map((l) => `- ${l}`) : ["- none"]),
  "",
];
const outPath = path.join(__dirname, `../docs/CATALOG_INTEGRITY_AUDIT_${today}.md`);
fs.writeFileSync(outPath, lines.join("\n"));

console.log(`Wrote ${outPath}`);
console.log(`High: ${high.length} · Medium: ${medium.length} · Info: ${info.length}`);
high.forEach((l) => console.log(`  [HIGH] ${l}`));
medium.forEach((l) => console.log(`  [MED]  ${l}`));

process.exit(high.length ? 1 : 0);
