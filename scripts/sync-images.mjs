// Sync a tenant's Cloudinary folder into the ONE canonical image manifest
// (src/data/<tenant>/images.json) — the wired, uniform source every screen reads.
// This is the "add a photo, run one command, it's everywhere" step (IMAGE_PIPELINE_SPEC.md).
//
// TWO MODES (auto-selected):
//
// 1. ADMIN API (secrets, full fidelity) — CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET set:
//      CLOUDINARY_CLOUD_NAME=sofcvmwa CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
//      node scripts/sync-images.mjs
//
// 2. LIVE (no secrets — 2026-07-06, closes the "can only run this from Netlify" gap) — reads
//    the already-deployed media-list function instead, which proxies the Admin API server-side.
//    Same output shape; the only loss is nothing today (media-list now returns version/bytes/
//    modified too). Falls back here automatically when the Admin API secrets aren't set:
//      node scripts/sync-images.mjs --live
//      PLATFORM_BASE=https://montitrentini.cheeseshoptech.com node scripts/sync-images.mjs --live
//
// Then `npm run prewarm` (or `npm run media:refresh` to do both — Admin API mode only, prewarm
// needs the same secrets to warm Cloudinary's cache via the Admin API).
//
// The manifest carries everything every surface needs: publicId/version/format for cldImage,
// category/title/code for the Catalog, sku for Pricing/Proposals, approvalState for the Media hub.

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

// Legacy Cloudinary folders predating the tenant folder (config/clients/<tenant>.json
// `cloudinaryLegacyFolders`, e.g. Monti's `monti/<itemcode>` packshots) — read here so BOTH sync
// modes pick them up. Mode 2 (LIVE) previously never passed `legacy=` to media-list.js at all,
// so an entire folder of already-shot, item-numbered photography never reached the manifest via
// that path (2026-07-18 dispatch audit, §1 "second gap").
const clientConfigPath = path.join(__dirname, `../config/clients/${tenant}.json`);
const clientConfig = fs.existsSync(clientConfigPath) ? JSON.parse(fs.readFileSync(clientConfigPath, "utf8")) : {};
const legacyFolders = clientConfig.cloudinaryLegacyFolders || [];

// The manifest's ONE dispatch gate (2026-07-18 dispatch audit, §5 fix #1+#2): a code/sku only
// counts — and only then makes the image reachable via imageForCode()/codeImageUrl(), which is
// what every app (Catalog, Proposals, Pricing) actually calls — when the asset ALSO carries the
// `product-catalog` tag AND is approved. This is what closes the "lifestyle photo with someone
// else's SKU in its context leaks into the Catalog" class of bug at the source: an asset that
// fails this gate still appears in the manifest (nothing here deletes data), it just can never be
// found by SKU. Previously `code = ctx.code || ctx.sku || null` alone decided this — no tag or
// approval check at all.
function gatedCode(rawCode, tags, approvalState) {
  if (!rawCode) return null;
  if (!tags.includes("product-catalog")) return null;
  if (!APPROVED_STATES.includes(approvalState)) return null;
  return rawCode;
}

// Background-removal convention (2026-07-18, fix #3): Rick applies this tag once a packshot is
// actually background-removed; carried into the manifest so lib/cloudinary.js can skip the
// forced white pad for that asset. See `npm run validate:images` for a compliance report.
const BG_REMOVED_TAG = "bg-removed";

// Title-case a slug leaf as a fallback display title.
const titleFromId = (publicId) => {
  const leaf = publicId.split("/").pop().replace(/-[a-z0-9]{6}$/i, "");
  return leaf.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};
// Category = the folder segment right after the tenant folder, title-cased.
const categoryFromId = (publicId) => {
  const segs = publicId.split("/");
  const i = segs.indexOf(folder.split("/").pop());
  const seg = i >= 0 ? segs[i + 1] : segs[1];
  return seg ? seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Other";
};

let images;
let cloudOut = cloud;

