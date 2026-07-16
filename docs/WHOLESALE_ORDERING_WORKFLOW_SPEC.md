# Wholesale Ordering Workflow — canonical spec

**Date:** 2026-07-16 · **Status:** DIRECTION SET (Rick) — phases 1–4 not built
**Decision:** wholesale pricing + PO submission evolve INSIDE the portal catalog.
The ecomm platform (Storefront, currently mock) is reserved for future D2C retail only.
Related: `docs/PROPOSAL_BUYER_EMAIL_GATE_SPEC.md`, quoting principles (FOB SEAFRIGO base,
class-of-trade margins, catch vs. exact weight), wiring-audit P0 #5 (price freeze).

## The workflow (as-is + target)

1. **Inquiry** — customer phones/emails a rep with quantities + pricing request. Logged in CRM.
2. **Proforma** — rep builds it in the Pricing Tool: customer, class of trade, basis
   (pickup EXW / delivered), quantities. Quote carries a **valid-before date**.
3. **Reference** — customer browses the Product Catalog for detail. **No pricing** on the
   anonymous/reference surface — that stays true permanently; pricing appears only behind sign-in.
4. **Target state** — signed-in wholesale customer sees THEIR price level in the catalog and
   submits an order/PO from it → rep confirms → feeds pipeline stages (PO Received / Processing /
   Shipped, the designed Part E flag) → eventually Bill / Collect.

## Why portal, not ecomm-with-wholesale-login

- **Pricing truth already lives here.** Price List Creator is canonical (FOB base,
  class-of-trade margins, catch/exact weight, case packs). Shopify B2B duplicates every price
  into a second system — two edit homes, guaranteed drift, violates one-mind-one-body.
- **Wholesale cheese isn't ecommerce.** Catch weight (invoice ≠ order), freight floors,
  quote validity windows, PO + terms instead of card checkout. Ecomm platforms model none of it;
  Shopify B2B additionally requires Plus-tier pricing.
- **It's the CST moat.** In-portal ordering is a sellable platform feature for tenant #2+.
  Wholesale-in-Shopify outsources the stickiest part of the client relationship.
- **The entry ramp exists.** Buyer email gate (spec'd 2026-07-16) = the identity layer:
  pre-authorized email → buyer → customer account → price level. One sign-in serves proposals,
  catalog pricing, PO submission, and contact capture.

## Customer pricing profile (the key new record)

**Confirmed 2026-07-16 (Rick): customer names already exist in the Price List Creator** —
the Proforma tab's customer dropdown (fed today from `commitments.json`), class-of-trade tier
select, custom ±% adjustment, and pickup/delivered basis are all live but hand-picked per quote.
The profile makes them properties of the CUSTOMER instead:

```
customer-profiles (pricing domain — Price List Creator, NOT Media Hub)
  name                 → join key to commitments/proformas today; CRM company later
  classOfTrade         → tier default (existing tier table)
  marginAdjustPct      → negotiated ±% override (existing customPct, made sticky)
  freight              → basis default + lane rate (e.g. $/lb lane or flat), floors still apply
  priceLevel           → resolved output: tier + override + freight = what THIS customer pays
  authorizedEmails     → feeds the buyer gate (phase 2+)
  validityDefaultDays  → default quote window for proformas
```

Selecting a customer in the Proforma auto-fills tier/margin/freight from the profile; the rep
can still override per quote (override is logged on the proforma, doesn't rewrite the profile).

**Ownership rule (stated so it never drifts):** price levels, margins, and freight live in the
**pricing domain**. Media Hub keeps identity+copy only. CRM keeps relationship data. The
customer NAME is the join key across all three, same discipline as the SKU join.

## Build phases

| Phase | What ships | Depends on |
|---|---|---|
| **1** | Proforma valid-before date + price snapshot: quote is *valid until X*; reopened after expiry → "quote expired — request updated pricing," never a silent reprice. Covers wiring-audit P0 #5 for proposals too. | nothing — buildable now |
| **2** | Buyer email gate on proposal links (replaces sharing the base passcode with buyers; captures contacts) | `PROPOSAL_BUYER_EMAIL_GATE_SPEC.md` |
| **3** | Customer pricing profiles + per-customer freight/margin auto-fill in the Pricing Tool; signed-in buyer sees their price level in the catalog (server-side resolution — prices never computed client-side from raw margin data) | 1, 2 |
| **4** | PO submission from the catalog → order record → rep confirmation → pipeline stages (Part E flag on) → Bill/Collect placeholders get real | 3 |

## Non-goals

- No card checkout / payment processing in the wholesale flow — POs + terms, by design.
- No consumer pricing in the portal. D2C retail, if/when it happens, is the Storefront
  (ecomm) channel with its own retail price list — separate surface, separate pricing.
- No per-buyer passwords/accounts yet (Clerk track, separate).
