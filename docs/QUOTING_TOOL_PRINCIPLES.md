# Quoting Tool — Operating Principles

Status: 2026-06-18 · Owner: Rick Posada · Source: Rick's brain dump, grounded against the live
config (`src/data/montitrentini/client.config.json`) + engines (`pricing-core.js`, `forecast-core.js`).
This is the canonical "why" behind the Pricing & Inventory tool — the **one mind**. Code implements it;
this doc governs it. When code and this doc disagree, fix one on purpose.

## 1. What the tool is
A live negotiation + inventory-confirmation instrument. In one place it lets the sales/buying team:
confirm what's actually sellable (and for how long), craft a customer-specific price that respects
channel economics, fold in the real fees, and produce a proforma the customer approves — which then
becomes the warehouse pick/weigh order and the final invoice. It is also the price-control and
inventory-health dashboard for the team.

## 2. Cost basis (the anchor)
- Base = **landed FOB price at SEAFRIGO, NJ** — the cost point all pricing is built from.
- Quoted as **price per pound** for catch-weight bulk, and **per unit** for exact-weight items
  (precuts and the Apericheese selection).
- $/lb is **merchandise only**. Freight, handling, and processing are **separate line items**, never
  folded into $/lb (protects price transparency and channel trust).

## 3. The proforma is a QUOTE — what's firm vs estimate
The proforma's job is to quote, not to invoice. So:
- **Firm / solid figure: the price per pound** (and per-unit for exact-weight). That's the number being
  agreed to and it does not move.
- **Estimate: the line totals and the grand total** — because bulk cheese is **catch weight** (actual
  weight per piece varies), the totals are computed from *average* weights and will settle on the final
  invoice after the warehouse weighs each item.
- **Estimate: the trucking fee** — a placeholder until **confirmed with the logistics provider**.
- **Exact weight (precuts + Apericheese):** per-unit totals are firm.

**Standard liner notes on every proforma** (the disclaimer language):
> Prices are quoted per pound (firm). Bulk cheese is sold by catch weight — line and order totals are
> **estimates based on average weights; the actual weight of each item will vary** and is confirmed when
> the order is weighed at the warehouse. The trucking fee shown is an **estimate pending confirmation
> with the logistics provider**. Processing and logistics are billed as separate line items.

Workflow: quote/proforma (firm $/lb, estimated totals) → customer approves → warehouse picks + weighs +
logistics confirms trucking → **final invoice** = actual weighed lb × agreed $/lb, with processing and
logistics as separate line items.

## 4. Inventory confirmation + shelf life (the perishable balancing act)
- **You can't sell what you don't have** — every quote confirms live stock first.
- Shelf life is the clock: products run 6–12 months. The **ultimate goal is to move product while it
  still carries maximum shelf life**, so distributors/markets have time to sell through to the consumer.
- **Hard rule: move product before its expiration is under ~4 months.** Below 4 months remaining = urgent.
- Allocation is **FIFO by earliest expiry** (shortest-dated stock goes first) — already in `allocate()`.
- Maintain stock for regular customers (standing commitments) and deliver them the longest shelf life.

## 5. Cost-of-goods watch (competitive positioning)
- Landed cost moves with **tariffs and FX**; competitive price positioning is a balancing act.
- **Don't overbuy in a downward market** — you risk owning goods at a higher cost than competitors.
- Implication for the tool (future): track landed-cost changes over time so pricing and buying
  decisions see cost trend, not just a static number.

## 6. Fees, minimums, maximums (built into the price)
- **MOQ / pallet math: 1,500 lb** ≈ one pallet max, and the line in the sand for fees.
- **Processing fee: flat $135** on delivered orders **under 1,500 lb** (waived at/above 1,500 lb).
- **Trucking: local tri-state minimum $300** when a customer needs delivery; longer distances cost more
  (rep overrides with the real rate). On the proforma it is an **estimate until confirmed with the
  logistics provider**. Pickup (EXW SEAFRIGO) = no freight lines.
- Volume breaks: under 1,500 lb 0% · 1,500 lb+ −5% · full pallet −8% · full container −12%.
- Price augmentation features exist to keep the order **profitable against SEAFRIGO storage + packing
  fees** — pricing is engineered around these minimums/maximums.

