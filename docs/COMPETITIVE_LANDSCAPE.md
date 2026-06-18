# Competitive Landscape — Keychain (strategic read)

**Status:** strategic positioning · **Owner:** Rick Posada · **Date:** 2026-06-17
**One-liner:** Keychain is a **strategic adjacency** to CheeseShop TECH — *not a partner, not a
competitor.* It operates one layer upstream (sourcing/manufacturing); CST operates downstream
(brand, storefront, channel). The relationship to design for is **leverage**, not rivalry.

> Cross-ref: `POSITIONING.md` (CST's own position), `CST_POSITIONING_BRIEF.md`. This doc is the
> first entry in an ongoing competitive/landscape file — add adjacent platforms here as they surface.

---

## 1. What Keychain is

The self-described **"world's largest platform for CPG manufacturing"** — a B2B network that
connects **brands & retailers** with **vetted manufacturers / co-packers**, plus AI tooling to run
sourcing and private-label development.

- **KeychainOS** — AI operating system for *manufacturers* to manage their production cycle.
- **Keychain360** — supply-chain + product-management platform for *retailers* building private label.
- **Network:** ~30,000 manufacturers, ~20,000 brands/retailers. Users include 8 of the top 10
  retailers (Whole Foods, 7-Eleven) and 7 of the top 10 CPG brands (General Mills, Hershey).
- **Funding:** ~$68M (Series B led by Wellington; Lightspeed, BoxGroup, SV Angel; strategic backers
  General Mills, Hershey, Schreiber, Rich's). Ambition stated as "the operating system for CPG."

## 2. What it costs

No traditional implementation — it's a self-serve web platform (no integration build, no setup fee,
**no brokerage/percentage fee**).

| Who | Cost |
|---|---|
| Brand / retailer (buyer side) | **Free** — no posting or platform fees |
| Manufacturer — basic profile | **Free** |
| Manufacturer — enhanced listing | **$5,000–$100,000 / year** (by # categories, size, capabilities) |
| Transaction / rev-share | **None** |

Reported ranges (trade press); no public price sheet — exact figures are quoted case-by-case.

## 3. Where it sits vs. CheeseShop TECH

| | **Keychain** | **CheeseShop TECH** |
|---|---|---|
| Layer | Upstream — brand ↔ manufacturer ↔ retailer | Downstream — brand → buyer (consumer + wholesale) |
| Core job | *Find & manage who makes it* (sourcing, private label, supply) | *Sell what's made* (DTC + wholesale storefronts, brand, campaigns) |
| Customer | Enterprise retailers, large/mid CPG, manufacturers | Small/specialty **perishable** producers |
| Model | VC-backed horizontal network + SaaS | Boutique vertical studio + multi-tenant platform |
| Wedge | Network effects + manufacturer supply scale | Category fluency; cold-chain + dual B2B/B2C |

## 4. The critical gap — *promote* vs. *sell*

Keychain's "promotion" is **supply-side only**: its matching + marketing automation surface a
**manufacturer** to brands/retailers shopping for a supplier. It does **not**:
- market a finished **brand/product to consumers** (no DTC channel, ads, storefront), or
- promote a product to **retail/wholesale buyers** to get it stocked.

→ *Getting a product/brand in front of the people who buy it* is exactly CST's job. **Keychain
promotes the maker to brands; CheeseShop TECH promotes the brand to buyers.**

## 5. Strategic positioning — why "adjacency," not partner or competitor

- **Not a competitor:** different customer, layer, and job. Keychain wants Whole Foods' private
  label; CST wants the specialty maker's DTC + wholesale presence. They don't bid against each other.
- **Not a partnership (yet):** no public **API, partner program, or developer ecosystem**. Nothing
  to formally integrate or co-sell through today. It's a *tool* (free buyer side) + an *informal
  channel*, not a contracted relationship.
- **So: an adjacency to leverage.** Use it as an input and a funnel; keep CST's IP and moat
  independent of it. The mental model is **"Keychain helps you make it; CheeseShop TECH helps you
  sell it"** — two floors of the same building.

## 6. Reselling their services — what that looks like

You can't "resell" a product that's free on the buyer side — but you can **package it as a managed
service** and charge for the expertise/labor around it:

1. **"Source & Scale" service line.** CST operates Keychain *on behalf of clients* — find a
   co-packer, add capacity, develop a SKU, chase a private-label deal — billed as a growth-services
   engagement. Zero platform cost to CST; new revenue; makes CST useful *before* a storefront exists.
2. **Managed manufacturer listing.** For producer clients (e.g. **Caseificio Monti Trentini**, the
   Italian plant), CST sets up and optimizes the paid **$5K–$100K enhanced listing** — copy,
   imagery, capability/cert verification — as a done-for-you service. CST adds margin on the craft,
   not the platform fee.
3. **Productize the handoff.** A Keychain-sourced brand → CST onboarding ("new client in X steps",
   ties to brand-kit + campaign templates) → live branded storefront fast. The reusable funnel.

## 7. Downstream integration — what it *could* look like

No public API exists today, so a true technical integration isn't available. But the architecture
fit is real, and worth designing toward if Keychain ever opens data access:

- **The vision:** Keychain feeds the *top* of CST's funnel; CST owns everything downstream.
  ```
  Keychain (sourced SKUs, manufacturer + product/spec data, private-label items)
        →  CST canonical catalog (adapter, same pattern as the price-list importer)
        →  storefront · wholesale portal · brand kit · campaigns
  ```
- **What it would take:** a Keychain export/API → a CST **adapter into the canonical schema**
  (CST already has this pattern — spreadsheet/data → tenant item data). A sourced product could then
  bootstrap a client's catalog with one import instead of re-keying.
- **Until then:** the integration is a **manual handoff** — export product/spec data from Keychain,
  import via the existing items importer. Low-tech, still valuable.
- **Guardrail:** never build a CST feature that *depends* on Keychain. Treat any future integration
  as an optional accelerant on top of the canonical layer CST already owns.

## 8. Risks / watch-items

- **Downstream creep:** Keychain bills itself as the "CPG operating system" and is well-funded — it
  *could* expand toward brand/commerce tooling. Monitor; don't react.
- **Platform dependency:** it's free today and has no API — both can change. Use as tool + channel,
  not foundation.
- **Audience mismatch:** Keychain's gravity is enterprise/large CPG; CST's specialty/perishable niche
  is precisely what its network underserves — that's the durable separation, but also why deep
  reliance on its network for CST's small-brand clients may yield thin results.

## 9. Recommended posture

**Leverage, don't partner or fear.** (a) Add the "Source & Scale" managed service using Keychain's
free buyer side; (b) optionally manage Monti's producer listing as the pilot/case study; (c) keep an
eye on a future API for the downstream import play; (d) hold the "make it / sell it" line in
positioning so CST reads as the *complement*, never the competitor. Revisit this doc if Keychain
ships a partner program or API.
