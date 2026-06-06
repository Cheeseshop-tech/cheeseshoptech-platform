/* ESM port of pricing-core — the shared quote/price/allocation engine.
   $/lb is MERCHANDISE ONLY (FOB × class-of-trade margin). Freight & handling
   are separate line items, never in $/lb. Contract: canonical schema v1.2. */

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pctOf = (arr, id, key) => {
  const hit = (arr || []).find((x) => x.id === id);
  return hit && typeof hit[key] === "number" ? hit[key] : 0;
};

export function quoteUnitPrice(sku, opts, config) {
  const fob = sku && sku.cost && sku.cost.fob;
  if (typeof fob !== "number") return null;
  const p = config.pricing;
  const tier = pctOf(p.tiers, opts.tierId, "adjustPct");
  const vol = pctOf(p.volumeBreaks, opts.volumeId, "adjustPct");
  const extra = Number(opts.customPct) || 0;
  return round2(fob * (1 + (tier + vol + extra) / 100));
}

export function lineLbs(sku, qty) {
  return sku.unit === "lb" ? (Number(qty) || 0) * ((sku.pack && sku.pack.netLb) || 0) : 0;
}

export function quoteLineTotal(sku, qty, opts, config) {
  const price = quoteUnitPrice(sku, opts, config);
  if (price == null) return 0;
  qty = Number(qty) || 0;
  return round2(sku.unit === "lb" ? price * qty * ((sku.pack && sku.pack.netLb) || 0) : price * qty);
}

/* Freight + handling as order-level LINE ITEMS, volume-gated at the freight threshold. */
export function freightLines(orderLbs, opts, config) {
  const fr = config.pricing && config.pricing.freight;
  if (!fr || opts.basis !== "delivered") return [];
  orderLbs = Number(orderLbs) || 0;
  if (orderLbs >= fr.thresholdLb) {
    const a = fr.delivered.atOrAboveThreshold;
    return [{ id: "trucking", label: a.label || "Trucking (delivered)", amount: round2(a.perLb * orderLbs) }];
  }
  const b = fr.delivered.belowThreshold;
  const lines = [{
    id: "trucking", label: "Trucking (flat / going rate)",
    amount: round2(opts.truckingOverride != null ? opts.truckingOverride : b.truckingFlat),
  }];
  if (b.processingFlat) lines.push({ id: "processing", label: "Processing & handling", amount: round2(b.processingFlat) });
  return lines;
}

export function quoteOrder(items, opts, config) {
  let totalLbs = 0, merchSubtotal = 0;
  const lines = (items || []).map((it) => {
    const lbs = lineLbs(it.sku, it.cases);
    const unit = quoteUnitPrice(it.sku, opts, config);
    const total = quoteLineTotal(it.sku, it.cases, opts, config);
    totalLbs += lbs; merchSubtotal += total;
    return { code: it.sku.code, name: it.sku.name || it.sku.packing || it.sku.code,
      cases: it.cases, lbs: round2(lbs), unitPrice: unit, lineTotal: total };
  });
  merchSubtotal = round2(merchSubtotal);
  const freight = freightLines(totalLbs, opts, config);
  const freightTotal = round2(freight.reduce((s, f) => s + f.amount, 0));
  return {
    lines, totalLbs: round2(totalLbs), merchSubtotal,
    freight, freightTotal, grandTotal: round2(merchSubtotal + freightTotal),
    basis: opts.basis || "pickup", tierId: opts.tierId, volumeId: opts.volumeId,
    customPct: Number(opts.customPct) || 0,
  };
}

export function activeCampaignFor(sku, audience, campaignsDoc, todayISO) {
  const list = (campaignsDoc && campaignsDoc.campaigns) || [];
  for (const c of list) {
    if (c.startDate && todayISO < c.startDate) continue;
    if (c.endDate && todayISO > c.endDate) continue;
    const ap = c.applies || {};
    const bySku = ap.skus && ap.skus.indexOf(sku.code) !== -1;
    const byCat = ap.category && sku.category && ap.category === sku.category;
    if (!bySku && !byCat) continue;
    const ov = c.override || {};
    if (ov.audience && ov.audience !== audience) continue;
    return c;
  }
  return null;
}

export function listPrice(sku, audience, campaignsDoc, todayISO) {
  const base = sku.list ? sku.list[audience] : null;
  const c = activeCampaignFor(sku, audience, campaignsDoc, todayISO);
  if (!c) return base == null ? null : round2(base);
  const ov = c.override;
  if (ov.mode === "price") return round2(ov.value);
  if (ov.mode === "pct" && base != null) return round2(base * (1 + ov.value / 100));
  return base == null ? null : round2(base);
}

/* FIFO by earliest expiry. Only on_hand lots are shippable (in_transit excluded). */
export function allocate(code, requestedCases, inventory) {
  const sku = inventory && inventory.skus && inventory.skus[code];
  requestedCases = Number(requestedCases) || 0;
  if (!sku) return { allocated: [], shortfall: requestedCases, totalAllocated: 0 };
  const lots = (sku.lots || [])
    .filter((l) => l.status !== "in_transit")
    .slice()
    .sort((a, b) => String(a.expDate || "9999-99-99").localeCompare(String(b.expDate || "9999-99-99")));
  let need = requestedCases;
  const out = [];
  for (const lot of lots) {
    if (need <= 0) break;
    const avail = (lot.cases || 0) - (lot.reserved || 0);
    if (avail <= 0) continue;
    const take = Math.min(need, avail);
    out.push({ lotNum: lot.lotNum, expDate: lot.expDate, cases: take });
    need -= take;
  }
  return { allocated: out, shortfall: Math.max(0, need), totalAllocated: requestedCases - Math.max(0, need) };
}
