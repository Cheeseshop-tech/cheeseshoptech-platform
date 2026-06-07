# CheeseShop TECH — Project Status & Launch Tracker

**Living checklist** for the platform + the Monti Trentini pilot. Check items off as they land.
Code/decision history lives in `docs/BUILD_LOG.md`; current-state snapshot in `HANDOFF.md`; this
doc is the **big-picture "definition of done."**

**Updated:** 2026-06-06 · **Headline:** the software is essentially done. What's left is *launching*
(domain/SSL/handoff) and *feeding* (content, deals, products, strategy) — not building.

> Convention: `[x]` done · `[~]` ready/waiting on data or secrets · `[ ]` not started.

---

## ▶️ Next 5 steps (in order)

1. [ ] **Hand Monti the portal + get reactions.** Send Stefano the URL `https://cheeseshoptech-platform.netlify.app/?client=montitrentini` + the passcode. *(Rick)*
2. [ ] **Point the subdomain** `montitrentini.cheeseshoptech.com` (DNS) for a clean branded URL. *(Rick + Claude guides)*
3. [ ] **SSL hardening** — Cloudflare SSL → Full (strict) + registrar auto-renew. *(Rick)*
4. [ ] **Feed content — photography first** → upload Monti product/brand photos to the Media hub (Cloudinary). *(Rick / Monti)*
5. [ ] **Build the HubSpot pipeline** (deals + contacts); then wire the CRM connector (Make scenario, steps in `CRM_CONNECTOR.md`). *(Rick, then Claude wires)*

---

## ✅ DONE — the platform

- [x] Multi-tenant architecture (tenant resolver, token theming, config-driven; no per-client code)
- [x] Repo + auto-deploy CI/CD (Netlify ← `phase-2-6-build`; staging live)
- [x] Design system + "Ledger" editorial pass (inc 1 + 2)
- [x] House brand — Terracotta `#9A3B1B` + Cellar Olive `#5F6B2E`; agency-vs-client distinction (warm house + "Agency Console" eyebrow)
- [x] Monti tenant brand applied (Forest Green / Italia Green)
- [x] **Pilot auth — passcode gate (LIVE)**
- [x] Home = Operations-Portal hub + "At a glance" command center
- [x] Pricing & Inventory tool (class-of-trade quoting, freight line items, lots/FIFO, Print/PDF)
- [x] Catalog · Orders · Campaigns · Media hub · Storefront (admin + embed)
- [x] Media hub **live on real Cloudinary** (103 Monti assets)
- [x] All backend seams **code-complete + env-gated, ready to flip** (CRM, Shopify, Campaigns)

## 🟡 READY — waiting on data / secrets (the month of work)

- [~] **CRM → HubSpot** — code ready; wire (Make scenario) once HubSpot has deals. (Salesforce dead/ignored.)
- [~] **Storefront → Shopify** — code ready; needs a real Shopify store w/ Storefront API + `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_TOKEN` / `SHOPIFY_ADMIN_TOKEN` + `VITE_STORE_BACKEND=shopify`
- [~] **Campaigns backend** — code ready; needs a data source
- [~] **Real class-of-trade %s** + two freight confirmations — pending Stefano
- [~] **Pricing & engagement model** — `$___` + buyout-multiplier `N` to set (`PRICING_AND_ENGAGEMENT_MODEL.md`)

## 🔴 NOT STARTED — launch + content + strategy

**Launch / ops**
- [ ] Hand portal to Monti + UAT sign-off
- [ ] Subdomain `montitrentini.cheeseshoptech.com` (DNS)
- [ ] Production domain cutover (point `cheeseshoptech.com` + `*` wildcard at the platform site; currently a coming-soon Drop)
- [ ] SSL hardening (Cloudflare Full-strict + registrar auto-renew)

**Content (Monti)**
- [ ] Photography → Media hub
- [ ] Product copy / catalog content
- [ ] HubSpot pipeline (deals, contacts)
- [ ] Campaign assets

**Strategy**
- [ ] Campaign strategy set → **campaigns launch (the deadline, ~1 month)**

## 🔮 LATER — post-pilot

- [ ] Swap passcode → **Clerk** (per-user auth + roles + orgs=tenants) when client #2 signs
- [ ] Onboard client #2 (proves the multi-tenant model end-to-end)
- [ ] Update external `CheeseShopTECH_Brand_Foundation.md` (if it exists) to terracotta + Cellar Olive

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co. · keep this honest and current.*
