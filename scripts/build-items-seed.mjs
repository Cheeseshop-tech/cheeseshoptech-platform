// Build the Media Hub items SEED for a tenant from its catalog.json — so EVERY product shows
// weight · pack · milk · age + descriptions without hand-typing each item record.
// Seed values only FILL BLANKS at load time; anything typed in the Media Hub always wins.
//
// Run:  node scripts/build-items-seed.mjs
// Reads  src/data/montitrentini/catalog.json
// Writes src/data/montitrentini/items-seed.json
//
// Re-run whenever catalog.json changes (safe: output is deterministic).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "src/data/montitrentini/catalog.json"), "utf8"));

// "Whole Wheel, 16-18 lbs" -> "16-18 lbs" · "PECORINO WW 14oz" style handled too
function weightFrom(sku) {
  const m = (sku.packing || "").match(/([\d.,]+\s*-\s*[\d.,]+|[\d.,]+)\s*(lbs?|oz|kg|g)\b/i);
  if (m) return `${m[1].replace(/\s+/g, "")} ${m[2].toLowerCase()}`;
  if (sku.pack?.netLb) return `${sku.pack.netLb} lb`;
  return "";
}

function packSizeFrom(sku) {
  const pieces = sku.pack?.piecesPerCase;
  if (!pieces) return "";
  // Lead descriptor from packing ("Whole Wheel", "1/4 Wheel", "7 oz EW"...) when present.
  const form = (sku.packing || "").split(",")[0].trim();
  return form ? `${pieces} × ${form}/case` : `${pieces}/case`;
}

// "aged min. 10 months" -> "min. 10 months" · "aged 60-70 days" -> "60-70 days"
function minAgeFrom(marketing) {
  return (marketing?.age || "").replace(/^aged\s*/i, "").trim();
}

function certificationFrom(product) {
  const hay = `${product.name} ${product.marketing?.badge || ""}`;
  const m = hay.match(/\b(DOP|PDO|IGP|PGI|BIO)\b/i);
  return m ? m[1].toUpperCase() : "";
}

const items = {};
let count = 0;
for (const product of catalog.products || []) {
  const mk = product.marketing || {};
  for (const sku of product.skus || []) {
    if (!sku.code) continue;
    items[sku.code] = {
      sku: sku.code,
      name: product.name || "",
      packSize: packSizeFrom(sku),
      weight: weightFrom(sku),
      upc: "",
      milkType: mk.milk || "",
      minAge: minAgeFrom(mk),
      shortDescription: mk.blurb || "",
      longDescription: "",
      certification: certificationFrom(product),
    };
    count++;
  }
}

// ---- item-reference.json (the availability-sheet truth list, 112 items) --------------------
// Codes NOT in catalog.json still get an identity record: name (title-cased, trailing weight
// moved into the weight field). Media Hub holds the identity for EVERYTHING photographed.
let refCount = 0;
try {
  const ref = JSON.parse(readFileSync(join(root, "src/data/montitrentini/source/item-reference.json"), "utf8"));
  const refMap = ref.items || ref; // the truth list nests the code→name map under .items
  for (const [code, rawName] of Object.entries(refMap)) {
    if (items[code]) continue; // catalog wins — richer record
    const m = String(rawName).match(/^(.*?)\s+([\d.,]+(?:\s*-\s*[\d.,]+)?\s*(?:LBS?|OZ|KG|G))\s*$/i);
    const name = titleCase((m ? m[1] : String(rawName)).trim());
    const weight = m ? m[2].toLowerCase().replace(/\s+/g, " ") : "";
    items[code] = { sku: code, name, packSize: "", weight, upc: "", milkType: "", minAge: "",
      shortDescription: "", longDescription: "", certification: "" };
    refCount++;
  }
} catch { /* reference list optional */ }

function titleCase(s) {
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Dop|Pdo|Igp|Pgi|Bio|Usa|Atm|Sv|Pf|Pdm|Ew|Ww)\b/g, (w) => w.toUpperCase());
}

const out = { version: 2, generatedAt: new Date().toISOString(), source: "catalog.json + item-reference.json", items };
writeFileSync(join(root, "src/data/montitrentini/items-seed.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`items-seed.json: ${count} SKUs from catalog (${catalog.products?.length || 0} products) + ${refCount} identity-only from item-reference`);
