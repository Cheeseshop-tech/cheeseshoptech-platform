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

const DRAFT_KEY = (tenantId) => `cs-proposal-draft-${tenantId}`;

export const emptyProposal = () => ({
  v: 1,
  buyer: "",
  headline: "",
  intro: "",
  deckKey: "",
  tierId: "",
  skus: [],
  date: new Date().toISOString().slice(0, 10),
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

/** Flatten the canonical catalog into selectable SKUs, resolving the parent product. */
export function flattenSkus(catalog) {
  const out = [];
  for (const product of catalog?.products || []) {
    for (const sku of product.skus || []) {
      out.push({ product, sku });
    }
  }
  return out;
}

/** Look up the {product, sku} pairs for the proposal's selected codes (order preserved). */
export function resolveSkus(catalog, codes) {
  const all = flattenSkus(catalog);
  return (codes || [])
    .map((code) => all.find((x) => x.sku.code === code))
    .filter(Boolean);
}

/** Cloudinary packshot URL from the tenant's canonical images config (sku.image = public id leaf).
 *  Routes through the ONE canonical builder; `width` picks the nearest preset. */
export function skuImageUrl(config, sku, width = 160) {
  const img = config?.images;
  if (!img || img.provider !== "cloudinary" || !sku.image) return null;
  const preset = width <= 110 ? "micro" : width <= 220 ? "thumb" : "card";
  return cldImage({ cloud: img.cloud, publicId: `${img.folder}/${sku.image}`, preset });
}
