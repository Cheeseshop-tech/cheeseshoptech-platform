// Pre-warm Cloudinary derivatives so the FIRST viewer of each image never waits.
// Monti's masters are ~6700px (45 MP); generating a web-size version from one of those
// takes 2-4s the first time, then it's CDN-cached forever. This script requests every
// derivative the app uses (grid thumb + lightbox big) once, up front — so by the time a
// buyer or Stefano opens the catalog, every image is already warm.
//
// Run after uploading new photos:
//   node scripts/prewarm-cloudinary.mjs
//
// Reads the canonical per-tenant image manifest (src/data/<tenant>/images.json).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tenant = process.env.TENANT || "montitrentini";
const bundlePath = path.join(__dirname, `../src/data/${tenant}/images.json`);
const { cloud, images } = JSON.parse(fs.readFileSync(bundlePath, "utf8"));

// Keep these in lockstep with TRANSFORMS presets in src/lib/cloudinary.js (card + preview).
const base = `https://res.cloudinary.com/${cloud}/image/upload`;
const derivativesFor = (im) => {
  const v = `${im.version ? `v${im.version}/` : ""}${im.publicId}${im.format ? `.${im.format}` : ""}`;
  return [
    `${base}/c_pad,b_white,w_360,h_360,f_auto,q_auto/${v}`,            // grid card (Catalog + Media hub)
    `${base}/c_limit,w_1200,f_auto,q_auto:good,fl_progressive/${v}`,   // lightbox / preview
  ];
};

const urls = images.flatMap(derivativesFor);
let done = 0, cold = 0, failed = 0;

async function warm(url) {
  const t = Date.now();
  try {
    const res = await fetch(url);
    await res.arrayBuffer();
    if (Date.now() - t > 1500) cold++;
  } catch { failed++; }
  done++;
}

// Limit concurrency so we don't hammer the CDN.
const CONCURRENCY = 8;
const queue = [...urls];
const t0 = Date.now();
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await warm(queue.pop());
  })
);
console.log(
  `Warmed ${done}/${urls.length} derivatives (${images.length} images x2 sizes) in ` +
  `${Math.round((Date.now() - t0) / 1000)}s — ${cold} were cold (now cached)` +
  (failed ? `, ${failed} failed` : "")
);
