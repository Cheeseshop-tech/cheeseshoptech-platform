/* ESM port of forecast-core — the Detailed Inventory Movement Report engine.
   demand = max(standing commitments, captured run-rate) × horizon;
   supply = on-hand + in-transit; gap = demand − supply → reorder / container rec. */

const round1 = (n) => Math.round(Number(n) * 10) / 10;
const cadenceToMonthly = { weekly: 4.33, monthly: 1, quarterly: 1 / 3, on_order: 0 };

export function committedMonthly(commitments, code) {
  const list = (commitments && commitments.commitments) || [];
  let m = 0;
  for (const c of list) {
    if (c.skuCode !== code || c.kind !== "standing_plan" || c.status === "inactive") continue;
    const factor = cadenceToMonthly[c.cadence] != null ? cadenceToMonthly[c.cadence] : 1;
    m += (Number(c.casesPerPeriod) || 0) * factor;
  }
  return round1(m);
}

export function demandByPeriod(movement, code) {
  const recs = (movement && movement.records) || movement || [];
  const out = {};
  for (const r of recs) {
    if (r.skuCode !== code) continue;
    out[r.period] = (out[r.period] || 0) + (Number(r.soldCases) || 0) + (Number(r.missedCases) || 0);
  }
  return out;
}

export function runRate(movement, code, months) {
  months = months || 6;
  const byP = demandByPeriod(movement, code);
  const periods = Object.keys(byP).sort().slice(-months);
  if (!periods.length) return null;
  const total = periods.reduce((s, p) => s + byP[p], 0);
  return round1(total / periods.length);
}

export function yoyGrowth(movement, code) {
  const byP = demandByPeriod(movement, code);
  const ps = Object.keys(byP).sort();
  if (ps.length < 13) return null;
  const last12 = ps.slice(-12).reduce((s, p) => s + byP[p], 0);
  const prior12 = ps.slice(-24, -12).reduce((s, p) => s + byP[p], 0);
  if (!prior12) return null;
  return Math.round((last12 / prior12 - 1) * 100);
}

export function onHand(inventory, code) { const s = inventory.skus[code]; return s ? (s.casesAvail || 0) : 0; }
export function inTransit(inventory, code) { const s = inventory.skus[code]; return s ? (s.casesInTransit || 0) : 0; }
export function nextEta(inventory, code) {
  const s = inventory.skus[code];
  if (!s) return null;
  return (s.lots || []).filter((l) => l.status === "in_transit" && l.eta).map((l) => l.eta).sort()[0] || null;
}

export function coverage(code, data, horizonMonths) {
  horizonMonths = horizonMonths || 3;
  const { commitments, inventory, movement } = data;
  const committed = committedMonthly(commitments, code);
  const rr = runRate(movement, code, 6);
  const monthly = Math.max(committed, rr || 0);
  const demand = round1(monthly * horizonMonths);
  const oh = onHand(inventory, code), it = inTransit(inventory, code);
  const supply = oh + it;
  const gap = round1(demand - supply);
  const reorderCs = Math.max(0, gap);
  return {
    code, committedMonthly: committed, runRate: rr, yoy: yoyGrowth(movement, code),
    monthly: round1(monthly), horizonMonths, demand,
    onHand: oh, inTransit: it, nextEta: nextEta(inventory, code), supply,
    gap, reorder: gap > 0, reorderCases: reorderCs,
    flagContainer: monthly > 0 && reorderCs >= monthly * 2,
    hasSignal: committed > 0 || rr != null,
  };
}

export function report(codes, data, horizonMonths) {
  return codes.map((c) => coverage(c, data, horizonMonths))
    .sort((a, b) => (b.reorder - a.reorder) || (b.gap - a.gap));
}
