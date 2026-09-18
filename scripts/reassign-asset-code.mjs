// Re-home one media asset onto a different item number, through the Media Hub's authenticated,
// audit-logged write path (media-list read → media-update write). Never touches the Cloudinary
// Admin API directly — see docs and the 2026-09-17 standing rule: only the Media Hub path logs
// who changed what.
//
// Written 2026-09-18. First use: the Asiago Vecchio Scheda filed as `monti/03073-specsheet` is
// the WHOLE WHEEL spec (1 per carton, 360-day shelf life, EAN part number 2003003), not the 7 oz
// Exact Weight Wedge it was tagged to. Item 03073 is the 12-count 7 oz case; item 03003 is the
// 16-18 lb whole wheel. The document was correct all along — it was pointed at the wrong card.
// So this is a re-home, not a deletion: 03003 gains the first whole-wheel Scheda on file, and
// 03073's own sheet stays on the open request to Monti.
//
// The join key is the Cloudinary context `sku` field, NOT the filename. `monti/03073-specsheet`
// keeps its public ID (renaming would break the delivery URLs already in the manifest); the
// public ID is not consulted by imageForCode() or the Buyer Catalog. Note though that
// sync-images.mjs and media-list.js BOTH fall back to parsing a legacy-folder filename into a
// SKU when context carries none — the defect that invented item "04108". That fallback only
// fires on an EMPTY context sku, so an explicit 03003 here is stable across every future sync.
//
// Usage:
//   node scripts/reassign-asset-code.mjs --asset <publicId> --to <code> [--caption "..."]
//     (default)  DRY RUN — prints the before/after and exits without writing
//     --apply    performs the write
//
// Needs AGENT_GATE_PASSCODE (or PORTAL_PASSCODE). Use the REASSIGN ASSET CODE.command button so
// the passcode is read silently and never lands in a file, a commit, or your shell history.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

const tenant = process.env.TENANT || "montitrentini";
const folder = process.env.CLOUDINARY_FOLDER || "monti-trentini";
const base = process.env.PLATFORM_BASE || "https://montitrentini.cheeseshoptech.com";
const APPLY = argv.includes("--apply");
const assetId = arg("--asset");
const toCode = arg("--to");
const newCaption = arg("--caption");

if (!assetId || !toCode) {
  console.error("Usage: node scripts/reassign-asset-code.mjs --asset <publicId> --to <code> [--caption \"...\"] [--apply]");
  process.exit(1);
}

const passcode = process.env.AGENT_GATE_PASSCODE || process.env.PORTAL_PASSCODE;
if (!passcode) {
  console.error("Missing AGENT_GATE_PASSCODE (or PORTAL_PASSCODE). Run REASSIGN ASSET CODE.command instead.");
  process.exit(1);
}

const readJson = (rel) => {
  const p = path.join(__dirname, "..", rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

// ---- Rule 1 gate: the destination must be a real item number on the live price list ----------
// Same rule the item-standards validator enforces. A code is real only if catalog.json carries
// it; anything else is a number somebody inferred, and inferring numbers is how this started.
const catalog = readJson(`src/data/${tenant}/catalog.json`);
if (!catalog) { console.error(`No catalog.json for ${tenant}.`); process.exit(1); }
let dest = null;
for (const p of catalog.products || []) {
  for (const s of p.skus || []) {
    if (String(s.code) === String(toCode)) dest = { product: p.name, packing: s.packing, pack: s.pack };
  }
}
if (!dest) {
  console.error(`REFUSED: "${toCode}" is not in catalog.json, so it is not a real item number.`);
  console.error(`Have Inventory assign a number and get it onto the price list before tagging anything to it.`);
  process.exit(1);
}

// ---- Read the asset's CURRENT state ----------------------------------------------------------
// media-update REPLACES tags and context wholesale, so every field we are not changing has to be
// read first and sent back verbatim. Skipping this is how an update silently strips an asset's
// approval state and usage tags.
const legacyFolders = (() => {
  const cfg = readJson(`config/clients/${tenant}.json`);
  return cfg?.cloudinaryLegacyFolders || [];
})();
const legacyParam = legacyFolders.length ? `&legacy=${encodeURIComponent(legacyFolders.join(","))}` : "";
const listUrl = `${base}/.netlify/functions/media-list?folder=${encodeURIComponent(folder)}&tenant=${encodeURIComponent(tenant)}${legacyParam}`;

const listRes = await fetch(listUrl, { headers: { "x-portal-passcode": passcode } });
if (!listRes.ok) { console.error(`media-list ${listRes.status}: ${await listRes.text()}`); process.exit(1); }
const listBody = await listRes.json();
// media-list FULL mode returns a bare array; the paged mode wraps it in { assets }. Handle both.
const assets = Array.isArray(listBody) ? listBody : (listBody.assets || listBody.images || []);
const asset = assets.find((a) => a.publicId === assetId);
if (!asset) {
  console.error(`Asset "${assetId}" not found in the live library (${assets.length} assets scanned).`);
  process.exit(1);
}

const from = asset.sku || "(none)";
const caption = newCaption != null ? newCaption : asset.title;

console.log(`Asset      ${assetId}`);
console.log(`Item code  ${from}  →  ${toCode}`);
console.log(`Destination ${dest.product} · ${dest.packing} · ${dest.pack?.piecesPerCase ?? "?"}/carton · ${dest.pack?.shelfDays ?? "?"}-day shelf`);
console.log(`Caption    ${asset.title || "(none)"}${newCaption != null && newCaption !== asset.title ? `  →  ${newCaption}` : ""}`);
console.log(`Preserved  approval=${asset.approvalState} · usage=[${(asset.usage || []).join(", ")}] · bgRemoved=${!!asset.bgRemoved}`);
console.log(`           alt="${asset.alt || ""}" · description="${asset.description || ""}"`);
console.log();

if (!APPLY) {
  console.log("DRY RUN — nothing written. Re-run with --apply to perform the change.");
  process.exit(0);
}

// ---- Write ------------------------------------------------------------------------------------
const payload = {
  tenant,
  publicId: assetId,
  sku: String(toCode),
  displayName: caption,
  alt: asset.alt || "",
  description: asset.description || "",
  usage: asset.usage || [],
  approvalState: asset.approvalState,
  bgRemoved: !!asset.bgRemoved,
};
const res = await fetch(`${base}/.netlify/functions/media-update`, {
  method: "POST",
  headers: { "x-portal-passcode": passcode, "content-type": "application/json" },
  body: JSON.stringify(payload),
});
const out = await res.json().catch(() => ({}));
if (!res.ok) { console.error(`media-update ${res.status}:`, out); process.exit(1); }
console.log(`✅ Live: ${assetId} now carries item ${toCode}.`);

// ---- Keep the repo manifest in step ------------------------------------------------------------
// A targeted patch rather than a full `npm run sync:images`, so the commit diff shows exactly this
// one asset moving and nothing else drifts in alongside it.
const manifestPath = path.join(__dirname, `../src/data/${tenant}/images.json`);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const rec = (manifest.images || []).find((i) => i.publicId === assetId);
  if (rec) {
    rec.code = String(toCode);
    rec.sku = String(toCode);
    if (newCaption != null) rec.title = newCaption;
    // Byte-for-byte the same shape sync-images.mjs writes (indent 1, no trailing newline), so the
    // diff is this one asset and nothing else.
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
    console.log(`✅ Manifest: src/data/${tenant}/images.json updated for ${assetId}.`);
  } else {
    console.log(`⚠️  ${assetId} is not in the repo manifest — run \`npm run sync:images\` to pick it up.`);
  }
}
