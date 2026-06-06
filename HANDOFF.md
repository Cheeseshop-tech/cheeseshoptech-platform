# HANDOFF — CheeseShop TECH platform

**Updated:** 2026-06-06 · **HEAD:** `phase-2-6-build` tip (latest: Home hub — Operations-Portal landing) · **Surface:** Claude Code
**Read first:** `CLAUDE_CODE_BRIEF.md` → this → `docs/BUILD_LOG.md` (top) → `docs/BEST_PRACTICES.md`.

## Live now
- **Staging app:** https://cheeseshoptech-platform.netlify.app — git-connected, **auto-deploys from `phase-2-6-build`**. Behind Netlify Identity login (admin `Rick.posada@outlook.com`). Staff: `/?app=1` (house); tenant preview: `/?client=montitrentini`.
- **Public:** https://cheeseshoptech.com — Netlify Drop coming-soon, **not git-connected** (pushes don't touch it).
- **Real backend live:** Media hub on Cloudinary (cloud `sofcvmwa`, 103 Monti assets). Others mock behind seams.

## Where we are
- **Phases 0–6 — COMPLETE/BUILT.** Domain + apex coming-soon, design system + component catalogue, Netlify Identity auth + roles/tenant-scoping, Media hub (real Cloudinary), CRM connector + Dashboard/Orders (mock), Campaigns + Home dashboard. Detail in the phase docs.
- **Pricing & Inventory tool — BUILT + LIVE** (native module, Monti tenant). Proforma (class-of-trade quoting) · Movement report (forecast-core) · Commitments. Fees as line items (Trucking $0.30/lb + Processing $135 under 1,500 lb), lot#/expiry inline on the price list, Print/PDF proforma. Engines: `src/lib/pricing-core.js` + `forecast-core.js`; data seam `src/lib/pricing.js` (mock-bundled `src/data/montitrentini/*.json`).
- **Home = the Operations-Portal hub.** Standard client landing (`components/home/home-hub.jsx`): brand-gradient masthead + overlapping stat rollup + tinted tool-launch cards, content-driven (config `home` block) + token-themed. Monti shows real ops stats (products/cases on hand/on the water/arriving/commitments via `getPricingData`); house shows a CheeseShop-branded "Command Center" cross-tenant rollup. Replaced the old empty data-dashboard. `home-dashboard.jsx` now unused.
- **Brand — house = Terracotta + Cellar Olive; clients keep their own.** House (CheeseShop TECH) brand is Terracotta `#9A3B1B` / Cellar Olive `#5F6B2E` (matches the wordmark; warm artisanal). Tenants override their own color — Monti = Forest Green `#064E22` / Italia Green `#009640`. Warm house vs. green client = the agency-vs-client distinction (plus the Agency Console eyebrow). DESIGN_SYSTEM A2/A5.
- **Design — "Ledger" pass COMPLETE (increments 1 + 2).** Editorial italic-serif display house-wide via shared layer (DESIGN_SYSTEM A3+B4): h1/h2 + CardTitle italic, tabular figures, refined Table/Badge/Card/Stat. **Inc 2:** all KPI/stat tiles now use the one shared `ui/stat.jsx` (gained `icon`/`onClick`/`tone` props; 5 local copies deleted); the agency **house** reads distinct from a tenant via an "Agency Console" eyebrow under the wordmark (type/layout signal, gated on `isHouse` — both stay green). Colors stay per-tenant.
- **Branch hygiene — clean.** `phase-2-6-build` canonical + synced. `main` = stale scaffold (untouched). No sprawl.

## In flight / not done — "finish the build"
- **[done] Home hub** — Operations-Portal composition is the standard landing; **+ "At a glance" command center** (pipeline/campaigns/activity/overdue) folded in for CRM tenants; `home-dashboard.jsx` deleted. ✓
- **Off mock = launch wiring, not code (audited):**
  - **CRM** — *code-complete.* `netlify/functions/crm.js` proxies a Make webhook; flips on `VITE_CRM_BACKEND=make`. **[Rick]: build the Make scenario + set `MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make`.**
  - **Storefront → Shopify headless (Rick's pick).** Products read path **built + ready to flip**: `netlify/functions/store.js` (Storefront API) + `fetchStoreProducts()`; needs **[Rick]** a real Shopify store w/ Storefront API + `SHOPIFY_STORE_DOMAIN`/`SHOPIFY_STOREFRONT_TOKEN`/`VITE_STORE_BACKEND=shopify`. Remaining code (post-token): hydrate admin product list, Admin-API orders. Shopify owns products/checkout; portal owns theme/content. See STOREFRONT_STRATEGY.
  - **Campaigns** — seam ready, real path stubbed; mirror the CRM/store pattern once a data source is chosen.
- **Pricing backend** — still mock-bundled JSON; real Netlify-function backend deferred (same shape).
- **Phase 7 — Monti pilot** — operational launch wiring (Identity test user, Cloudinary verify, Make CRM webhook, SSL) in `docs/LAUNCH_AND_MAINTENANCE.md`. **Rick's dashboard/secret actions.**

## Open threads
- Real **class-of-trade %s** + the two freight confirmations → pending Stefano (placeholders in now; config-tunable).
- `docs/PRICING_AND_ENGAGEMENT_MODEL.md` still has `$___` + buyout-multiplier `N` to set.
- **House brand is settled + documented:** Forest Green primary + Italia Green accent, with **Terracotta `#9A3B1B` kept as the house wordmark/favicon signature** (deliberate, house-only; DESIGN_SYSTEM A2/A5 updated). Agency-vs-client distinction shipped (Agency Console eyebrow + warm wordmark over green chrome). *If a separate `CheeseShopTECH_Brand_Foundation.md` exists outside this repo, it still needs the same update.*

## First message for the next surface
> Read `CLAUDE_CODE_BRIEF.md` + this `HANDOFF.md` + `docs/BUILD_LOG.md` (top). Confirm: platform = CheeseShop TECH, clients = tenants; `phase-2-6-build` is the source of truth; differentiation = tokens + content only. The build is green and deployed. Ledger design pass complete; the **Operations-Portal hub is now the standard home/landing** (shared, config-driven). We're "finishing the build" — pick up from **In flight**: home-hub polish, then CRM/Campaigns/Storefront off mock, then Phase 7 launch wiring. Propose the plan before executing.

## How to run / verify (dev)
`export PATH="/tmp/node-v22.18.0-darwin-arm64/bin:$PATH"` (bootstrap Node — see BEST_PRACTICES §4) → `npm install` once → `npm run dev` (DEV admin auth bypass) → preview `?client=montitrentini`. `npm run build` + `npm run validate:clients` before any push. Verify a deploy by grepping the staging JS bundle for a latest-commit string.
