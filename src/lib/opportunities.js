// The Opportunity Engine — the join that fuses the three nerve endings into one action
// (docs/MARKET_INTELLIGENCE_SPEC.md §3). Pure function, no I/O: give it the CRM dataset, the
// market signals, and the brand kit; get back ranked "who / why now / what to say" cards, each
// ready to seed a proposal in Content Studio.
//
//   Customer (CRM account + channel + activity)  ─┐
//   Market   (signal: trend + audience + SKUs)     ├─► Opportunity (scored, angle chosen by brand)
//   Brand    (brand kit: story blocks + phrases)  ─┘
//
// The brand story is the SELECTOR, not a passive input: an account+signal pair is only a strong
// opportunity when the signal's trend maps onto brand-story blocks the audience responds to.

import { audienceOf } from "./crm.js";

const TYPE_TIMELINESS = {
  reorder: 1.0,
  intent: 0.9,
  seasonal: 0.8,
  "category-trend": 0.6,
  competitive: 0.5,
};

const firstSentence = (s) => (s ? String(s).split(/(?<=\.)\s/)[0] : "");

/** Collapse CRM orders + activity into a de-duplicated account list (by name). */
function accountsFromCrm(crm) {
  if (!crm) return [];
  const map = new Map();
  for (const o of crm.orders || []) {
    if (!map.has(o.account)) {
      map.set(o.account, { id: o.account, name: o.account, channel: o.channel, lastOrder: o.date, value: o.total || 0 });
    }
  }
  for (const a of crm.activity || []) {
    const acc = map.get(a.who) || { id: a.who, name: a.who };
    if (!acc.activity) { acc.activity = a.what; acc.activityWhen = a.when; }
    map.set(a.who, acc);
  }
  return [...map.values()];
}

/** Story blocks from the brand kit that speak to an audience (key + title + body). */
function blocksForAudience(brandKit, audience) {
  const blocks = brandKit?.storyBlocks || [];
  if (!audience) return blocks;
  return blocks.filter((b) => (b.audience || []).includes(audience));
}

/** Resolve a signal's product ids → concrete SKU codes, if a catalog is supplied (optional). */
function skuCodesFor(signal, catalog) {
  if (!catalog) return [];
  const byId = new Map((catalog.products || []).map((p) => [p.id, p]));
  const codes = [];
  for (const pid of signal.skus || []) {
    const product = byId.get(pid);
    const code = product?.skus?.[0]?.code;
    if (code) codes.push(code);
  }
  return codes;
}

/**
 * Rank opportunities across accounts × signals.
 * @param {{crm?:object, signals?:Array, brandKit?:object, catalog?:object}} input
 * @returns {Array} sorted best-first; each: { id, accountId, who, audience, whyNow, angle,
 *          headline, intro, storyKeys, signalKeys, skuCodes, score, factors }
 */
export function rankOpportunities({ crm, signals, brandKit, catalog } = {}) {
  const sigs = signals || [];
  if (sigs.length === 0) return [];

  const accounts = accountsFromCrm(crm);
  // If the CRM is empty (or not wired), fall back to segment-level opportunities so the surface
  // still has something to show — one synthetic "account" per audience the signals target.
  const targets = accounts.length
    ? accounts.map((a) => ({ account: a, audience: audienceOf(a) }))
    : ["distributor", "foodservice", "retail"].map((aud) => ({
        account: { id: `segment-${aud}`, name: labelForAudience(aud), segment: true },
        audience: aud,
      }));

  const out = [];
  for (const { account, audience } of targets) {
    if (!audience) continue; // non-buyer channel (e.g. Partner / Producer) — skip
    const audBlocks = blocksForAudience(brandKit, audience);
    const audBlockKeys = new Set(audBlocks.map((b) => b.key));

    // Best-fitting signal for this account.
    let best = null;
    for (const sig of sigs) {
      if (!(sig.audience || []).includes(audience)) continue;
      const matched = (sig.storyHints || []).filter((k) => audBlockKeys.has(k));
      const scored = score({ sig, account, matchedCount: matched.length });
      if (!best || scored.score > best.score) best = { sig, matched, ...scored };
    }
    if (!best) continue;

    const block = audBlocks.find((b) => best.matched.includes(b.key)) || audBlocks[0] || null;
    const storyKeys = best.matched.length ? best.matched : (block ? [block.key] : []);

    out.push({
      id: `${account.id}::${best.sig.id}`,
      accountId: account.segment ? "" : account.id,
      who: account.name,
      audience,
      whyNow: account.activity || best.sig.insight,
      angle: best.sig.suggestedAngle + (block ? `  (${block.title})` : ""),
      headline: block?.title || best.sig.title,
      intro: firstSentence(block?.body) || brandKit?.voice?.readyPhrases?.[0] || "",
      storyKeys,
      signalKeys: [best.sig.id],
      skuCodes: skuCodesFor(best.sig, catalog),
      score: best.score,
      factors: best.factors,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** Transparent weighting: brand-fit is a first-class factor, not an afterthought. */
function score({ sig, account, matchedCount }) {
  const brandFit = Math.min(matchedCount / 2, 1); // 2 matched story hints = full fit
  const timeliness = TYPE_TIMELINESS[sig.type] ?? 0.5;
  const accountValue = account?.segment
    ? 0.4
    : account?.activity
      ? 1
      : account?.value
        ? Math.min(account.value / 10000, 1)
        : 0.3;
  const raw = 0.45 * brandFit + 0.3 * timeliness + 0.25 * accountValue;
  return {
    score: Math.round(raw * 100),
    factors: {
      brandFit: +brandFit.toFixed(2),
      timeliness: +timeliness.toFixed(2),
      accountValue: +accountValue.toFixed(2),
    },
  };
}

function labelForAudience(aud) {
  return { distributor: "Distributor accounts", foodservice: "Foodservice / chefs", retail: "Specialty grocers" }[aud] || aud;
}
