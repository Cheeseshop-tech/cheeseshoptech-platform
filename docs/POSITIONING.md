# CheeseShop TECH — Positioning & Service Model

**Owner:** Rick Posada · **Status:** Foundational (supersedes the narrow "storefront builder" framing) · **Last updated:** 2026-06-05

## What CheeseShop TECH is

A **sales-led growth agency for specialty & perishable food brands.** The main focus is
**driving sales** — through coordinated campaigns across retail channels and social media —
backed by an in-house content studio. The multi-tenant storefront platform is a deliverable
that *serves* this mission; it is not the business itself.

> Reframes the founding brief's one-liner ("a creative-tech agency building e-commerce
> storefronts"), which is too narrow. The storefront is the conversion endpoint and data hub —
> the sales engine is the product.

## The three pillars

1. **Sales (the engine).** Coordinated campaigns that drive sell-through across BOTH retail
   channels (distributors, grocers, restaurants, chains) and DTC — orchestrated together, not
   run in silos. This is the productized version of the founder's own specialty-food sales
   motion (cf. Monti Trentini sales operation).

2. **Social media.** Campaigns run across social in lockstep with retail pushes, so the two
   amplify each other (a retail launch and a social launch reinforce, not compete).

3. **Content studio.** In-house production of photography, video, and copy that fuels the
   campaigns and the storefronts. The creative engine behind everything.

## Cross-platform media hub (asset management + external access)

A core platform capability: a **branded media hub** per client — a single source of truth for
brand and product media — with **role-based access for outside parties**:

- **Clients** — manage and organize their own media library.
- **PR firms** — pull approved press / media kits.
- **Influencers** — grab approved content kits for posts.
- **Third-party content creators** — upload and collaborate on new assets.

This is the **distribution & collaboration layer for the content studio**: the studio produces
the content, the hub controls who can access it and how. Architecturally it extends the existing
Cloudinary per-client media layer (Ops Manual §6); what's new is **external user roles +
permissions + an access portal**. Connects the chain: content studio (produce) → media hub
(store, permission, distribute) → campaigns (deploy across retail + social).

**Implications:** access-control model must support multiple external roles per client (not just
client logins); approval/state on assets (draft vs. approved-for-press vs. approved-for-influencers);
audit of who pulled/contributed what. Feeds the Phase 3 (auth) and design-system scope.

## How the platform fits

The storefront platform (Cloudflare → Netlify → React shell, per the Cowork Brief / Ops Manual)
is the **DTC capture point and client dashboard** — where the demand the agency generates gets
captured, measured, and reported back. Content feeds campaigns; campaigns drive retail
sell-through and DTC; the platform captures and measures the DTC slice and surfaces the data.

## Why this beats "just use Shopify" (sharpened)

Shopify is a checkout tool. CheeseShop TECH is the team that **drives the sales** — across every
channel — with the **content** to back it and a **storefront** to capture it. A brand on Shopify
still has to generate its own demand, shoot its own content, and work its own retail accounts.
CheeseShop TECH does all three and gives them the storefront too.

## Implications to carry forward

- **Pricing model** (`PRICING_AND_ENGAGEMENT_MODEL.md`) should reflect campaign/retainer +
  content production services, not just build/operate of a website. Revisit tiers with sales +
  content scope in mind.
- **Design Guide / content standards** (`DESIGN_GUIDE_STARTER.md` Part C) gain weight — the
  content studio is a core service, so photography/video/copy standards are revenue, not overhead.
- **Connectors that matter:** social scheduling/analytics, retail/distributor data, CRM
  (HubSpot), and campaign performance reporting — feed the client dashboard.
- **Brief update needed:** revise the founding brief's one-liner and scope to lead with
  sales + social + content, with the platform as the supporting layer.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
