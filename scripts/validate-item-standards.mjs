// Item standards validator — the gate that has to pass BEFORE a code, an asset tag, or an item
// record is created anywhere (Cloudinary, Media Hub, catalog.json).
//
// Written 2026-09-18 after item "04108" was found live in the Buyer Catalog. 04108 is not a Monti
// item number: it exists nowhere except as a `code` tag on one Cloudinary photo, and the photo is
// a 300 g ATM pack, not a 7 oz wedge. It got there because an automated pass parsed the trailing
// number out of the filename `le-malghe-di-vezzena-300g-atm-usa-04108-13aj1e` and trusted it —
// no check against the price list. The "70z" typo in that asset's title then propagated into the
// spec line a buyer could read.
//
// Rule 1 (the gate): A CODE IS REAL ONLY IF THE LIVE PRICE LIST CARRIES IT. Never mint a code from
// a filename, a title, a folder name, or an inference. If catalog.json doesn't have it, it is not
// an item — it's an untagged photo, and that is the correct state until Inventory assigns a number.
//
// Rule 2 (the format): the buyer-facing spec line is `weight · packSize · milkType · minAge`
// (src/lib/items.js specLine). Rick's standard, 2026-09-18, is 04182's shape exactly:
//     7 oz · 12 × 7 oz Exact Weight Wedges/case · Cow milk · min 5 months
//
// Usage:
//   node scripts/validate-item-standards.mjs [--live] [--all]
//     (default)  offline — reads the items-seed.json snapshot
//     --live     reads the real Media Hub items doc (needs PORTAL_PASSCODE); REQUIRED to catch
//                records that exist only in Media Hub and never landed in the repo — which is
//                exactly how 04108 stayed invisible to every offline audit.
//     --all      apply the format checks to every item, not just the precut line
//
// Exits 1 on any HIGH finding, so it can gate CI or a pre-commit hook later.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tenant = process.env.TENANT || "montitrentini";
const folder = process.env.CLOUDINARY_FOLDER || "monti-trentini";
const LIVE = process.argv.includes("--live");
const ALL = process.argv.includes("--all");

