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

## Business model: coordinated services brokerage

CheeseShop TECH is a **brokerage that bundles services** a brand would otherwise outsource
piecemeal — sales, social, content production, media management, and the storefront — into one
coordinated offering. The **portal is the center** of that brokerage.

The value to the client is three things at once:

1. **Lower cost.** One bundled partner beats four separately-outsourced, separately-marked-up
   vendors (PR firm + content creator + social manager + web dev).
2. **Continuity of timing.** Campaigns land in sync because one team coordinates them — no
   waiting on disconnected vendors who don't talk to each other.
3. **Consistent vision execution.** One brand vision executed coherently, not four vendors each
   interpreting it differently.

This **fragmentation-vs-coordination** story is the real moat — more than the storefront tech.

## Target client (v1)

Small-to-medium specialty food brands with **2–3 operators**, of whom **~2 actually use the
portal**. Implication: the access model can stay **lightweight** for v1 — a handful of users per
client, not enterprise RBAC. Build simple; defer heavy permissioning until client size demands it.

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

**Implications (right-sized for v1):** access-control needs multiple external roles per client
(client, PR, influencer, creator) and asset approval states (draft → approved-for-press →
approved-for-influencers), but **user counts are small** (target clients have ~2 portal users),
so keep it lightweight — basic roles + approval flags, not enterprise RBAC. Scale the
permissioning later if client size grows. Feeds Phase 3 (auth) scope.

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

## Storefront = headless rebuild (locked 2026-06-06)

The flagship platform deliverable: **rebuild a client's storefront experience natively in the portal,
run headless** — a commerce engine (Shopify/Stripe/Medusa) keeps checkout/payments/tax; the portal
owns design, merchandising, content, admin, and the conversion data. This is the moat (portal becomes
their infrastructure) and the productized value-add ("we rebuild, improve, and run your store"),
without taking on payments liability. Full decision + tiers + architecture: `STOREFRONT_STRATEGY.md`.

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
