// Shared, LIGHTWEIGHT server-side helper for ai-compose.js (2026-07-19 fix — "the agent isn't
// wired to Media Hub in a meaningful way," Rick: AI Polish would claim to change a photo and
// nothing happened). Root cause: `slots.__candidates` (the real, allowed image-id list Stage 2
// may pick from) is ONLY ever populated by studio-director.js's Stage 0 Auto-compose pass. A
// slide added via "pick a template" (not Auto-compose), or any slot whose image was manually
// swapped afterward via the MediaPicker inspector, never gets `__candidates` written — so
// ai-compose.js's briefSlide() falls back to a SINGLETON list (just the current image). Claude
// then has zero real alternatives, so mergeDeck() silently drops any image edit it proposes —
// while Claude's own free-text "notes" can still claim it changed the photo. This file lets
// ai-compose.js backfill a REAL candidate pool at request time for exactly those thin/missing
// slots, fetched live from the tenant's actual Cloudinary library — so "not wired to Media Hub"
// stops being true regardless of how a slide/slot was created.
//
// Deliberately NOT the full media-list.js pagination (up to 500 assets/folder across 5 pages) —
// this only needs a representative pool to score against, and ai-compose.js already spends up to
// 25s on the Anthropic call itself inside one Netlify Function invocation's time budget. One page
// (max 100) per folder keeps this fast and is plenty for a handful of tagged candidates.
//
// Scoring mirrors src/lib/studio-director.js's pickAsset() (same TAG_TO_USAGE crosswalk, same
// score bar) minus the SKU bonus — Stage 2 doesn't have a clean per-slide SKU list to score
// against here, and tag-match + approval alone is enough to fix "zero real choices," which is
// the actual bug. Kept as a separate, best-effort module: any failure here (missing env vars,
// a Cloudinary hiccup, an unconfigured tenant) must never block or fail the AI Polish request
// itself — same "never let this break the real operation" rule as _write-log.js.

const APPROVAL_TAGS = ["approved-for-influencers", "approved-for-press", "draft"];
const USAGE_IDS = [
  "product-catalog", "hero", "story-block", "lifestyle", "food-styling", "production",
  "social", "press", "event", "brand-asset", "email-campaign", "print", "web-marketing",
];
// Slot `tag` vocabulary (templates) → Media Hub usage-taxonomy ids — kept in sync manually with
// the identical crosswalk in studio-director.js (duplicated rather than shared because that file
// pulls in browser-only deps — import.meta.env, relative fetch() — that don't run in a function).
const TAG_TO_USAGE = {
  product: "product-catalog",
  hero: "hero",
  lifestyle: "lifestyle",
  logo: "brand-asset",
  seal: "brand-asset",
  sprig: "brand-asset",
};

function mapResource(r) {
  const tags = r.tags || [];
  return {
    publicId: r.public_id,
    sku: r.context?.custom?.sku || "",
    usage: tags.filter((t) => USAGE_IDS.includes(t)),
    approvalState: APPROVAL_TAGS.find((s) => tags.includes(s)) || "approved-for-press",
  };
}

async function fetchOnePage(cloud, auth, prefix) {
  const url =
    `https://api.cloudinary.com/v1_1/${cloud}/resources/image` +
    `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=100&tags=true&context=true`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
  const data = await res.json();
  return (data.resources || []).map(mapResource);
}

/**
 * Fetch a representative pool of a tenant's Cloudinary assets (one page per folder, capped at
 * 100 each) to score candidates against. Returns [] on ANY failure or missing config — callers
 * must treat the result as best-effort, never assume it succeeded.
 * @param {{cloudinaryFolder: string, cloudinaryLegacyFolders?: string[]}} o
 */
export async function fetchAssetPool({ cloudinaryFolder, cloudinaryLegacyFolders = [] }) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret || !cloudinaryFolder) return [];
  try {
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const folders = [cloudinaryFolder, ...(Array.isArray(cloudinaryLegacyFolders) ? cloudinaryLegacyFolders : [])];
    const pages = await Promise.all(folders.map((f) => fetchOnePage(cloud, auth, f).catch(() => [])));
    return pages.flat();
  } catch {
    return [];
  }
}

const isApproved = (a) => String(a.approvalState || "").startsWith("approved");

/**
 * Score `pool` against one slot's `tag`. Returns up to `limit` publicIds, highest-scoring first —
 * same ≥2 score bar as studio-director.js's pickAsset (tag match +4, approved +2), so "empty beats
 * a wrong photo" still holds: a pool with no real tag/approval match yields [].
 * @param {{pool: object[], tag: string, exclude?: string[], limit?: number}} o
 */
export function scoreCandidates({ pool, tag, exclude = [], limit = 5 }) {
  const usage = TAG_TO_USAGE[tag] || tag;
  const excludeSet = new Set(exclude);
  const scored = [];
  for (const a of pool) {
    if (!a.publicId || excludeSet.has(a.publicId)) continue;
    let s = 0;
    if (usage && (a.usage || []).includes(usage)) s += 4;
    if (isApproved(a)) s += 2;
    if (s >= 2) scored.push([s, a]);
  }
  scored.sort((x, y) => y[0] - x[0]);
  return scored.slice(0, limit).map(([, a]) => a.publicId);
}
