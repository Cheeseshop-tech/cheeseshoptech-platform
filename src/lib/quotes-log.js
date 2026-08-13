// Quotes-issued log — the shared record of what price went out the door, to whom, when.
// Closes the last "not captured yet" row in docs/QUOTING_TOOL_PRINCIPLES.md §9 (one mind /
// one body): cost, pricing rules, inventory, commitments and movement history all had a single
// owner; issued quotes did not. Now they do, in the same shape as the movement history seam
// (src/lib/history.js): localStorage is the instant, offline-safe layer, and when
// VITE_PRICING_BACKEND=function the records also sync to the central store
// (/.netlify/functions/quotes) so every rep shares one quote history.
//
// One record per SKU LINE on a printed quote (not one per quote) — that's what makes it
// queryable the way movement history is: "the last price we quoted THIS customer for THIS sku."
// `quoteId` groups the lines of one printed document back together.
//
// The Price Change Notification's "Previous $/lb" column reads exactly this (see lastQuotedPrice).
//
// Record shape (one per SKU line):
//   { id, tenant, at, purpose, quoteId, customer, skuCode, unitPrice, unit, tierId,
//     priceMode, pricePct,            // "tier" | "markup" | "margin", + the % actually applied
//     validUntil, effectiveDate, promoStart, promoEnd }
// priceMode/pricePct exist because unitPrice alone cannot be explained after the fact once a rep
// has replaced the class-of-trade preset with a typed margin or markup — and this log is what a
// later Price Change Notification quotes back to the customer as their previous price.
import { PRICING_BACKEND } from "@/lib/pricing.js";
import { writeAuthHeader } from "@/lib/auth-context.jsx";

// Tenant-scoped on purpose: the lookup is per customer + SKU within a tenant, and a shared key
// would let one tenant's quote history pre-fill another's price-change notice.
const LS_KEY = (tenantId) => `cs-quotes-log-${tenantId || "unknown"}`;
const newId = () => Date.now() + "-" + Math.random().toString(36).slice(2, 8);

/** A fresh quote id — groups every line of one printed document together. */
export const newQuoteId = () => "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function loadLocal(tenantId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY(tenantId))) || []; } catch { return []; }
}
function saveLocal(tenantId, recs) {
  try { localStorage.setItem(LS_KEY(tenantId), JSON.stringify(recs)); } catch { /* quota */ }
}

/** Append quote-line records. Stamps each with an id + tenant, writes locally immediately
 *  (optimistic), and best-effort POSTs to the central store when the live backend is on.
 *  Returns the stamped records. Fired by an explicit "Generate / Print" action — never on
 *  keystroke — the same trigger discipline as Proforma's recordSale(). */
export function appendQuoteLog(tenantId, records) {
  const stamped = (records || []).map((r) => ({ id: newId(), tenant: tenantId, ...r }));
  saveLocal(tenantId, loadLocal(tenantId).concat(stamped));
  if (PRICING_BACKEND !== "mock" && stamped.length) {
    // Passcode header required server-side (any tier — reps included). A 401 (pre-update
    // unlock) means the record stays local-only until the rep signs out/in.
    fetch("/.netlify/functions/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...writeAuthHeader() },
      body: JSON.stringify({ tenant: tenantId, records: stamped }),
    }).catch(() => { /* offline — stays in localStorage, syncs implicitly next quote */ });
  }
  return stamped;
}

/** Load the quote log: the shared store (source of truth) merged with any local-only records,
 *  deduped by id. Falls back to localStorage when the backend is mock or the network is down. */
export async function loadQuoteLog(tenantId) {
  const local = loadLocal(tenantId);
  if (PRICING_BACKEND === "mock") return local;
  try {
    const res = await fetch(`/.netlify/functions/quotes?tenant=${encodeURIComponent(tenantId)}`, {
      headers: { ...writeAuthHeader() },
    });
    if (!res.ok) return local; // incl. 401 from a pre-update unlock — local log still shows
    const data = await res.json();
    const remote = Array.isArray(data.records) ? data.records : [];
    const seen = new Set(remote.map((r) => r.id));
    return remote.concat(local.filter((r) => r.id && !seen.has(r.id)));
  } catch {
    return local;
  }
}

/**
 * The most recent price quoted to `customer` for `skuCode` — from ANY purpose — issued before
 * `beforeDate`. This is the "Previous $/lb" auto-fill for a Price Change Notification.
 *
 * Returns null when nothing is on file, which is the honest and common answer at first: the log
 * starts empty at ship time and only accrues going forward, so the rep types the prior price in
 * by hand until this customer has been quoted at least once through the Quote Builder.
 *
 * @param {Array}  records    Result of loadQuoteLog().
 * @param {string} customer   Exact customer name as stored on the quote.
 * @param {string} skuCode
 * @param {string} [beforeDate] ISO yyyy-mm-dd; records issued on/after it are ignored.
 * @returns {{unitPrice:number, unit:string, at:string, purpose:string}|null}
 */
export function lastQuotedPrice(records, customer, skuCode, beforeDate) {
  if (!customer || !skuCode) return null;
  const hits = (records || []).filter(
    (r) =>
      r.skuCode === skuCode &&
      r.customer === customer &&
      typeof r.unitPrice === "number" &&
      (!beforeDate || String(r.at || "").slice(0, 10) < beforeDate)
  );
  if (!hits.length) return null;
  // Most recent by issue date; `at` is an ISO date so a string compare is a date compare.
  hits.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const h = hits[0];
  return { unitPrice: h.unitPrice, unit: h.unit || "lb", at: String(h.at || "").slice(0, 10), purpose: h.purpose || "" };
}
