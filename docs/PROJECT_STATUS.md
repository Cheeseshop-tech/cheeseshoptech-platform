# CheeseShop TECH — Project Status & Launch Tracker

**Living checklist** for the platform + the Monti Trentini pilot. Check items off as they land.
Code/decision history lives in `docs/BUILD_LOG.md`; current-state snapshot in `HANDOFF.md`; this
doc is the **big-picture "definition of done."**

**Updated:** 2026-06-12 · **Headline:** the platform is absorbing the three standalone Monti apps
(trade portal, image catalog, shop) as reusable tenant tools — roadmap in `DEVELOPMENT_PLAN.md`.
Launch wiring (domain/SSL/handoff) and feeding (content, deals, strategy) continue in parallel.

> Convention: `[x]` done · `[~]` ready/waiting on data or secrets · `[ ]` not started.

---

## ▶️ Next 5 steps (in order)

1. [ ] **Commit + push the 2026-06-12 work** to `phase-2-6-build` (catalog port, Presentations tool, plan docs) so staging shows it. *(Rick reviews, then push)*
2. [ ] **Capture MT ownership feedback** from the client presentation (what landed, what they want next) → `monti_trentini` project notes. *(Rick)*
3. [x] **Subdomain LIVE (2026-06-12):** `https://montitrentini.cheeseshoptech.com` — CNAME (DNS-only) → platform site, Netlify cert issued. Wildcard `*.cheeseshoptech.com` still points to the coming-soon site (proxied); specific records override it per tenant.
4. [ ] **SSL hardening** — Cloudflare SSL → Full (strict) + registrar auto-renew. *(Rick — quick check while in Cloudflare)*
5. [ ] **Netlify passcodes** — add team-level `PORTAL_ADMIN_PASSCODE` + `PORTAL_HOUSE_PASSCODE`, trigger deploy (activates the F1 role tiers in prod). *(Rick — in progress)*
6. [ ] **Feed content** — photography → R2 archive (`cheeseshoptech-media-archive` bucket created 2026-06-12, folder `monti-trentini/`) + Media hub; HubSpot pipeline → then wire the CRM connector (`CRM_CONNECTOR.md`). *(Rick, then Claude wires)*

> **2026-06-12 milestone:** The client lead presented the platform to **MT ownership — positive, approved moving forward.** Portal handoff (old step 1) achieved via that presentation.

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
- [x] **Buyer-facing Image Catalog ported into the platform** (2026-06-12, Phase B of `DEVELOPMENT_PLAN.md`) — `src/components/catalog/buyer-catalog.jsx` + `lib/catalog.js` seam + per-tenant `buyer-catalog.json` (103 images); replaces the old demo Catalog page (backed up in `archive/backup_2026-06-12_before_catalog_port/`)
- [x] **Trade Portal ported into the platform** (2026-06-12, Phase C of `DEVELOPMENT_PLAN.md`) — generic `Presentations` tool (`src/components/presentations/presentations-page.jsx`): one responsive viewer (swipe/keys/fullscreen/thumbnails) replaces the separate desktop+mobile Netlify builds; slides re-encoded WebP (7.2 MB → 0.8 MB) in `public/presentations/montitrentini/`; deck defined in the tenant config `presentations` block; deep-link `?client=montitrentini&page=presentations`
- [x] **MT ownership approval** — The client lead presented the platform to Monti Trentini ownership; positive, move-forward response (2026-06-12)

## 🟡 READY — waiting on data / secrets (the month of work)

- [~] **CRM → HubSpot** — code ready; wire (Make scenario) once HubSpot has deals. (Salesforce dead/ignored.)
- [~] **Storefront → Shopify** — code ready; needs a real Shopify store w/ Storefront API + `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_TOKEN` / `SHOPIFY_ADMIN_TOKEN` + `VITE_STORE_BACKEND=shopify`
- [~] **Campaigns backend** — code ready; needs a data source
- [~] **Real class-of-trade %s** + two freight confirmations — pending Sales Management (class-of-trade %s) + Traffic (freight)
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