if (!LIVE) {
  // ---- Mode 1: Cloudinary Admin API directly (full fidelity) -----------------------------
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  async function listPrefix(prefix) {
    const base =
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
      `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=500&tags=true&context=true`;
    const resources = [];
    let cursor = null;
    do {
      const res = await fetch(cursor ? `${base}&next_cursor=${encodeURIComponent(cursor)}` : base, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) { console.error(`Cloudinary ${res.status}: ${await res.text()}`); process.exit(1); }
      const data = await res.json();
      resources.push(...(data.resources || []));
      cursor = data.next_cursor;
    } while (cursor);
    return resources;
  }

  const resources = await listPrefix(folder);
  const seen = new Set(resources.map((r) => r.public_id));
  // Legacy folders (2026-07-18 fix — previously only media-list.js's OWN full-mode loop knew
  // about these; this script's Admin API mode never did, so `node scripts/sync-images.mjs`
  // (no --live) silently skipped the entire legacy-folder photo set every time it ran).
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

  images = resources.map((r) => {
    const ctx = r.context?.custom || {};
    const tags = r.tags || [];
    const rawCode = ctx.code || ctx.sku || null;
    const approvalState = APPROVAL_TAGS.find((s) => tags.includes(s)) || "approved-for-press";
    const code = gatedCode(rawCode, tags, approvalState);
    return {
      publicId: r.public_id,
      version: r.version,
      format: r.format,
      category: ctx.category || categoryFromId(r.public_id),
      title: ctx.caption || ctx.title || titleFromId(r.public_id),
      code,
      sku: code,
      orig: ctx.orig || null,
      approvalState,
      bgRemoved: tags.includes(BG_REMOVED_TAG),
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      modified: (r.created_at || "").slice(0, 10),
    };
  });
} else {
  // ---- Mode 2: LIVE via the deployed media-list function (no secrets needed locally) ------
  // Uses whatever the manifest already says the cloud is (repo default) unless overridden —
  // media-list doesn't echo the cloud name back (it's server-side only), so we keep the known one.
  const existingPath = path.join(__dirname, `../src/data/${tenant}/images.json`);
  const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : {};
  cloudOut = cloud || existing.cloud;
  if (!cloudOut) {
    console.error("No cloud name known. Set CLOUDINARY_CLOUD_NAME, or make sure src/data/<tenant>/images.json already has one.");
    process.exit(1);
  }
  const BASE = process.env.PLATFORM_BASE || "https://montitrentini.cheeseshoptech.com";
  // 2026-07-18 fix: pass `legacy=` through — this call never did before, so the legacy folder
  // (config `cloudinaryLegacyFolders`) silently never reached the manifest via --live either.
  const legacyParam = legacyFolders.length ? `&legacy=${encodeURIComponent(legacyFolders.join(","))}` : "";
  // 2026-07-18 fix (found while running validate-images.mjs): media-list.js has required a
  // passcode on every read since the 2026-07-16 wiring-audit P0 #1 fix. This --live path never
  // sent one, so `sync-images.mjs --live` has been silently broken (401) since that security fix
  // landed — Admin API mode (real Cloudinary secrets, no --live) was unaffected.
  const passcode = process.env.PORTAL_PASSCODE;
  if (!passcode) {
    console.error(
      "Missing PORTAL_PASSCODE env var. media-list.js now requires the portal passcode on every\n" +
      "read (2026-07-16 security fix) -- run with:\n" +
      "  PORTAL_PASSCODE=<your portal passcode> node scripts/sync-images.mjs --live"
    );
    process.exit(1);
  }
  console.log(`LIVE mode — reading ${BASE}/.netlify/functions/media-list?folder=${folder}${legacyParam}`);
  const res = await fetch(`${BASE}/.netlify/functions/media-list?folder=${encodeURIComponent(folder)}${legacyParam}`, {
    headers: { "x-portal-passcode": passcode },
  });
  if (!res.ok) { console.error(`media-list ${res.status}: ${await res.text()}`); process.exit(1); }
  const data = await res.json();
  const assets = data.assets || data;

  images = assets.map((a) => {
    const tags = a.usage || []; // media-list.js already filters tags down to the usage taxonomy
    const approvalState = a.approvalState || "approved-for-press";
    const code = gatedCode(a.sku || null, tags, approvalState);
    return {
      publicId: a.publicId,
      version: a.version,               // present once media-list.js ships the 2026-07-06 field addition
      format: a.format,
      category: categoryFromId(a.publicId),
      title: a.title || titleFromId(a.publicId),
      code,
      sku: code,
      orig: null,
      approvalState,
      bgRemoved: !!a.bgRemoved, // media-list.js surfaces this as its own boolean, not in usage[]
      width: a.width,
      height: a.height,
      bytes: a.bytes,
      modified: a.modified || null,
    };
  });
}

images.sort((a, b) => (a.category + a.title).localeCompare(b.category + b.title));

const manifest = {
  schemaVersion: "1.0",
  tenant,
  cloud: cloudOut,
  folder,
  generatedAt: new Date().toISOString().slice(0, 10),
  generatedFrom: LIVE
    ? "media-list Netlify function, no local secrets (scripts/sync-images.mjs --live)"
    : "Cloudinary Admin API (scripts/sync-images.mjs)",
  images,
};

const out = path.join(__dirname, `../src/data/${tenant}/images.json`);
fs.writeFileSync(out, JSON.stringify(manifest, null, 1));
console.log(`Wrote ${out}: ${images.length} images (${images.filter((i) => i.code).length} with a code).` +
  (LIVE ? "" : " Now run: npm run prewarm"));
