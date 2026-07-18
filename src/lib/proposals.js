// Proposal engine v1 (F4, ADMIN_DASHBOARDS_SPEC §5). One generic engine, both tiers:
// the tier only changes whose brand tokens and whose data feed it. A proposal is a small
// JSON document (buyer, copy, deck ref, SKU selection, class of trade) — it references
// canonical data by key/code and NEVER copies pricing (price-list pipeline stays the
// source of truth; prices are quoted live by pricing-core at render time).
//
// V1 sharing = the proposal travels IN the link (base64url in the URL hash), so no backend
// is needed and the canonical data can't drift: the recipient renders against live data.
// The link sits behind the tenant passcode gate. Per-proposal revocable keys = v2 (needs
// the backend seam; see spec §8).

import { getItem } from "./items.js";
import { quoteUnitPrice } from "./pricing-core.js";

const DRAFT_KEY = (tenantId) => `cs-proposal-draft-${tenantId}`;

export const emptyProposal = () => ({
  v: 1,
  buyer: "",
  buyerId: "",        // CRM account ref (customer-profile join) — the source of truth for `buyer`
  audience: "",       // retail | foodservice | distributor — drives story-block suggestions
  headline: "",
  intro: "",
  deckKey: "",
  storyKeys: [],      // selected brand-kit story blocks (Proposal v2)
  signalKeys: [],     // market-signal angles this piece capitalizes on (MARKET_INTELLIGENCE_SPEC §2c)
  heroImageId: "",    // Media Hub public_id for the cover/hero zone (overrides brand-kit hero)
  storyImages: {},    // { [storyKey]: Media Hub public_id } — per-story zone image overrides
  themeId: "",        // selected design theme (Theme Engine)
  tierId: "",
  skus: [],
  date: new Date().toISOString().slice(0, 10),
  // Quote validity (wholesale Phase 1, WHOLESALE_ORDERING_WORKFLOW_SPEC.md / audit P0 #5).
  // REP-SPECIFIED per quote — deliberately NO default window (market is volatile; the rep
  // judges validity per quote). Required before a priced proposal link can be shared.
  validUntil: "",
  // Per-SKU price freeze taken when the share link is generated (see snapshotPrices).
  // The proposal travels in the link, so the snapshot travels with it — the buyer view
  // renders these prices, never a silent live reprice. null = legacy / unpriced proposal.
  priceSnapshot: null,
});

export function loadDraft(tenantId) {
  try { return { ...emptyProposal(), ...(JSON.parse(localStorage.getItem(DRAFT_KEY(tenantId))) || {}) }; }
  catch { return emptyProposal(); }
}

export function saveDraft(tenantId, proposal) {
  try { localStorage.setItem(DRAFT_KEY(tenantId), JSON.stringify(proposal)); } catch { /* quota */ }
  return proposal;
}

// -- URL encoding (base64url over UTF-8 JSON; ~1–3 KB for a typical proposal) --

export function encodeProposal(proposal) {
  const json = JSON.stringify(proposal);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeProposal(encoded) {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    return p && p.v === 1 ? p : null;
  } catch { return null; }
}

/** The proposal currently in the URL hash (#p=…), or null. */
export function proposalFromLocation() {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/[#&]p=([A-Za-z0-9_-]+)/);
  return m ? decodeProposal(m[1]) : null;
}

/** Shareable, passcode-gated link to a rendered proposal. */
export function buildShareUrl(resolved, proposal) {
  const url = new URL(window.location.origin + window.location.pathname);
  if (resolved.subdomain) url.searchParams.set("client", resolved.subdomain);
  else url.searchParams.set("app", "1");
  url.searchParams.set("page", "proposal");
  url.hash = `p=${encodeProposal(proposal)}`;
  return url.toString();
}

// -- Quote validity + price snapshot (wholesale Phase 1) --

/**
 * Freeze the proposal's quoted prices at share time. Returns the snapshot object stored on
 * the proposal record (and therefore inside the share link): the then-current per-SKU unit
 * prices plus the pricing inputs shown (basis, class of trade). Returns null when the
 * proposal shows no pricing (no tierId) or the config isn't loaded — an unpriced proposal
 * carries no snapshot, by design.
 */
export function snapshotPrices(proposal, config, catalog) {
  if (!proposal?.tierId || !config || !catalog) return null;
  const opts = { tierId: proposal.tierId, basis: config?.pricing?.costBasis };
  const prices = {};
  for (const { sku } of resolveSkus(catalog, proposal.skus)) {
    prices[sku.code] = quoteUnitPrice(sku, opts, config);
  }
  const tier = (config?.pricing?.tiers || []).find((t) => t.id === proposal.tierId);
  return {
    takenAt: new Date().toISOString().slice(0, 10),
    basis: config?.pricing?.costBasis || "FOB",
    tierId: proposal.tierId,
    tierLabel: tier?.label || "",
    prices, // { [skuCode]: $/unit as quoted, or null if unpriceable at snapshot time }
  };
}

/**
 * Where this proposal stands on quote validity. Never a silent reprice — the mode drives
 * what the buyer view renders:
 *  - "legacy"  — pre-Phase-1 proposal (no validUntil, no snapshot): render live prices
 *                exactly as before; no false "expired", no crash.
 *  - "quoted"  — before the valid-until date: render the SNAPSHOT prices (that's the
 *                quote; it holds even if the live price moved) with "Valid until <date>".
 *  - "expired" — past the date: "quote expired — request updated pricing"; live prices
 *                may render only when clearly labeled current/non-quote.
 * The quote is valid THROUGH the stated date (expires at local end-of-day).
 */
export function quoteStatus(proposal, now = new Date()) {
  const validUntil = proposal?.validUntil || "";
  const snapshot = proposal?.priceSnapshot || null;
  if (!validUntil && !snapshot) return { mode: "legacy", validUntil: "", snapshot: null };
  const expired = validUntil ? now > new Date(validUntil + "T23:59:59") : false;
  return { mode: expired ? "expired" : "quoted", validUntil, snapshot };
}

/**
 * Canonical display name for a SKU line. Name resolution follows DATA_OWNERSHIP_MAP.md
 * (same join as studio-director.js pickProducts): the canonical item record (Media Hub's
 * items.js — identity + copy) wins; catalog.json's own `name` is only the fallback for a
 * SKU that hasn't been entered into the items doc yet. `itemsDoc` may be null (still
 * loading, or the fetch failed) — then the catalog name renders, so a buyer-facing
 * proposal never blanks a product name. Pricing/pack specs stay catalog.json's.
 */
export function skuDisplayName(itemsDoc, product, sku) {
  return (sku?.code ? getItem(itemsDoc, sku.code)?.name : null) || product?.name || "";
}

/** Flatten the canonical catalog into selectable SKUs, resolving the parent product.
 *  Each entry carries the resolved `name` (items.js-preferred, see skuDisplayName). */
export function flattenSkus(catalog, itemsDoc = null) {
  const out = [];
  for (const product of catalog?.products || []) {
    for (const sku of product.skus || []) {
      out.push({ product, sku, name: skuDisplayName(itemsDoc, product, sku) });
    }
  }
  return out;
}

/** Look up the {product, sku, name} entries for the proposal's selected codes (order preserved). */
export function resolveSkus(catalog, codes, itemsDoc = null) {
  const all = flattenSkus(catalog, itemsDoc);
  return (codes || [])
    .map((code) => all.find((x) => x.sku.code === code))
    .filter(Boolean);
}

// (skuImageUrl removed in F5 — SKU images now resolve through the canonical manifest via
//  codeImageUrl in lib/images.js, manifest-first with a legacy packshot fallback.)
