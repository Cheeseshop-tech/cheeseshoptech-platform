# CheeseShop TECH — Storefront Strategy (Headless Rebuild)

**Status:** DECISION LOCKED (2026-06-06) · **Owner:** Rick Posada

## The decision

When a client's storefront moves into the portal, we **rebuild the experience layer natively and
go headless** — we do NOT rebuild commerce (checkout, payments, tax). A commerce engine the client
already trusts (their Shopify, or Stripe/Medusa) keeps running the regulated, high-liability parts;
the portal owns everything the customer and the client *see and control*.

This is the productized value-add: "we rebuild, improve, and run your storefront inside the portal."

## Why headless (not full rebuild)

- **Moat:** a native, ingested storefront makes the portal the client's infrastructure, not a dashboard. Far stickier than a link-out.
- **Avoids the trap:** rebuilding checkout/payments/PCI/tax/fraud/fulfillment = rebuilding Shopify badly and owning a client's revenue + uptime as a solo operator. Don't.
- **Bounded economics:** the rebuilt frontend rides the shared shell + design tokens, so per-client build cost stays low (Part E discipline: differentiation = config, not forked stores).
- **Clean buyout:** the client's headless frontend can fork out at buyout; the platform core stays Posada & Co. (canonical rule preserved).
- **Owns the data:** the portal becomes the conversion + analytics capture point that feeds the dashboard (POSITIONING).

## What we own vs what the commerce engine owns

| Portal (we build/own) | Commerce engine (Shopify/Stripe/Medusa) |
|---|---|
| Storefront frontend + design (tokens) | Checkout & cart |
| Product merchandising & content | Payments + PCI |
| Storefront Admin (design/products/content/orders view/settings) | Tax, fraud |
| Customer experience, SEO surface | Inventory source of truth, fulfillment |
| Analytics surfaced in the dashboard | Order/transaction system of record |

Integration = the commerce engine's API (e.g. Shopify Storefront/Admin API). The Storefront Admin's
**"Publish" seam (`src/lib/store.js` `saveStore`)** is where this lands: it will read/write through a
Netlify function that talks to the commerce API (secrets server-side), replacing the current mock.

## Offering tiers

| Tier | What the client gets | Our liability |
|---|---|---|
| **Connected** | Link-out tile to their existing store (today's default) | None |
| **Headless rebuild** (the value-add) | Native in-portal storefront + admin; commerce engine runs checkout | Low |
| Fully native | We also own commerce | High — only if deliberately chosen |

## Implications

- **Pricing/engagement:** "storefront rebuild" is a billable onboarding deliverable + ongoing operate fee. See `PRICING_AND_ENGAGEMENT_MODEL.md`.
- **Onboarding:** ingest = migrate catalog/content/brand into the tenant config + media hub; preserve SEO/URLs; the commerce engine connection is a setup step.
- **Build discipline:** the rebuilt store is the shared shell skinned by tokens + fed by config/APIs — never a forked per-client codebase.
- **Next build step (when a real client signs):** the `media-list`/`crm`-style Netlify function for commerce (`store`), wired to the client's chosen engine; flip `VITE_STORE_BACKEND` off mock.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