const read = (rel) => {
  const p = path.join(__dirname, "..", rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

// ---- Rule 1 corpus: the live price list, via catalog.json -------------------------------------
const catalog = read(`src/data/${tenant}/catalog.json`);
if (!catalog) { console.error(`No catalog.json for ${tenant}.`); process.exit(1); }
const REAL = new Set();
for (const p of catalog.products || []) for (const s of p.skus || []) if (s.code) REAL.add(String(s.code));

const priceList = read(`src/data/${tenant}/source/pricelist-2026-03-live.json`);
const PRECUT = new Set();
if (priceList) {
  for (const i of priceList.cutAndWrap?.items || []) if (i.code && i.code !== "tbd") PRECUT.add(i.code);
  for (const i of priceList.apericheese?.items || []) if (i.code) PRECUT.add(i.code);
}

// ---- The item store --------------------------------------------------------------------------
async function loadLiveItems() {
  // Either name works: AGENT_GATE_PASSCODE is the automation credential (2026-09-17), and
  // _write-guard.js accepts it on the same x-portal-passcode header as an admin passcode.
  const passcode = process.env.AGENT_GATE_PASSCODE || process.env.PORTAL_PASSCODE;
  if (!passcode) {
    console.error("--live needs AGENT_GATE_PASSCODE (or PORTAL_PASSCODE) in the environment.\n" +
      "Easiest: double-click \"VALIDATE ITEMS LIVE.command\" — it prompts for it without echoing,\n" +
      "so the value never lands in a file, a transcript, or your shell history.");
    process.exit(1);
  }
  const base = process.env.PLATFORM_BASE || "https://montitrentini.cheeseshoptech.com";
  const res = await fetch(
    `${base}/.netlify/functions/items-get?folder=${encodeURIComponent(folder)}&tenant=${encodeURIComponent(tenant)}`,
    { headers: { "x-portal-passcode": passcode } });
  if (res.status === 404) return { items: {} };
  if (!res.ok) { console.error(`items-get ${res.status}: ${await res.text()}`); process.exit(1); }
  return res.json();
}
const doc = LIVE ? await loadLiveItems() : (read(`src/data/${tenant}/items-seed.json`) || { items: {} });
const items = doc.items && !Array.isArray(doc.items) ? doc.items : {};

const manifest = read(`src/data/${tenant}/images.json`);
const images = manifest?.images || [];

// ---- Rule 2: the format --------------------------------------------------------------------
// The × is U+00D7, not the letter x. "oz"/"lb" lowercase. Milk is "<Animal> milk", capitalised.
// minAge carries the producer's MINIMUM, so it reads "min N months" — or "N–M months" for a
// genuine range (en dash, not a hyphen). Blank and "—" both fail: an empty age renders a spec
// line that just stops, and a buyer reads that as "unknown", not "not applicable".
const FORMAT = {
  weight:    { re: /^\d+(\.\d+)?\s(oz|lb|g|kg)$/,                         eg: "7 oz" },
  packSize:  { re: /^\d+\s×\s.+\/case$/,                                  eg: "12 × 7 oz Exact Weight Wedges/case" },
  milkType:  { re: /^(Cow|Sheep|Goat|Buffalo|Mixed) milk$/,               eg: "Cow milk" },
  minAge:    { re: /^(min\s\d+(\.\d+)?|\d+–\d+)\s(day|days|month|months)$/, eg: "min 5 months  ·  6–8 months" },
};
// A descriptor that belongs in its own field, not in a name or a pack string.
const DESCRIPTOR_IN_TEXT = /\((ATM|SV|PF|vac|vacuum)\)|\b(aged|stagionat\w*)\b/i;

const high = [], medium = [], low = [];

// ---- Check 1 (HIGH): every tagged asset code must be a real SKU -----------------------------
const seenPhantom = new Map();
for (const im of images) {
  const code = im.code || im.sku;
  if (!code) continue;                       // untagged is fine — that's the honest state
  if (REAL.has(code)) continue;
  if (!seenPhantom.has(code)) seenPhantom.set(code, []);
  seenPhantom.get(code).push(im.publicId);
}
for (const [code, ids] of seenPhantom) {
  // A suffixed code (30014-back) is the filename-parsing bug in its most obvious form: the sync
  // took "<code>-<suffix>" whole. The photo is real and belongs on the base item — it just needs
  // the base code plus the matching usage tag, which already exists in USAGE (back-shot).
  const suffix = /^(\d{4,6})-([a-z-]+)$/.exec(code);
  if (suffix && REAL.has(suffix[1])) {
    high.push(`PHANTOM CODE "${code}" — this is "${suffix[1]}" with "-${suffix[2]}" parsed into the code. ` +
      `The photo is real and belongs on item ${suffix[1]}; right now it is orphaned onto a code that ` +
      `does not exist, so it never shows as that item's second photo. Fix in Media Hub: set the SKU to ` +
      `"${suffix[1]}" and add the "${suffix[2] === "back" ? "back-shot" : suffix[2]}" usage tag. Asset: ${ids.join(", ")}.`);
    continue;
  }
  high.push(`PHANTOM CODE "${code}" — tagged on ${ids.length} asset(s) but absent from catalog.json, ` +
    `so it is not a real item number. The Buyer Catalog will still render a card for it. ` +
    `Assets: ${ids.join(", ")}. Fix: unlink the code in Media Hub (keep the file), or have ` +
    `Inventory assign a real number and add it to the price list first.`);
}

// ---- Check 2 (HIGH): every item record must correspond to a real SKU ------------------------
for (const sku of Object.keys(items)) {
  if (!REAL.has(sku)) {
    high.push(`PHANTOM ITEM RECORD "${sku}" — "${items[sku]?.name || "(no name)"}" exists in the ` +
      `item store but not in catalog.json. It is buyer-visible and quotes against nothing.`);
  }
}

// ---- Check 3 (MEDIUM): spec-line format on the precut line ----------------------------------
// Do NOT pre-filter to codes that have a record: the whole point is to catch a price-list item
// with NO item record, which renders no spec line at all. (Bug found 2026-09-18 on the first
// live run -- the filter made the "has no item record" branch below unreachable.)
const scope = ALL ? Object.keys(items) : [...PRECUT];
for (const sku of scope.sort()) {
  const it = items[sku];
  if (!it) { medium.push(`${sku} is on the price list but has no item record — no spec line can render.`); continue; }
  for (const [field, { re, eg }] of Object.entries(FORMAT)) {
    const v = (it[field] ?? "").toString().trim();
    if (!v || v === "—") {
      medium.push(`${sku} ${field} is ${v ? `"${v}"` : "blank"} — the spec line renders incomplete. Expected e.g. "${eg}".`);
    } else if (!re.test(v)) {
      medium.push(`${sku} ${field} = "${v}" does not match the standard. Expected e.g. "${eg}".`);
    }
  }
  if (DESCRIPTOR_IN_TEXT.test(it.packSize || "")) {
    low.push(`${sku} packSize "${it.packSize}" carries a packaging/age descriptor. Pack size is count × unit; ` +
      `packaging type and age belong in their own fields (docs/PRODUCT_NAMING_STANDARD_2026-09-18.md).`);
  }
}

// ---- Check 4 (LOW): descriptors in names ----------------------------------------------------
const NAME_DESCRIPTOR = /\b(\d+\s?oz|\d+\s?lbs?|EW|EWW|exact weight|wedge|wheel|1\/[248]|vacuum|ATM)\b/i;
for (const sku of scope.sort()) {
  const n = items[sku]?.name || "";
  if (NAME_DESCRIPTOR.test(n)) {
    low.push(`${sku} name "${n}" carries a format descriptor. The name identifies the cheese; ` +
      `format lives in packSize/weight.`);
  }
}

// ---- Check 5 (HIGH/MEDIUM): duplicates and ghost numbers -------------------------------------
// Rick, 2026-09-18: "check for any other duplicate product item cards and ghost item numbers."
// Two cards for one cheese is how 04108 was spotted in the first place -- the buyer sees the same
// product twice and cannot tell which to order.

// 5a. Two item records whose names collapse to the same cheese once descriptors are stripped.
//     (Per the naming standard: format, age and pack are descriptors, not part of the name.)
const nameKey = (n) => (n || "")
  .toLowerCase()
  .replace(/\b(\d+(\.\d+)?\s?(oz|lb|lbs|g|kg)|ew|eww|exact weight|wedges?|wheels?|1\/[248]|whole|vacuum|vac|packed|atm|sv|pf|aged|stagionat\w*|min\.?|months?|days?|\d+)\b/g, " ")
  .replace(/[^a-z]+/g, " ").trim();
const byName = new Map();
for (const [sku, it] of Object.entries(items)) {
  const k = nameKey(it?.name);
  if (!k) continue;
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(sku);
}
const nameCollisions = [];
for (const [k, skus] of byName) {
  if (skus.length < 2) continue;
  const ghost = skus.filter((x) => !REAL.has(x));
  const real = skus.filter((x) => REAL.has(x));
  // A ghost sharing a real item's name IS a duplicate card -- the same cheese twice, one of them
  // unorderable. This is the 04197/04208-vs-04176 shape, and the 04108-vs-04182 shape.
  if (ghost.length && real.length) {
    high.push(`DUPLICATE CARD — ${ghost.map((x) => `"${x}" (${items[x].name})`).join(", ")} ` +
      `duplicate${ghost.length > 1 ? "" : "s"} real SKU ${real.map((x) => `${x} "${items[x].name}"`).join(", ")}: ` +
      `same cheese, but the ghost has no price-list SKU so it cannot be ordered. Remove the ghost.`);
    continue;
  }
  // Several REAL SKUs sharing a name is not a duplicate -- Grana Padano genuinely has eight
  // formats. It is the naming problem: the name alone does not tell a buyer which one they are
  // looking at. Collected and reported once rather than as N separate findings.
  if (real.length > 1 && !skus.some((x) => (items[x].packSize || "") === "" )) {
    const packs = new Set(real.map((x) => items[x].packSize || ""));
    if (packs.size < real.length) {
      high.push(`DUPLICATE CARD — ${real.join(", ")} share BOTH a name and a pack size ` +
        `("${items[real[0]].name}" · "${items[real[0]].packSize}"). Indistinguishable to a buyer.`);
      continue;
    }
    nameCollisions.push(`${items[real[0]].name} → ${real.join(", ")}`);
  }
}
if (nameCollisions.length) {
  medium.push(`NAMES DO NOT DISTINGUISH FORMATS — ${nameCollisions.length} product families where ` +
    `several real SKUs carry the identical name and differ only by pack size. Not duplicates; each ` +
    `is a genuine format. But the catalog shows the same name several times over, so the buyer has ` +
    `to read the spec line to tell them apart. This is the naming standard's job, not a data error: ` +
    `${nameCollisions.join("  ·  ")}`);
}

// 5b. Two items sharing one UPC — different products, one barcode, mis-scans at retail.
const byUpc = new Map();
for (const [sku, it] of Object.entries(items)) {
  const u = String(it?.upc || "").replace(/\D/g, "");
  if (!u) continue;
  if (!byUpc.has(u)) byUpc.set(u, []);
  byUpc.get(u).push(sku);
}
for (const [u, skus] of byUpc) {
  if (skus.length > 1) high.push(`DUPLICATE UPC ${u} on ${skus.length} items: ` +
    skus.map((s) => `${s} "${items[s].name}"`).join("  ·  ") + `. Two products, one barcode.`);
}

// 5c. One photo serving more than one code.
const byAsset = new Map();
for (const im of images) {
  const c = im.code || im.sku;
  if (!c) continue;
  if (!byAsset.has(im.publicId)) byAsset.set(im.publicId, new Set());
  byAsset.get(im.publicId).add(c);
}
for (const [pid, codes] of byAsset) {
  if (codes.size > 1) medium.push(`SHARED ASSET — ${pid} is tagged to ${[...codes].join(", ")}. ` +
    `One photo standing in for several items hides a missing packshot.`);
}

// 5d. Ghost numbers. Pure edit distance is useless at this code density -- a 5-digit code sits
//     within two characters of a dozen real ones. The signal that actually caught every numbering
//     error this project has hit is a phantom code whose NAME matches a real item's: 04197 next to
//     04176, 03047 next to 03073, 40176 next to 04176. Same cheese, unlisted number.
const dist = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
};
const ghostCodes = [...new Set([...seenPhantom.keys(), ...Object.keys(items).filter((x) => !REAL.has(x))])];
for (const g of ghostCodes.sort()) {
  if (!/^\d{4,6}$/.test(g)) continue;                 // suffixed codes already reported above
  const twin = [...REAL].filter((r) => r.length === g.length && dist(g, r) === 1).sort();
  if (!twin.length) continue;
  const gName = nameKey(items[g]?.name);
  const sameCheese = twin.filter((r) => gName && nameKey(items[r]?.name) === gName);
  if (sameCheese.length) {
    high.push(`GHOST NUMBER "${g}" (${items[g]?.name}) is one character from ${sameCheese.join(", ")} ` +
      `AND names the same cheese. Almost certainly a mis-key of that SKU, not a new item.`);
  } else {
    low.push(`"${g}" is one character from real SKU ${twin.join(", ")}. Different product names, so ` +
      `probably coincidence — worth a glance if it has no other provenance.`);
  }
}

// ---- Report ---------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const mode = LIVE ? "LIVE item store" : "OFFLINE items-seed.json snapshot";
const lines = [
  `# Item standards validation — ${tenant} — ${today}`, "",
  `Mode: **${mode}**${LIVE ? "" : "  \n⚠️ Offline mode cannot see item records that exist only in Media Hub. " +
    "04108 hid from every offline audit for exactly this reason — re-run with `--live` before trusting a clean result."}`, "",
  `Corpus: ${REAL.size} real SKUs (catalog.json) · ${Object.keys(items).length} item records · ` +
  `${images.length} assets · ${PRECUT.size} precut line items.`, "",
  `## HIGH (${high.length}) — a phantom item number, buyer-visible`,
  ...(high.length ? high.map((l) => `- ${l}`) : ["- none"]), "",
  `## MEDIUM (${medium.length}) — spec line off-standard`,
  ...(medium.length ? medium.map((l) => `- ${l}`) : ["- none"]), "",
  `## LOW (${low.length}) — descriptors in the wrong field`,
  ...(low.length ? low.map((l) => `- ${l}`) : ["- none"]), "",
];
const out = path.join(__dirname, `../docs/ITEM_STANDARDS_VALIDATION_${today}.md`);
fs.writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out}`);
console.log(`Mode: ${mode}`);
console.log(`HIGH: ${high.length} · MEDIUM: ${medium.length} · LOW: ${low.length}`);
high.forEach((l) => console.log(`  [HIGH] ${l}`));
process.exit(high.length ? 1 : 0);
