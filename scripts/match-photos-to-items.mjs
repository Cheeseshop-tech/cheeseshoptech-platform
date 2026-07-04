// Bulk-match ITEM NUMBERS to photos — closes the "bulk SKU→photo match" open item.
// Media Hub / items.json is the identity truth (name + copy); this script links photos to it.
//
// Matching (conservative — only writes what it can defend):
//   1. KEEP     — existing code that exists in catalog.json.
//   2. TOKEN    — a 4-6 digit token in publicId/orig/title that IS a catalog SKU.
//   3. NAME     — normalized product-name match in the image text, and the product has
//                 exactly ONE SKU (multi-SKU products can't be pack-disambiguated from a photo).
//   4. FIXBAD   — existing code NOT in the catalog, but a TOKEN/NAME match found → replace.
//   Everything else is REPORTED, never guessed.
//
// Run:  node scripts/match-photos-to-items.mjs            (dry run — report only)
//       node scripts/match-photos-to-items.mjs --write    (update images.json + push sku to
//                                                          Cloudinary context via media-update,
//                                                          round-tripping every other field)
//
// media-update REPLACES tags+context wholesale, so --write first pulls each asset's current
// state from media-list and posts it back intact with only `sku` changed.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");
const BASE = process.env.PLATFORM_BASE || "https://montitrentini.cheeseshoptech.com";
const FOLDER = "monti-trentini";

const catalog = JSON.parse(readFileSync(join(root, "src/data/montitrentini/catalog.json"), "utf8"));
const seed = JSON.parse(readFileSync(join(root, "src/data/montitrentini/items-seed.json"), "utf8"));
const imagesPath = join(root, "src/data/montitrentini/images.json");
const manifest = JSON.parse(readFileSync(imagesPath, "utf8"));

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
const STOP = new Set(["dop", "pdo", "igp", "pgi", "bio", "della", "di", "del", "the", "cheese", "monti", "trentini"]);
function tokenize(s) { return norm(s).split(" ").filter((t) => t && !STOP.has(t)); }

// ---- lookups: the item-truth SEED is the SKU universe (catalog ∪ item-reference) ----------
const skuSet = new Set(Object.keys(seed.items || {}));
const skuToName = {};
Object.entries(seed.items || {}).forEach(([c, it]) => { skuToName[c] = it.name || ""; });

// Product-name matching still uses catalog products (they group multi-SKU packs)…
const products = []; // { name, norm, tokens, skus[] }
for (const p of catalog.products || []) {
  const skus = (p.skus || []).map((s) => s.code).filter(Boolean);
  products.push({ name: p.name, norm: norm(p.name), tokens: tokenize(p.name), skus });
}
// …plus reference-only items as single-SKU pseudo-products (their name IS one item).
const catalogCodes = new Set(products.flatMap((p) => p.skus.map(String)));
Object.entries(seed.items || {}).forEach(([c, it]) => {
  if (!catalogCodes.has(c) && it.name) {
    products.push({ name: it.name, norm: norm(it.name), tokens: tokenize(it.name), skus: [c] });
  }
});

// ---- matching ----------------------------------------------------------------------------
function textOf(im) {
  return norm([im.publicId, im.orig, im.title].filter(Boolean).join(" "));
}

function tokenMatch(im) {
  const hay = `${im.publicId || ""} ${im.orig || ""} ${im.title || ""}`;
  const tokens = hay.match(/\d{4,6}/g) || [];
  const hits = [...new Set(tokens.filter((t) => skuSet.has(t)))];
  return hits.length === 1 ? hits[0] : null; // exactly one → confident
}

function nameMatch(im) {
  const text = textOf(im);
  const textTok = new Set(tokenize(text));
  // A product matches when ALL of its core tokens appear in the image text.
  const hits = products.filter((p) => p.tokens.length && p.tokens.every((t) => textTok.has(t)));
  if (hits.length !== 1) return null;
  const p = hits[0];
  return p.skus.length === 1 ? { sku: String(p.skus[0]), product: p.name } : { ambiguous: p };
}

const results = { keep: [], token: [], name: [], fixbad: [], multi: [], none: [] };
for (const im of manifest.images) {
  const cur = im.code ? String(im.code) : null;
  if (cur && skuSet.has(cur)) { results.keep.push(im); continue; }

  const tok = tokenMatch(im);
  const nm = nameMatch(im);
  const found = tok || (nm && nm.sku) || null;

  if (found) {
    (cur ? results.fixbad : tok ? results.token : results.name)
      .push({ im, sku: found, was: cur, name: skuToName[found] });
  } else if (nm && nm.ambiguous) {
    results.multi.push({ im, product: nm.ambiguous.name, skus: nm.ambiguous.skus, was: cur });
  } else {
    results.none.push({ im, was: cur });
  }
}

// ---- report ------------------------------------------------------------------------------
const label = (im) => im.publicId?.split("/").slice(-1)[0] || im.orig;
console.log(`images: ${manifest.images.length} · already linked: ${results.keep.length}`);
console.log(`\nTOKEN matches (${results.token.length}):`);
results.token.forEach((r) => console.log(`  ${r.sku}  ${skuToName[r.sku]}  ←  ${label(r.im)}`));
console.log(`\nNAME matches — single-SKU products (${results.name.length}):`);
results.name.forEach((r) => console.log(`  ${r.sku}  ${r.name}  ←  ${label(r.im)}`));
console.log(`\nBAD code fixed (${results.fixbad.length}):`);
results.fixbad.forEach((r) => console.log(`  ${r.was} → ${r.sku}  ${r.name}  ←  ${label(r.im)}`));
console.log(`\nAMBIGUOUS — product matched but has multiple SKUs (${results.multi.length}) → assign in Media Hub:`);
results.multi.forEach((r) => console.log(`  ${r.product} [${r.skus.join(", ")}]  ←  ${label(r.im)}${r.was ? `  (bad code ${r.was})` : ""}`));
console.log(`\nNO match (${results.none.length}):`);
results.none.forEach((r) => console.log(`  ${label(r.im)}${r.was ? `  (bad code ${r.was})` : ""}`));

const writes = [...results.token, ...results.name, ...results.fixbad];
if (!WRITE) {
  console.log(`\nDry run. ${writes.length} link(s) would be written. Re-run with --write to apply.`);
  process.exit(0);
}

// ---- write: images.json + Cloudinary context (round-trip via media-list/media-update) -----
console.log(`\nWriting ${writes.length} link(s)…`);
const live = await (await fetch(`${BASE}/.netlify/functions/media-list?folder=${FOLDER}`)).json();
const liveById = {};
(live.assets || live).forEach((a) => { liveById[a.publicId] = a; });

let pushed = 0, skipped = 0;
for (const r of writes) {
  r.im.code = r.sku;
  r.im.sku = r.sku;
  const a = liveById[r.im.publicId];
  if (!a) { skipped++; console.log(`  ! not on Cloudinary (bundled only): ${r.im.publicId}`); continue; }
  // Round-trip EVERYTHING media-update replaces; change only sku.
  const res = await fetch(`${BASE}/.netlify/functions/media-update`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publicId: a.publicId,
      displayName: a.title,
      usage: a.usage || [],
      approvalState: a.approvalState,
      alt: a.alt || "",
      description: a.description || "",
      sku: r.sku,
    }),
  });
  if (res.ok) pushed++;
  else console.log(`  ! media-update ${res.status} for ${a.publicId}`);
}

writeFileSync(imagesPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`images.json updated. Cloudinary context: ${pushed} pushed, ${skipped} bundled-only.`);
console.log("Durable: sync-images.mjs re-reads these from context — matches survive a re-sync.");
