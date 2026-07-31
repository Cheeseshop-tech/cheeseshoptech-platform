#!/usr/bin/env node
/* sync-inventory.mjs — regenerate inventory.json from the Monti Trentini
   "Availability of items and pending orders" sheet (exported to CSV).

   Pipeline (Path A, session-driven): Claude exports the live Google Sheet to
   src/data/montitrentini/source/availability_<YYYY-MM-DD>.csv, then runs this
   script to produce inventory.json in the canonical schema (v1.2) that
   pricing-core.js consumes (skus[code].lots[] with status/expDate/reserved).

   The sheet's first tab holds TWO side-by-side tables:
     cols 0..6  = per-SKU summary  (Item, Description, Cases Available,
                  Suggested USA, Suggested ITA, Confirmed, Comments)
     col  7     = spacer
     cols 8..16 = lot detail (Item, Description, Lot#, Receipt Date,
                  Cases Available, Reserved, Comments, Net Available, Expiration)

   Usage:
     node scripts/sync-inventory.mjs [--in <csv>] [--out <json>] [--quiet]
                                     [--check | --promote] [--require-drive-meta]
   --require-drive-meta: hard-fail (exit 4) if the Drive sidecar is missing, so an
   unattended run can never publish the sheet's hand-typed date. Use it in cron.
   Defaults: newest source/availability_*.csv  ->  inventory.json
   Safe-by-default for review: pass --out inventory.NEW.json to avoid replacing.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../src/data/montitrentini");
const SRC_DIR = path.join(DATA_DIR, "source");

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const QUIET = args.includes("--quiet");
const log = (...a) => { if (!QUIET) console.log(...a); };

function newestCsv() {
  if (!fs.existsSync(SRC_DIR)) return null;
  const files = fs.readdirSync(SRC_DIR).filter((f) => /^availability_.*\.csv$/i.test(f)).sort();
  return files.length ? path.join(SRC_DIR, files[files.length - 1]) : null;
}
const IN = getArg("--in") || newestCsv();
const OUT = path.resolve(getArg("--out") ? path.join(DATA_DIR, getArg("--out")) : path.join(DATA_DIR, "inventory.json"));
if (!IN || !fs.existsSync(IN)) { console.error("No input CSV found. Pass --in <path> or place source/availability_*.csv"); process.exit(1); }

// ---- tiny CSV parser (handles quoted fields w/ commas + escaped quotes) ----
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---- helpers --------------------------------------------------------------
const MONTHS = { jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06",
  jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12" };
const TODAY = new Date();

const clean = (s) => (s == null ? "" : String(s).trim());

// "03/23/2026" -> "2026-03-23"
function isoFromMDY(s) {
  const m = clean(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
// "ETA 07/02" (no year) -> "2026-07-02", inferring nearest sensible year
function isoFromEta(s) {
  const m = clean(s).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const mo = +m[1], d = +m[2];
  let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : TODAY.getFullYear();
  if (!m[3]) {
    // ETA is a near-future date; if it lands >6 months before today, roll forward
    const cand = new Date(y, mo - 1, d);
    if ((TODAY - cand) / 86400000 > 183) y += 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
// "May-27" / "Feb-27" -> "2027-05" (month-year only; kept for display)
function monthYear(s) {
  const m = clean(s).match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase()];
  return mo ? `20${m[2]}-${mo}` : null;
}
const num = (s) => {
  const t = clean(s).replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const intOr0 = (s) => { const n = num(s); return n == null ? 0 : Math.trunc(n); };

// ---- read & split ---------------------------------------------------------
const raw = fs.readFileSync(IN, "utf8");
const rows = parseCsv(raw);

// capture "Updated on: 18 June 2026 16:47" from the banner row.
// The banner shows up in two formats depending on how MT typed it that week:
//   written-out, day-first  : "28 July 2026"      (European style)
//   numeric, month-first    : "7/30/2026 12:00 PM" (American style, M/D/YYYY)
// Both must resolve to the SAME ISO date convention (YYYY-MM-DD) before this
// value is ever compared against anything else. Get the numeric case wrong —
// e.g. read "7/30" as day=7/month=30 the European way — and it either throws
// (no month 30) or silently produces a bogus date that then falsely disagrees
// with Drive's real mtime. So: numeric banner dates are ALWAYS interpreted
// American (first number = month), matching how Monti Trentini's team writes
// them. This translation must happen right here, before lastUpdated is used
// for any downstream comparison ("date authentication").
let lastUpdated = TODAY.toISOString().slice(0, 10);
let bannerParsed = false;
const banner = rows.find((r) => r.some((c) => /updated on/i.test(c)));
if (banner) {
  const idx = banner.findIndex((c) => /updated on/i.test(c));
  const val = clean(banner[idx + 1]);

  // 1) written-out day-first form: "28 July 2026"
  const written = val.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (written) {
    const mo = MONTHS[written[2].slice(0, 3).toLowerCase()];
    if (mo) {
      lastUpdated = `${written[3]}-${mo}-${written[1].padStart(2, "0")}`;
      bannerParsed = true;
    }
  }

  // 2) numeric American form: "7/30/2026" or "7/30/2026 12:00 PM"
  //    First number is the MONTH, not the day — do not swap these.
  if (!bannerParsed) {
    const numeric = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (numeric) {
      const [, moStr, dStr, yStr] = numeric;
      const mo = Number(moStr), d = Number(dStr);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        lastUpdated = `${yStr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        bannerParsed = true;
      }
    }
  }

  if (!bannerParsed) {
    console.warn(`! Banner text "${val}" didn't match a known date format — lastUpdated defaulted to today (${lastUpdated}). Add a case for this format instead of trusting the default.`);
  }
}

// ---- authoritative "last updated": Google Drive modifiedTime --------------
// The banner cell above is hand-typed on the weekly refresh, which fails twice:
// it misses the intermittent mid-week corrections MT makes, and it carries
// typos straight into the buyer catalog. On 2026-07-25 it read "28 July 2026"
// — three days in the future — while Drive's modifiedTime for the sheet was
// 2026-07-24T15:53:09Z. A future date also makes agency-console's stock-age
// calculation go negative.
//
// Drive's timestamp is the source of truth. It reaches this script through a
// sidecar written at export time, so the script stays runnable offline with no
// Drive credentials:
//     source/availability_<YYYY-MM-DD>.meta.json
//     { "driveFileId": "1meZQQ…", "driveModifiedTime": "2026-07-24T15:53:09.134Z",
//       "sheetOwner": "order@montitrentini-usa.com", "exportedAt": "…" }
// Absent the sidecar it falls back to the banner and says so.
//
// NOTE: this Drive connector exposes modifiedTime and the file OWNER, but not
// lastModifyingUser — so "when" is exact, "who" is the sheet owner, not the
// individual editor. Wiring the Sheets revisions API would close that gap.
const localDate = (iso) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

const sheetStatedUpdate = lastUpdated;          // whatever the banner claimed
let lastUpdatedSource = "sheet-banner";
let driveModifiedTime = null, driveFileId = null, sheetOwner = null;

const META = IN.replace(/\.csv$/i, ".meta.json");
if (fs.existsSync(META)) {
  try {
    const meta = JSON.parse(fs.readFileSync(META, "utf8"));
    if (meta.driveModifiedTime) {
      driveModifiedTime = meta.driveModifiedTime;
      driveFileId = meta.driveFileId || null;
      sheetOwner = meta.sheetOwner || null;
      lastUpdated = localDate(driveModifiedTime);
      lastUpdatedSource = "drive-modifiedTime";
    }
  } catch (e) {
    console.warn(`! ${path.basename(META)} unreadable (${e.message}) — falling back to the sheet banner.`);
  }
} else {
  console.warn(`! No ${path.basename(META)} beside the CSV — using the hand-typed banner (${sheetStatedUpdate}).`);
  console.warn(`  Write the sidecar at export time so mid-week corrections aren't missed.`);
}

// Unattended runs must never fall back to the banner in silence. The scheduled
// "Monti inventory watch" runs at 08:00 with nobody reading stdout, and a fresh
// session may not have the Google Drive connector available at all — in which
// case no sidecar can be written. Pass --require-drive-meta there so the run
// STOPS rather than publishing a hand-typed (possibly typo'd) date to the live
// buyer catalog. Exit 4 = "Drive metadata required but unavailable".
if (args.includes("--require-drive-meta") && lastUpdatedSource !== "drive-modifiedTime") {
  console.error("");
  console.error("x DRIVE METADATA REQUIRED BUT MISSING — refusing to continue.");
  console.error(`x   expected sidecar: ${path.relative(process.cwd(), META)}`);
  console.error("x   Without it lastUpdated falls back to the sheet's hand-typed banner,");
  console.error("x   which is exactly the value this flag exists to keep off the live catalog.");
  console.error("x   Write the sidecar at export time:");
  console.error('x     { "driveFileId": "...", "driveModifiedTime": "<ISO>", "sheetOwner": "..." }');
  console.error("");
  process.exit(4);
}

if (driveModifiedTime && sheetStatedUpdate !== lastUpdated) {
  const future = sheetStatedUpdate > TODAY.toISOString().slice(0, 10);
  const bar = "!".repeat(66);
  console.warn("");
  console.warn(bar);
  console.warn("!  SHEET BANNER DISAGREES WITH GOOGLE DRIVE");
  console.warn(`!    banner says : ${sheetStatedUpdate}${future ? "   <-- IN THE FUTURE, almost certainly a typo" : ""}`);
  console.warn(`!    Drive says  : ${lastUpdated}   (${driveModifiedTime})`);
  console.warn("!  Using Drive — the banner is typed by hand, Drive is the file's real mtime.");
  console.warn("!  A large gap means the sheet was edited without the banner being updated.");
  console.warn(bar);
  console.warn("");
}

// find header row (the one starting with "Item")
const hIdx = rows.findIndex((r) => clean(r[0]).toLowerCase() === "item");
const dataRows = rows.slice(hIdx + 1);

const skus = {};
function ensure(code, name) {
  code = clean(code);
  if (!code) return null;
  if (!skus[code]) skus[code] = { code, name: clean(name), casesAvail: 0, casesInTransit: 0, comment: "", commentEn: "", lots: [] };
  else if (!skus[code].name && name) skus[code].name = clean(name);
  return skus[code];
}

// Pass 1: summary table (cols 0..6) — establishes the SKU roster + headline + comment
for (const r of dataRows) {
  const code = clean(r[0]);
  if (!code) continue;
  const s = ensure(code, r[1]);
  s.casesAvail = intOr0(r[2]);
  s.comment = clean(r[6]);
}

// Pass 2: lot table (cols 8..16)
let lotCount = 0;
for (const r of dataRows) {
  const code = clean(r[8]);
  if (!code) continue;
  const s = ensure(code, r[9]);
  const lotNum = clean(r[10]) || null;
  const receiptRaw = clean(r[11]);
  const cases = intOr0(r[12]);
  const reserved = intOr0(r[13]);
  const comment = clean(r[14]);
  const netAvailLb = num(r[15]);
  const expRaw = clean(r[16]);

  const receiptDate = isoFromMDY(receiptRaw);
  const onHand = !!receiptDate; // a real MM/DD/YYYY receipt date == landed stock
  let eta = null, expDate = null, expMonth = null;
  if (onHand) {
    expDate = isoFromMDY(expRaw); // full date when on hand
  } else {
    eta = isoFromEta(receiptRaw); // "ETA 07/02" / "AIR FREIGHT" rows carry ETA here
    expMonth = monthYear(expRaw); // in-transit expiry is month-year only
  }

  const lot = {
    lotNum,
    status: onHand ? "on_hand" : "in_transit",
    receiptDate: receiptDate || null,
    eta,
    cases,
    reserved,
    netAvailLb: netAvailLb == null ? null : netAvailLb,
    expDate,                 // null for in-transit (matches schema v1.2 / allocate())
    expMonth: expMonth || null, // extra: month-year hint for in-transit (display only)
    comment,
  };
  s.lots.push(lot);
  lotCount++;
}

// Pass 3: derive casesInTransit per SKU from in-transit lots
for (const code of Object.keys(skus)) {
  const s = skus[code];
  s.casesInTransit = s.lots.filter((l) => l.status === "in_transit").reduce((a, l) => a + (l.cases || 0), 0);
}

const out = {
  schemaVersion: "1.2",
  clientId: "monti-trentini",
  lastUpdated,
  lastUpdatedSource,
  sheetStatedUpdate,
  sheetModifiedAt: driveModifiedTime,
  sheetFileId: driveFileId,
  sheetOwner,
  source: path.basename(IN),
  generatedAt: TODAY.toISOString(),
  generatedBy: "scripts/sync-inventory.mjs",
  skus,
};

const skuCount = Object.keys(skus).length;
const withStock = Object.values(skus).filter((s) => s.lots.some((l) => l.status === "on_hand" && (l.cases - l.reserved) > 0)).length;

// ---- validation gate (for unattended --promote runs) ----------------------
// Returns [] when safe to ship, or a list of human-readable failures.
// Cross-checks parsed items against source/item-reference.json (static code ->
// description truth list). A materially different description on a KNOWN code
// means the sheet's columns shifted or the parse mis-aligned:
//   >=5 description mismatches  -> hard fail (structural shift)
//   1-4 mismatches              -> warn, still promote (legit renames happen)
//   unknown codes               -> warn only (new items; add them to the reference)
const REF_PATH = path.join(SRC_DIR, "item-reference.json");
const normDesc = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
// "materially different": no significant word overlap after normalization
function descMatches(a, b) {
  const wa = new Set(normDesc(a).split(" ")), wb = new Set(normDesc(b).split(" "));
  let hit = 0;
  for (const w of wa) if (wb.has(w)) hit++;
  return hit >= Math.min(2, wa.size, wb.size); // share >=2 words (or all, if shorter)
}
function validate(doc) {
  const errs = [];
  const n = Object.keys(doc.skus).length;
  if (n < 80) errs.push(`only ${n} SKUs parsed (expected ~110+) — sheet shape may have changed`);
  if (lotCount < 80) errs.push(`only ${lotCount} lots parsed (expected ~120) — lot table may be malformed`);
  if (withStock < 10) errs.push(`only ${withStock} sellable-now SKUs (expected ~40) — suspiciously low`);
  for (const [code, s] of Object.entries(doc.skus)) {
    for (const l of s.lots) {
      if (l.status === "on_hand" && !l.expDate) errs.push(`on-hand lot ${code}/${l.lotNum} missing expDate`);
      if (l.cases == null) errs.push(`lot ${code}/${l.lotNum} has no case count`);
    }
  }
  // reference cross-check
  if (fs.existsSync(REF_PATH)) {
    let ref = null;
    try { ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8")).items; } catch { /* unreadable -> skip */ }
    if (ref) {
      const mismatches = [], unknown = [];
      for (const [code, s] of Object.entries(doc.skus)) {
        if (!(code in ref)) { unknown.push(code); continue; }
        if (!descMatches(s.name, ref[code])) mismatches.push(`${code}: sheet "${s.name}" vs reference "${ref[code]}"`);
      }
      const missing = Object.keys(ref).filter((c) => !(c in doc.skus));
      if (mismatches.length >= 5) {
        errs.push(`${mismatches.length} item descriptions do not match item-reference.json — columns likely shifted`);
        for (const m of mismatches.slice(0, 4)) errs.push(`  ${m}`);
      } else if (mismatches.length) {
        for (const m of mismatches) log(`⚠ description drift (promoting anyway): ${m} — update item-reference.json if legit rename`);
      }
      if (missing.length >= 20) errs.push(`${missing.length} known codes vanished from the sheet (e.g. ${missing.slice(0, 5).join(", ")}) — parse likely broken`);
      if (unknown.length) log(`⚠ ${unknown.length} new code(s) not in item-reference.json: ${unknown.join(", ")} — add if legit new items`);
    }
  } else {
    log("⚠ no source/item-reference.json — description cross-check skipped");
  }
  return errs.slice(0, 8);
}

