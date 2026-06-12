# HANDOFF — CheeseShop TECH platform

**Updated:** 2026-06-12 · **HEAD:** `phase-2-6-build` (uncommitted work from the 2026-06-12 Cowork session — see "Latest session" below) · **Surface:** Cowork (Fable 5)
**Read first:** `CLAUDE_CODE_BRIEF.md` → this → `docs/DEVELOPMENT_PLAN.md` → `docs/BUILD_LOG.md` (top) → `docs/BEST_PRACTICES.md`.

## Latest session (2026-06-12, Cowork)
- **MT ownership approved.** Stefano presented the platform to Monti Trentini ownership — positive, move-forward response. Phase C green-lit and shipped same day.
- **Phase C shipped: Trade Portal → generic Presentations tool.** `src/components/presentations/presentations-page.jsx` — config-driven decks (`presentations` block, schema extended), responsive viewer (touch swipe + arrow keys + fullscreen + thumbnail rail + neighbour preload), nav tab appears only for tenants with decks. Slides extracted from the deployed web deck and re-encoded WebP 1600px (7.2 MB PNG → 0.8 MB) → `public/presentations/montitrentini/`. Monti's trade-portal tool flipped external → internal route `presentations`. Deep links: `?page=<key>` now seeds the initial page (e.g. `?client=montitrentini&page=presentations` for buyers). The two standalone trade-portal Netlify sites are now redundant once this deploys.
- **`docs/DEVELOPMENT_PLAN.md` added** — the rewritten roadmap: the three standalone Monti apps (trade portal web+mobile, image catalog, mt-e-comm shop) become reusable platform tools (Phases A–E). Local sources live under `~/Documents/Claude/Projects/`.
- **Phase B shipped: buyer-facing Image Catalog ported into the platform.** New `src/components/catalog/buyer-catalog.jsx` (search, category chips, grid/list, lightbox, view/download/copy-share via Cloudinary) + `src/lib/catalog.js` data seam (pricing.js pattern, `VITE_CATALOG_BACKEND=mock`) + `src/data/montitrentini/buyer-catalog.json` (103 images, extracted from `catalog-deploy-2`). The Catalog nav page now renders this; the old component-showcase demo was removed from `App.jsx` (copy in `archive/backup_2026-06-12_before_catalog_port/`).
- **Phase A1 shipped:** Monti tools now include **Trade Portal** (external link) and **Image Catalog** (internal route `catalog`); Media-hub tile relabeled "Media hub". `presentation` icon added to `lib/icons.js`.
- **Verified:** `npm run validate:clients` ✓ and `npm run build` ✓ (run in an isolated Linux copy; local `node_modules` untouched). NOT yet committed/pushed — review, commit, push to `phase-2-6-build` to deploy.

## Live now
- **Staging app:** https://cheeseshoptech-platform.netlify.app — git-connected, **auto-deploys from `phase-2-6-build`**.
  - **Front door = pilot PASSCODE gate** (live: `VITE_AUTH_MODE=passcode` + `PORTAL_PASSCODE` set team-level in Netlify). Monti: `/?client=montitrentini` → passcode → green Operations Portal. House (agency): `/?app=1` → passcode → terracotta Command Center.
  - **To give Monti access:** the URL `https://cheeseshoptech-platform.netlify.app/?client=montitrentini` + the passcode Rick chose. (Mind the no trailing comma — a stray `,` breaks the tenant lookup and falls back to the house view.)
- **Public:** https://cheeseshoptech.com — Netlify Drop coming-soon, **not git-connected** (pushes don't touch it).
- **Real backend live:** Media hub on Cloudinary (cloud `sofcvmwa`, 103 Monti assets). Everything else = realistic mock/sample behind ready-to-flip seams.

