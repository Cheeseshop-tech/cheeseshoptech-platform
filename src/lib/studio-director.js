// Studio Director — Stage 0 (deterministic auto-fill) + Stage 1 (rules of taste).
// CONTENT_ENGINE_WIRING_SPEC §3. No AI, no cost, pure resolution: every slot of a template
// sequence filled from the right upstream system — kit voice for text, Media Hub for images,
// catalog for products, the opportunity for the seed. Output = the exact draft shape
// SlideStudio edits ({ title, deck: [{ t, slots }] }); the human's job collapses to
// review-and-swap. Stage 2 (AI pass, Netlify function) plugs in AFTER this, consuming the
// candidates this pass produces — same additive-seam philosophy as every backend.

import { getBrandKit } from "./brandKit.js";
import { getPricingData } from "./pricing.js";
import { listAssets } from "./media.js";
import { loadItems, getItem } from "./items.js";
import { getSlideTemplate } from "./slide-templates.js";

// Slot `tag` vocabulary (templates) → Media Hub usage-taxonomy ids. Templates predate the
// 12-tag taxonomy; this crosswalk keeps both stable.
const TAG_TO_USAGE = {
  product: "product-catalog",
  hero: "hero",
  lifestyle: "lifestyle",
  logo: "brand-asset",
  seal: "brand-asset",
  sprig: "brand-asset",
};

const isApproved = (a) => String(a.approvalState || "").startsWith("approved");

/* ---------- image resolution (Stage 1 rules baked in) ----------
   Score candidates for a slot: right tag ≫ approved ≫ SKU-linked when the draft carries SKUs.
   `used` enforces the no-reuse rule across the whole deck. */
function pickAsset({ assets, tag, skuCodes = [], used }) {
  const usage = TAG_TO_USAGE[tag] || tag;
  let best = null, bestScore = -1;
  for (const a of assets) {
    if (!a.publicId || used.has(a.publicId)) continue;
    let s = 0;
    if (usage && (a.usage || []).includes(usage)) s += 4;
    if (isApproved(a)) s += 2;
    if (a.sku && skuCodes.includes(a.sku)) s += 3;
    if (s > bestScore) { bestScore = s; best = a; }
  }
  // Only accept an asset that at least matches the tag OR is approved — otherwise leave the
  // slot for the human (an empty slot beats a wrong photo).
  if (!best || bestScore < 2) return null;
  used.add(best.publicId);
  return best.publicId;
}

/* ---------- voice resolution ---------- */
// All short brand lines, shortest-first (statement slides take the punchiest line — Stage 1).
function shortLines(kit) {
  const v = kit?.voice || {};
  return [v.motto, v.mantra, v.positioningHook, ...(v.readyPhrases || [])]
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
}

// Best story block: opportunity storyKeys first, then audience match, then first block.
function pickStory(kit, { storyKeys = [], audience } = {}) {
  const blocks = kit?.storyBlocks || [];
  if (!blocks.length) return null;
  return (
    blocks.find((b) => storyKeys.includes(b.key)) ||
    blocks.find((b) => audience && (b.audience || []).includes(audience)) ||
    blocks[0]
  );
}

/* ---------- product resolution ---------- */
// Up to n products for range cards: opportunity SKUs first, then featured, then catalog order.
// Name resolution follows DATA_OWNERSHIP_MAP.md: the canonical item record (Media Hub's
// items.js, same source Product Catalog reads) wins; catalog.json's own `name` is only the
// fallback for a SKU that hasn't been entered into the items doc yet. Images for this card are
// resolved separately via pickAsset() (Media Hub) below — catalog.json's own per-SKU `image`
// field is never used here, so there's exactly one image path, not two.
function pickProducts(catalog, itemsDoc, skuCodes = [], n = 3) {
  const products = catalog?.products || [];
  const out = [];
  const seen = new Set();
  const push = (p, sku) => {
    if (!p || seen.has(p.id) || out.length >= n) return;
    seen.add(p.id);
    const code = sku || p.skus?.[0]?.code || "";
    const itemName = code ? getItem(itemsDoc, code)?.name : null;
    out.push({ name: titleCase(itemName || p.name), sku: code });
  };
  for (const code of skuCodes) {
    const p = products.find((pr) => (pr.skus || []).some((s) => s.code === code));
    push(p, code);
  }
  for (const p of products) { if (out.length >= n) break; if (p.marketing?.featured) push(p); }
  for (const p of products) { if (out.length >= n) break; push(p); }
  return out;
}

const titleCase = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

