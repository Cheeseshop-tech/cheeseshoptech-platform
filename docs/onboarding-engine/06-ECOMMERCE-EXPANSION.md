# Future: e-commerce completion

**Status: this is the largest remaining phase, by Rick's own account ("we have a way to go to
complete the big picture," 2026-09-07). Foundations exist for the storefront read path only —
the other six sub-pieces below don't exist in any scope doc anywhere in the repo.**

## What's already real (see `docs/STOREFRONT_STRATEGY.md`, `docs/PROJECT_ROADMAP.md`)

- Decision locked 2026-06-06: portal owns the experience layer (frontend, merchandising, admin,
  analytics); Shopify owns checkout/payments/tax/inventory for the D2C storefront.
- Product-catalog READ from Shopify's Storefront API is built (`netlify/functions/store.js`) but
  has never run against a real store — Monti's current Shopify presence
  (`mt-e-comm.netlify.app`) is a static UI mock.
- Wholesale ordering (portal-native, separate from ecomm) has its own 4-phase plan
  (`docs/WHOLESALE_ORDERING_WORKFLOW_SPEC.md`) — Phase 1 shipped 2026-07-16, Phases 2–4 not built.

## The seven sub-pieces of "e-commerce," per Rick's 2026-09-07 breakdown

1. **Dynamic/self-redesigning storefront** — see `02-CAMPAIGN-AND-STOREFRONT.md`. Not built.
2. **Fulfillment company pricing** — a real vendor/cost integration. Not scoped anywhere.
   Needs: which fulfillment partner(s), their pricing API or rate-sheet format, how that pricing
   surfaces in the storefront or wholesale flow.
3. **Liability management** — for online retail specifically. Not scoped. Needs legal input, not
   just engineering — likely starts as a decision/policy document before any code.
4. **Online-retailer compliance** — unspecified which regulatory regime (food safety labeling,
   state sales-tax nexus rules, age-restricted goods if any apply, ADA/accessibility for the
   storefront itself). Needs scoping to even know what "compliance" covers here.
5. **Payment and tax handling** — Shopify's checkout stack would normally cover payment
   processing and tax calculation if the D2C storefront actually goes live on Shopify's checkout,
   per the 2026-06-06 decision above. Worth confirming that decision still stands before treating
   this as a from-scratch build — it may already be substantially solved by the Shopify choice,
   just not yet activated.
6. **Customer service solution** — no tool, no vendor, no scope exists.
7. **Billing and accounting system** — no tool, no vendor, no scope exists. Likely overlaps with
   whatever CST uses internally for its own agency billing — worth checking
   `../cst-app-costs.md` and asking Rick whether this means Monti's customer-facing billing,
   CST's own agency billing, or both, before scoping.

## What would need to happen before any of this is buildable

1. **The B2B/B2C branch-and-switch architecture decision** (see
   `../cst-business-model-crossroads.md`) — whether every tenant gets one storefront that
   switches mode or genuinely separate B2B/B2C surfaces. This changes the shape of nearly every
   sub-piece above (pricing, compliance, and payment handling especially differ meaningfully
   between B2B and B2C).
2. Confirm whether the 2026-06-06 Shopify decision still stands, given how much has changed since
   — re-litigating a locked decision isn't needed, but confirming it hasn't quietly gone stale is
   worth a quick check.
3. A real Shopify store with Storefront API enabled for Monti — the one concrete next step named
   in `docs/PROJECT_ROADMAP.md` months ago and still not done as of 2026-09-07.

## Sequencing

Last phase in `../CST_UNIFIED_DIRECTION_2026-09-07.md`'s roadmap, after the Fall Show and the
landing/email/social launch. Not scheduled to start yet.