## 7. Class of trade (protect the channel)
Monti Trentini are cheese **producers** and, in the US, **importers**. Their customers are: other
importers (who also distribute), retail-focused distributors, and food-service distributors.
Industry-standard downstream margins to respect:
- **Importer:** +15% minimum
- **Retail distributor:** +20–30%
- **Food-service distributor:** +25–35% (higher service: frequent/emergency delivery, higher default risk)

Principle: **don't disrupt the industry pricing model.** Even when Monti sells **direct**, price as if the
appropriate channel margin were present — so Monti holds market value and doesn't undercut the
distributor it ultimately wants to hand the business off to. Monti's play is to *develop* a customer
direct, then hand it to a distributor in that class of trade.

## 8. Forecasting (the destination — needs history)
Goal: monthly + yearly projection/forecasting. Requires accumulated history (sold + missed movement,
quotes, commitments). `forecast-core.js` already computes run-rate, YoY, demand-by-period, and
reorder/container recs — but only as good as the history it's fed.

## 9. One mind, one body — data ownership map
**One mind** = a single source of truth per data type; never duplicated. **One body** = every surface
reads from those sources and writes back to them, so the whole ecosystem stays consistent.

| Data | Single owner (source of truth) | Status |
|---|---|---|
| Cost/FOB, list price, case packs (catch vs exact) | `catalog.json` (HQ / Sales Management) | ✅ canonical |
| Pricing rules: tiers, margins, freight, fees, min/max | `client.config.json` → `pricing` | ✅ canonical |
| Inventory: stock, lots, shelf life, in-transit | Live store (Netlify Blobs, weekly sync) | ✅ live (2026-06-18) |
| Standing commitments (regular customers) | `commitments.json` | ✅ canonical |
| Movement history (sold / missed cases) | Live store (Netlify Blobs) + localStorage layer | ✅ shared (2026-06-18) |
| Quotes issued (logging) | Live store (Netlify Blobs, `quotes`) + localStorage layer | ✅ shared (2026-08-13) |
| Quote **approvals** (buyer accepted / declined) | not captured yet | ⏳ future (extend the quotes store) |

Movement history lives in a **central shared store** (`netlify/functions/history.js` over Netlify
Blobs, `src/lib/history.js`), so every rep's captures accrue into one record and forecasting can be
trusted.

Issued quotes now do the same (2026-08-13, Quote Builder): `netlify/functions/quotes.js` over the
Blobs store `quotes`, with `src/lib/quotes-log.js` as the client seam — identical shape, guards and
caps to the movement pair. **One record per SKU line** on a printed quote, grouped by `quoteId`, so
the store is queryable per customer+SKU the way movement history is per SKU+period. Written on the
explicit Generate/Print action only, never on keystroke. The first consumer is the Price Change
Notification's "Previous $/lb" auto-fill (`lastQuotedPrice`): the last price quoted to this customer
for this SKU, from any purpose, before the notice's effective date.

Note the log accrues **forward only** — it starts empty, so the first price-change notice for any
customer shows "no prior quote on file — enter manually" until a quote has gone out through this
tool. That is the honest state, not a bug.

Remaining: quote **approvals** (buyer accepted / declined) — same store, one more record type.

## 10. Gap log (build backlog, against this doc)
1. **Shelf-life alerts** — surface remaining shelf life at quote time; flag lots < 4 months as "must move." (high)
2. **Class-of-trade alignment** — tiers currently distributor(0) / direct-retail(+15) / direct-consumer(+35);
   reconcile to the importer/retail/food-service margin bands above (pending Sales Management sign-off). (high)
3. **Trucking $300 local minimum** — engine uses $0.30/lb with no floor; add the tri-state min. (quick)
4. **Catch vs exact weight in UI** — mark catch-weight lines "estimate", exact-weight "firm"; carry the
   proforma → weighed → final-invoice states. (med)
5. **Central history store** — persist quotes + movement so forecasting has real, shared history. (high; unlocks §8)
6. **Cost-of-goods / tariff + FX watch** — landed-cost versioning + trend. (future)