/* ---------- the Director ---------- */
/**
 * Stage 0/1 deterministic compose. Returns { title, deck } in SlideStudio's draft shape,
 * or null when the tenant has nothing to compose from (no kit AND no assets).
 * @param {object} p
 * @param {object} p.resolved     active tenant (clientConfig.resolveClient shape)
 * @param {object} [p.user]       auth user — gates which Media Hub assets are visible
 * @param {object} [p.opportunity] optional seed: { headline, intro, audience, storyKeys, skuCodes, who }
 */
export async function directDraft({ resolved, user, opportunity } = {}) {
  const kit = getBrandKit(resolved);
  const pricing = getPricingData(resolved);
  const catalog = pricing?.catalog;
  let assets = [];
  try {
    assets = await listAssets({ tenantFolder: resolved.cloudinaryFolder, legacyFolders: resolved.cloudinaryLegacyFolders, user });
  } catch { assets = []; }
  assets = assets.filter((a) => (a.format ? !["mp4", "mov"].includes(a.format) : true));

  // Canonical item copy (Media Hub items.js) — see pickProducts() below for how this joins
  // with catalog.json by SKU. Never throws: an empty/missing doc just falls back to catalog names.
  let itemsDoc = null;
  try { itemsDoc = await loadItems(resolved.cloudinaryFolder); } catch { itemsDoc = null; }

  const hasVoice = !!(kit && ((kit.storyBlocks || []).length || (kit.voice?.readyPhrases || []).length || kit.voice?.motto));
  if (!hasVoice && !assets.length) return null;

  const opp = opportunity || {};
  const used = new Set();
  const lines = shortLines(kit);
  const story = pickStory(kit, opp);
  const secondStory = pickStory(kit, { storyKeys: [], audience: opp.audience }) === story
    ? (kit?.storyBlocks || []).filter((b) => b !== story)[0] || null
    : pickStory(kit, { audience: opp.audience });
  const products = pickProducts(catalog, itemsDoc, opp.skuCodes || [], 3);
  const brandName = kit?.brandName || resolved.brand?.name || "";
  const attribution = kit?.attribution || brandName;

  const deck = [];
  const slide = (t, slots) => {
    // Start from the template sample (existing addSlide behavior), then override with
    // resolved values; drop empty overrides so samples cover gaps for thin tenants.
    const tpl = getSlideTemplate(t);
    const filled = { ...(tpl.sample || {}) };
    for (const [k, v] of Object.entries(slots)) {
      if (v === null || v === undefined || v === "") continue;
      filled[k] = v;
    }
    deck.push({ t, slots: filled });
  };

  // 1 · Cover — hero photo + the seed headline (or the brand hook).
  slide("cover/v1", {
    hero_image: pickAsset({ assets, tag: "hero", used }),
    slide_title: opp.headline || kit?.voice?.positioningHook || kit?.voice?.motto,
    topic_label: opp.intro || attribution,
  });

  // 2 · Statement — the punchiest short line (Stage 1: statements take the shortest copy).
  slide("statement/v1", {
    slide_title: lines[0],
    topic_label: attribution,
  });

  // 3 · Story — the matched block, long-form (Stage 1: story slides take the long blocks).
  slide("story/v1", {
    hero_image: pickAsset({ assets, tag: "lifestyle", used }),
    slide_title: story?.title,
    story_block: story ? { headline: (story.title || "").toUpperCase(), narrative: story.body } : null,
  });

  // 4 · Second story as a full-bleed image beat, when the tenant has depth.
  if (secondStory && assets.length > 2) {
    slide("image/v1", {
      hero_image: pickAsset({ assets, tag: "hero", used }) || pickAsset({ assets, tag: "lifestyle", used }),
      slide_title: lines[1] || secondStory.title,
    });
  }

  // 5 · Product range — SKU-linked photography when the seed carries SKUs.
  if (products.length) {
    slide("product-range/v1", {
      slide_title: opp.angle || "The range",
      img1: pickAsset({ assets, tag: "product", skuCodes: opp.skuCodes || [], used }),
      name1: products[0]?.name,
      img2: pickAsset({ assets, tag: "product", skuCodes: opp.skuCodes || [], used }),
      name2: products[1]?.name,
      img3: pickAsset({ assets, tag: "product", skuCodes: opp.skuCodes || [], used }),
      name3: products[2]?.name,
    });
  }

  // 6 · Closing / CTA — ready phrase or the seed's ask; contact stays human-filled
  // (explicitly blanked so the Monti sample address never leaks into another tenant's deck).
  slide("closing/v1", {
    slide_title: (kit?.voice?.readyPhrases || [])[0] || opp.headline,
    cta: "Request samples",
  });
  deck[deck.length - 1].slots.contact = "";

  return {
    title: opp.headline || (brandName ? `${brandName} — brand story` : "Auto-composed deck"),
    deck,
  };
}
