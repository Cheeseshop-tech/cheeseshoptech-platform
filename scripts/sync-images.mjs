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
  const base =
    `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
    `?type=upload&prefix=${encodeURIComponent(folder)}&max_results=500&tags=true&context=true`;

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

  images = resources.map((r) => {
    const ctx = r.context?.custom || {};
    const tags = r.tags || [];
    const code = ctx.code || ctx.sku || null;
    return {
      publicId: r.public_id,
      version: r.version,
      format: r.format,
      category: ctx.category || categoryFromId(r.public_id),
      title: ctx.caption || ctx.title || titleFromId(r.public_id),
      code,
      sku: code,
      orig: ctx.orig || null,
      approvalState: APPROVAL_TAGS.find((s) => tags.includes(s)) || "approved-for-press",
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
  console.log(`LIVE mode — reading ${BASE}/.netlify/functions/media-list?folder=${folder}`);
  const res = await fetch(`${BASE}/.netlify/functions/media-list?folder=${encodeURIComponent(folder)}`);
  if (!res.ok) { console.error(`media-list ${res.status}: ${await res.text()}`); process.exit(1); }
  const data = await res.json();
  const assets = data.assets || data;

  images = assets.map((a) => ({
    publicId: a.publicId,
    version: a.version,               // present once media-list.js ships the 2026-07-06 field addition
    format: a.format,
    category: categoryFromId(a.publicId),
    title: a.title || titleFromId(a.publicId),
    code: a.sku || null,
    sku: a.sku || null,
    orig: null,
    approvalState: a.approvalState || "approved-for-press",
    width: a.width,
    height: a.height,
    bytes: a.bytes,
    modified: a.modified || null,
  }));
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
