// Price list of record — client seam over /.netlify/functions/prices.
//
// The tool is the pricing truth (Rick, 2026-08-21). catalog.json still ships the BASE FOB costs
// from the spreadsheet sync, but a published price list overlays them at the single read point
// (use-pricing-data.js), so Pro Forma, the Quote Builder, Proposals and the storefront all quote
// the same number without any of them knowing this file exists. One mind, one body.
//
// Two stages, deliberately: a DRAFT is private and quotable by nobody; PUBLISHING is a separate
// act that stamps the effective window and bumps the version. See netlify/functions/prices.js.

import { authHeaders } from "@/lib/auth-context.jsx";
import { PRICING_BACKEND } from "@/lib/pricing.js";

const ENDPOINT = "/.netlify/functions/prices";

/** The base FOB field the engine actually reads for a SKU: catch-weight bulk quotes off `fob`,
 *  exact-weight precuts off `fobCase` (see pricing-core.js quoteUnitPrice). */
export function priceFieldFor(sku) {
  return sku?.unit === "case" ? "fobCase" : "fob";
}

/** The base cost currently in play for a SKU, given an optional published/draft overlay. */
export function baseCostOf(sku, overlay) {
  const field = priceFieldFor(sku);
  const over = overlay?.prices?.[sku?.code]?.[field];
  if (over !== undefined && over !== null) return over;
  const cost = sku?.cost || {};
  if (field === "fobCase") {
    if (typeof cost.fobCase === "number") return cost.fobCase;
    if (typeof cost.fobPiece === "number" && sku?.pack?.piecesPerCase) return cost.fobPiece * sku.pack.piecesPerCase;
    return null;
  }
  return typeof cost.fob === "number" ? cost.fob : null;
}

/**
 * Overlay a published price list onto the canonical catalog, non-destructively.
 * Only cost.fob / cost.fobCase are touched — pack specs, names, marketing and everything else
 * stay exactly as catalog.json has them. Returns the same object when there is nothing to apply,
 * so React referential checks upstream don't churn.
 */
export function applyPublishedPrices(catalog, published) {
  const map = published?.prices;
  if (!catalog || !map || !Object.keys(map).length) return catalog;
  return {
    ...catalog,
    products: (catalog.products || []).map((p) => ({
      ...p,
      skus: (p.skus || []).map((s) => {
        const over = map[s.code];
        if (!over) return s;
        const cost = { ...(s.cost || {}) };
        if (over.fob !== undefined && over.fob !== null) cost.fob = over.fob;
        if (over.fobCase !== undefined && over.fobCase !== null) cost.fobCase = over.fobCase;
        return { ...s, cost };
      }),
    })),
  };
}

/**
 * Published list + working draft + audit log. Returns nulls/[] rather than throwing, so a
 * failure here always degrades to "quote the bundled catalog" instead of breaking the tool —
 * that degrade is deliberate and correct. What was NOT distinguishable (CRM-05 follow-up,
 * 2026-09-03): "genuinely nothing has ever been published" vs. "the read failed, we don't
 * actually know" — both looked identical (published: null), and price-list.jsx's admin page
 * would state outright "No published price list yet" even when a real list exists but the
 * fetch just failed. `unavailable: true` marks the second case so a caller can say "couldn't
 * check" instead of asserting an unpublished state that may not be true. Never true in mock
 * mode or on a genuine (if empty) 200 response — only on a real fetch/network failure.
 */
export async function fetchPriceState(tenantId) {
  if (PRICING_BACKEND === "mock") return { published: null, draft: null, log: [] };
  try {
    const res = await fetch(`${ENDPOINT}?tenant=${encodeURIComponent(tenantId)}`, {
      headers: { Accept: "application/json", ...(await authHeaders()) },
    });
    if (!res.ok) return { published: null, draft: null, log: [], unavailable: true };
    const d = await res.json();
    return { published: d.published || null, draft: d.draft || null, log: Array.isArray(d.log) ? d.log : [] };
  } catch {
    return { published: null, draft: null, log: [], unavailable: true };
  }
}

async function post(payload) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const detail = Array.isArray(data?.detail) ? ` (${data.detail.join("; ")})` : "";
    throw new Error((data?.error || `Request failed (${res.status})`) + detail);
  }
  return data;
}

/** Save the working draft. `prices` = { [skuCode]: { fob?|fobCase? } }. Admin / client-admin only
 *  server-side; the "who" is taken from the verified session, not from here.
 *  `sourceDoc` optionally attaches the HQ price document these numbers came from — provenance
 *  only, never parsed: a bad parse must not be able to move a price silently. */
export const savePriceDraft = (tenantId, prices, note = "", sourceDoc = null) =>
  post({ tenant: tenantId, action: "save-draft", prices, note, sourceDoc });

/** Promote the draft to the live price list with its effective window. */
export const publishPrices = (tenantId, { effectiveDate, validUntil = "", note = "" }) =>
  post({ tenant: tenantId, action: "publish", effectiveDate, validUntil, note });

/** Throw the draft away (logged). */
export const discardPriceDraft = (tenantId) =>
  post({ tenant: tenantId, action: "discard-draft" });