const CANON = path.join(DATA_DIR, "inventory.json");
function sellableMap(doc) {
  const m = {};
  for (const [k, s] of Object.entries(doc.skus))
    m[k] = s.lots.filter((l) => l.status === "on_hand").reduce((a, l) => a + Math.max(0, (l.cases || 0) - (l.reserved || 0)), 0);
  return m;
}
function diffVsCanon(doc) {
  if (!fs.existsSync(CANON)) return { changed: true, lines: ["(no existing inventory.json — first promote)"] };
  let prev; try { prev = JSON.parse(fs.readFileSync(CANON, "utf8")); } catch { return { changed: true, lines: ["(existing inventory.json unreadable)"] }; }
  const a = sellableMap(prev), b = sellableMap(doc);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const lines = [];
  for (const k of keys) {
    const x = a[k], y = b[k];
    if (x !== y) lines.push(`${k} ${(doc.skus[k] || prev.skus[k]).name}: ${x ?? "-"} -> ${y ?? "-"}`);
  }
  return { changed: lines.length > 0 || prev.lastUpdated !== doc.lastUpdated, lines };
}

if (args.includes("--promote") || args.includes("--check")) {
  const errs = validate(out);
  const diff = diffVsCanon(out);
  if (errs.length) {
    console.error("✗ VALIDATION FAILED — not promoting:");
    errs.forEach((e) => console.error("   - " + e));
    process.exit(2);
  }
  if (!diff.changed) {
    log(`= No change vs current inventory.json (sheet lastUpdated ${lastUpdated}). Nothing to promote.`);
    process.exit(3); // distinct code: "valid but unchanged"
  }
  if (args.includes("--check")) {
    log(`✓ VALID & CHANGED (${diff.lines.length} SKU sellable-now deltas). Safe to promote.`);
    diff.lines.slice(0, 12).forEach((l) => log("   " + l));
    process.exit(0);
  }
  // --promote: back up current, then replace
  if (fs.existsSync(CANON)) {
    const stamp = TODAY.toISOString().slice(0, 10);
    const bdir = path.resolve(DATA_DIR, `../../archive/backup_${stamp}_inventory_autosync`);
    fs.mkdirSync(bdir, { recursive: true });
    fs.copyFileSync(CANON, path.join(bdir, `inventory_${Date.now()}.json`));
  }
  fs.writeFileSync(CANON, JSON.stringify(out, null, 2) + "\n");
  log(`✓ PROMOTED -> ${path.relative(process.cwd(), CANON)}  (SKUs ${skuCount} | lots ${lotCount} | sellable-now ${withStock})`);
  diff.lines.slice(0, 12).forEach((l) => log("   " + l));
  process.exit(0);
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
log(`✓ ${path.basename(IN)} -> ${path.relative(process.cwd(), OUT)}`);
log(`  SKUs: ${skuCount} | lots: ${lotCount} | sellable-now SKUs: ${withStock}`);
log(`  lastUpdated: ${lastUpdated}  (source: ${lastUpdatedSource}${driveModifiedTime ? `, sheet banner said ${sheetStatedUpdate}` : ""})`);
