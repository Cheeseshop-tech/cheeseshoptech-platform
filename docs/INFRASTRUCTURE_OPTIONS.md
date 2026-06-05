# CheeseShop TECH — Infrastructure Options (Security, Scale, Checkout)

**Owner:** Rick Posada · **Status:** Decision input (consult stage) · **Last updated:** 2026-06-05

How CheeseShop TECH delivers Shopify-grade reliability without building it from scratch. Core
principle: **don't build robustness, rent it.** The agency is a general contractor assembling
best-in-class managed services behind its own brand — not the bricklayer building payments,
CDN, or DDoS protection from zero. This doc captures the options so the architecture decisions
(especially checkout) can be made deliberately and logged in the Build Log.

> This reframes the "vs. Shopify" disadvantages (solo operator, security, scale, checkout) —
> most are solved by leaning on managed platforms already in or adjacent to the stack.

---

## 1. Traffic surges & scale — largely already solved

The Option C stack is surge-robust by design:

- **Netlify** serves the React shell as static files from a global CDN. No origin server to
  overload — it scales natively. A traffic spike on a static front end is a non-event.
- **Cloudflare** (already on, proxy enabled) sits in front: edge caching, traffic absorption,
  global anycast. Soaks up surges before they reach Netlify.

**Verdict:** this disadvantage is mostly already handled by the existing stack. No new spend
required for the front end.

---

## 2. Security — bought, and partly already on

| Layer | Service | Status |
|---|---|---|
| WAF, DDoS, bot protection, edge SSL | **Cloudflare** | On (proxy enabled, Full strict target) |
| Host security, HTTPS | **Netlify** | On |
| Auth | **Netlify Identity** (Auth0 later for enterprise) | Phase 3 |
| Error tracking | **Sentry** | To add |
| Uptime monitoring + alerts | **Better Stack**, **Checkly**, or **UptimeRobot** | To add |
| Secrets | Netlify environment variables | Standard (OM §10) |

Monitoring + alerting directly shrinks the "solo operator asleep at 2am" risk — you learn of a
problem before the client does.

---

## 3. Checkout & payments — the highest-stakes decision

**Never build checkout/PCI/fraud in-house.** Two strong paths, to be chosen per client tier:

### Option A — Stripe (hosted Checkout)
- Stripe owns PCI compliance and fraud. You integrate; you don't carry the liability.
- Cleanest for simpler stores; full control of the surrounding UX.

### Option B — Headless commerce engine (the differentiator)
- Run **Shopify as a back-end** (Storefront API), or **Snipcart / Foxy.io / Medusa**, behind the
  custom CheeseShop TECH front end.
- Clients get **battle-tested, Shopify-grade checkout** while keeping CSTECH design + dashboard.
- Collapses the single biggest gap vs. a straight Shopify account: their checkout robustness
  AND our differentiation.

### Cross-border / tax
- **Paddle** or **Lemon Squeezy** (merchant of record) handle VAT/sales-tax compliance globally.

> **Open decision (log in Build Log):** Stripe vs. headless Shopify as the default commerce
> engine. Shapes everything downstream — make it deliberately, not by accident.

---

## 4. The bus factor — the one you can't fully buy away

Real residual risk: you are the only human. Mitigations:

- Monitoring + alerting (above) and a solid **runbook** (Ops Manual §9 backup/recovery is the start).
- A **backup contractor on call** for outages when you're unavailable.
- Systems documented enough that someone else *could* step in.

This is a real-talk item, not a tooling fix. Honesty here protects the client relationship.

---

## 5. Strategic upshot

With this layered in, the positioning sharpens to:

> *A bespoke, food-specialist storefront with Cloudflare-grade security and Shopify-grade
> checkout — fully managed, and yours to own.*

You stand on the same infrastructure Shopify uses, assembled and managed for a niche, with a
human attached. Pair with `PRICING_AND_ENGAGEMENT_MODEL.md` (the managed-service value) and the
buyout/ownership story (OM §12).

---

## Next actions

- [ ] Decide default commerce engine: Stripe vs. headless Shopify (→ Build Log decision).
- [ ] Add Sentry + an uptime monitor when the React shell ships (Phase 4).
- [ ] Draft a `POSITIONING.md` for sales scripts from this + the Shopify comparison.
- [ ] Identify a backup contractor for outage coverage.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