## Where we are — the build is feature-complete; remainder is launch wiring (content + secrets)
- **Phases 0–6 — COMPLETE.** Domain + apex coming-soon, design system + component catalogue, roles/tenant-scoping, Media hub (real Cloudinary), CRM connector + Dashboard/Orders, Campaigns. Detail in the phase docs.
- **Pricing & Inventory tool — LIVE** (native, Monti). Proforma (class-of-trade quoting) · Movement report (forecast-core) · Commitments. Freight as line items (Trucking $0.30/lb + Processing $135 under 1,500 lb); lot#/expiry inline; Print/PDF. Engines `src/lib/pricing-core.js` + `forecast-core.js`; data seam `src/lib/pricing.js` (mock-bundled `src/data/montitrentini/*.json`).
- **Home = the Operations-Portal hub** (`components/home/home-hub.jsx`) — the standard client landing: brand-gradient masthead + overlapping stat rollup + tinted tool-launch cards, content-driven (config `home` block) + token-themed. Monti shows real ops stats (via `getPricingData`); house shows a CheeseShop-branded "Command Center" cross-tenant rollup. Client tenants also get an "At a glance" command-center section (pipeline/campaigns/activity/overdue). `home-dashboard.jsx` deleted.
- **Auth = pilot passcode (LIVE).** `PasscodeGate` + `functions/gate.js` (checks server-side `PORTAL_PASSCODE`); synthetic `client` session on unlock. One shared code for the single-client pilot. **Clerk** planned at client #2 (per-user accounts + roles + orgs=tenants). Identity code retained but `identity` mode is no longer the active path. See AUTH_AND_ROLES "Pilot auth".
- **Brand — house = Terracotta `#9A3B1B` + Cellar Olive `#5F6B2E`; clients keep their own.** Warm-artisanal house (matches the wordmark). Tenants override their color — Monti = Forest Green `#064E22` / Italia Green `#009640`. Warm house vs. coloured client + the "Agency Console" sidebar eyebrow = the agency-vs-client distinction. DESIGN_SYSTEM A2/A5.
- **Design — "Ledger" pass COMPLETE** (inc 1+2). Editorial italic-serif display house-wide via the shared layer; all KPI/stat tiles on the one shared `ui/stat.jsx` (`icon`/`onClick`/`tone`/`accent` props).
- **All backend seams code-complete + env-gated** (mock default, secrets server-side): CRM (`functions/crm.js`, Make), Storefront/Shopify-headless (`functions/store.js` products + `functions/store-orders.js` orders; admin hydrates via `fetchStoreProducts`/`fetchStoreOrders`), Campaigns (`functions/campaigns.js`, Make). All env vars in `.env.example`.
- **Branch hygiene — clean.** `phase-2-6-build` canonical + synced (0/0). `main` = stale scaffold (untouched). No sprawl.

## In flight / not done — Phase 7 launch (Rick's actions; mostly feeding the pipes)
The platform = the Monti **month-long stand-up** (connect tools → strategy → content/photography → campaigns within a month). Every connection's CODE is built; the month is about feeding them. See [[monti-pilot-launch]] (memory) and `LAUNCH_AND_MAINTENANCE.md`.
- **[done] Auth** → passcode gate LIVE. ✓
- **CRM** → keep **sample data** for the pilot. Monti = **HubSpot** (config `crm:hubspot`); Salesforce never active → dead/ignored. HubSpot has **no deals yet** → wire it (Make scenario, **steps in `CRM_CONNECTOR.md`**) once populated. Code ready (`MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make`).
- **Storefront** → Shopify headless. Needs a **real Shopify store w/ Storefront API** (mt-e-comm is a static mock) + `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_TOKEN` / `SHOPIFY_ADMIN_TOKEN` + `VITE_STORE_BACKEND=shopify`. Post-token code is small (hydrate already wired).
- **Media** → Cloudinary live; needs the actual **photography/content** uploaded.
- **Campaigns** → code-ready; needs strategy + a data source.
- **Domain** → point `montitrentini.cheeseshoptech.com` (DNS) for a clean branded URL instead of `?client=`.
- **SSL** → Cloudflare SSL = Full(strict) + registrar auto-renew (`LAUNCH_AND_MAINTENANCE.md` §5).

## Open threads
- Real **class-of-trade %s** + two freight confirmations → pending Stefano (placeholders in; config-tunable).
- `docs/PRICING_AND_ENGAGEMENT_MODEL.md` still has `$___` + buyout-multiplier `N` to set.
- **Auth at scale:** swap passcode → **Clerk** when client #2 signs (closes the shared-passcode limits: one code, client-side unlock flag, `?app=1` house reachable).
- A separate `CheeseShopTECH_Brand_Foundation.md` (referenced, not in this repo) still describes the old cool-studio/green house — update it to terracotta + Cellar Olive if it exists.

## First message for the next surface
> Read `CLAUDE_CODE_BRIEF.md` + this `HANDOFF.md` + `docs/BUILD_LOG.md` (top). Confirm: platform = CheeseShop TECH, clients = tenants; `phase-2-6-build` is the source of truth; differentiation = tokens + content only. **The build is feature-complete and the Monti pilot portal is LIVE behind a passcode gate.** Remaining work = Phase 7 launch wiring, which is mostly Rick feeding content/secrets into already-built seams (Shopify token, HubSpot once it has deals, photos → Cloudinary, the subdomain, SSL). Don't wire integrations that have no data/content behind them yet. Propose the plan before executing.

## How to run / verify (dev)
`export PATH="/tmp/node-v22.18.0-darwin-arm64/bin:$PATH"` (bootstrap Node — see BEST_PRACTICES §4) → `npm install` once → `npm run dev` → preview `?client=montitrentini`. For the passcode gate locally: `VITE_AUTH_MODE=passcode VITE_PORTAL_PASSCODE=monti npm run dev` (DEV checks the passcode client-side; no functions server needed). `npm run build` + `npm run validate:clients` before any push. Verify a deploy by grepping the staging JS bundle for a string unique to the latest commit (Netlify's hash ≠ local).
