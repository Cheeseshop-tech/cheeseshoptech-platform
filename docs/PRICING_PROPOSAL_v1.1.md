# CheeseShop TECH — Pricing Proposal v1.1 (proposed numbers)

**Date:** 2026-07-02 · **Status:** PROPOSED — validate against the first 2–3 prospect
conversations before locking. **Structure doc:** `PRICING_AND_ENGAGEMENT_MODEL.md` (the model);
this doc = the concrete numbers and the sales motion.

**Basis:** CST marginal cost per tenant ≈ $0 infra + $5–15/mo agent API usage. Market comps
(2026): content/marketing retainers for small brands $1,500–$10K/mo, small-business sweet spot
$2,000–$5,000/mo — content only, no software. CST bundles software + brand orchestration +
campaign execution: price below a full agency, far above a website care plan, defensible
against both.

---

## 1. Onboarding — the "Stand-Up Month" (one-time)

Sold as a fixed-deliverable package, never hours. The promise: **"In 30 days: your branded
portal live on your subdomain, catalog + live inventory loaded, brand kit built, buyer-facing
trade deck, first campaign staged."** The intake kit (`onboarding-kit/`) is the closing prop —
*"your team fills six files, we do everything else."*

| Tier | Fits | Fee |
|---|---|---|
| Starter | ≤50 SKUs, no CRM, link-out storefront | **$2,500** |
| Growth *(Monti-scale)* | ≤250 SKUs, CRM + trade deck + storefront embed | **$5,000** |
| Premium | 250+ SKUs, headless storefront rebuild, custom modules | **$9,500+** |

Payment: 50% to start, 50% at launch. Out-of-scope work → change order.

## 2. Monthly tiers (recurring)

| Tier | What they get | Monthly |
|---|---|---|
| **Portal** | The software: quoting/proforma, live inventory sync, image catalog, trade deck hosting, care & updates | **$650** |
| **Orchestration** *(target tier)* | Portal + brand-kit management, Content Engine (8–10 finished assets/mo), one campaign/quarter, market-news brief | **$1,500** |
| **Growth Partner** | Orchestration + monthly campaigns, forecasting & replenishment briefs, agents (A1–A5 as they ship), quarterly strategy session | **$3,000** |

Most prospects should land at **Orchestration**; Portal exists so "no" becomes "start smaller."
Agent API cost inside these tiers: $5–15/mo — low single-digit % of fee.

## 3. Buyout

Per the model doc formula: `migration labor + N × monthly fee` with **N = 18 months**
(proposed). The documented clean exit is a sales tool — put it in the original contract.

## 4. Sales motion

1. **Demo tenant = the showroom** (`demo.cheeseshoptech.com` / `?client=demo`): 2-minute
   walkthrough of the empty portal — "this is day one."
2. **"Here it is with YOUR products"** — the anchor moment: Monti's portal as the lived-in
   example (with permission), or a 3-SKU mock in their brand colors (15 min via the clone).
3. **Anchor against the assembled alternative:** HubSpot Marketing + a DAM + a quoting tool +
   a freelance designer ≈ $2–4K/mo — with nobody orchestrating it.
4. **Close on the Stand-Up Month** — fixed fee, fixed deliverables, 30 days, intake kit in hand.

## 5. Deal levers (early clients)

- **Founding-client credit:** clients #2–3 get **half the onboarding fee credited across
  months 2–4** — locks the retainer, protects the list price.
- **Annual prepay:** 1 month free (8.3%) — take it only for cash-flow, not as a default.
- **Never discount the monthly list price** — move the onboarding credit instead.

## 6. Reference P&L per Orchestration client (monthly)

| | |
|---|---|
| Fee | $1,500 |
| Infra (Netlify/Cloudinary marginal) | ~$0 |
| Agent API | ~$10 |
| Rick's time (target after agents mature) | 4–8 hrs |
| **Gross margin** | **~99% on cash; time is the real cost — agents exist to shrink it** |

## Open validations

- [ ] Prospect flinch test on $5,000 Growth onboarding (no flinch → raise Premium floor)
- [ ] Orchestration asset count (8–10/mo) vs. actual Studio Director throughput
- [ ] N=18 buyout multiplier — confirm before first MSA
- [ ] Per-task menu prices (model doc §3b) — set when first non-retainer client appears
