// Sync a tenant's Cloudinary folder into the ONE canonical image manifest
// (src/data/<tenant>/images.json) — the wired, uniform source every screen reads.
// This is the "add a photo, run one command, it's everywhere" step (IMAGE_PIPELINE_SPEC.md).
//
// Reads the Cloudinary Admin API server-side (secrets via env, never in the browser):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//   TENANT (default "montitrentini"), CLOUDINARY_FOLDER (default "monti-trentini")
//
// Usage:
//   CLOUDINARY_CLOUD_NAME=sofcvmwa CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
//   node scripts/sync-images.mjs
// Then `npm run prewarm` (or `npm run media:refresh` to do both).
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

if (!cloud || !key || !secret) {
  console.error("Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET. See header.");
  process.exit(1);
}

const APPROVAL_TAGS = ["approved-for-influencers", "approved-for-press", "draft"];
const auth = Buffer.from(`${key}:${secret}`).toString("base64");
const base =
  `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
  `?type=upload&prefix=${encodeURIComponent(folder)}&max_results=500&tags=true&context=true`;

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

const images = resources.map((r) => {
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
}).sort((a, b) => (a.category + a.title).localeCompare(b.category + b.title));

const manifest = {
  schemaVersion: "1.0",
  tenant,
  cloud,
  folder,
  generatedAt: new Date().toISOString().slice(0, 10),
  generatedFrom: "Cloudinary Admin API (scripts/sync-images.mjs)",
  images,
};

const out = path.join(__dirname, `../src/data/${tenant}/images.json`);
fs.writeFileSync(out, JSON.stringify(manifest, null, 1));
console.log(`Wrote ${out}: ${images.length} images (${images.filter((i) => i.code).length} with a code). Now run: npm run prewarm`);
