# CheeseShop TECH — Development Plan v2

**Written:** 2026-06-12 · **Supersedes** the "Next 5 steps" sequencing in `PROJECT_STATUS.md` (which stays as the checklist; this is the roadmap). · **Surface:** Cowork (Fable 5).

## What changed since the 2026-06-06 plan

Three standalone Monti-facing apps were built and deployed to Netlify, outside the platform repo:

| App | Live URL | Local source | Form |
|---|---|---|---|
| Trade Portal (web) | monti-trentini-trade-portal.netlify.app | `~/Documents/Claude/Projects/Monti trentini Brand voice/web_site/` | Single-file HTML slide deck, ~2 MB, base64-embedded slides |
| Trade Portal (mobile) | monti-trentini-trade-portal-mobile.netlify.app | `…/Monti trentini Brand voice/mobile_site/` | Same deck, separate mobile build, ~4.4 MB |
| Image Catalog | monti-trentini-catalog.netlify.app | `~/Documents/Claude/Projects/catalog-deploy-2/` | Single-file HTML, Cloudinary-driven, full MT brand tokens |
| Shop (mt-e-comm) | mt-e-comm.netlify.app | `~/Documents/Claude/Projects/mt-shop-deploy/` | React-in-browser storefront, 71 SKUs from the real 2026-03 price list, Cloudinary images |

**Decision (Rick, 2026-06-12):** these apps are platform features, not one-offs. Monti Trentini is the first tenant's data + UI; the code becomes reusable, config-driven platform tools for future clients. Goal remains the **Monti pilot launch** — integration must never block the launch.

## Architecture principle

Same rule as the platform core: **differentiation = tokens + content only.** Each app gets ported into `src/components/` as a generic tool, themed by tenant tokens, fed by tenant config/data:

- **Trade Portal → "Presentations" tool.** One responsive component (kills the separate mobile build). Slides served from Cloudinary (kills the base64 payloads). Per-tenant decks defined in client config (`presentations` block). Shareable, passcode-gated link for buyers.
- **Image Catalog → "Catalog" tool.** Buyer-facing, polished, shareable — distinct from the internal Media hub (asset management). Driven by the tenant's Cloudinary folder + `catalog.json`. The standalone app already uses the brand-token pattern, so the port is mostly CSS-var re-mapping.
- **Shop → "Storefront" module, two steps.** Step 1 (now): keep it embedded/linked as the external tool it already is in Monti's config. Step 2 (post-pilot): port into the platform and unify its data pipeline with the canonical price-list data layer (`pricing-core` / Custom Price List Creator is source of truth — never duplicate pricing). Real Shopify only when real checkout is needed.

## Phases

### Phase A — Pilot launch wiring (now; nothing here waits on integration)
| # | Task | Owner | Exit criteria |
|---|---|---|---|
| A1 | Add Trade Portal + Catalog as **external tools** in `montitrentini.json` (quick win, links from the portal hub today) | Claude | Tools visible on Monti's hub, build passes |
| A2 | Hand Monti the portal — send Stefano the URL + passcode | Rick | Stefano has access; first reactions captured |
| A3 | Subdomain `montitrentini.cheeseshoptech.com` (DNS) | Rick + Claude guides | Branded URL resolves |
| A4 | SSL hardening — Cloudflare Full (strict) + registrar auto-renew | Rick | Per `LAUNCH_AND_MAINTENANCE.md` §5 |
| A5 | Photography → Cloudinary Media hub | Rick / Monti | Real content replacing samples |

### Phase B — Catalog integration (first port; smallest, proves the pattern)
| # | Task | Exit criteria |
|---|---|---|
| B1 | Port `catalog-deploy-2` into `src/components/catalog/` as a token-themed, config-driven tool (route `catalog-public` or upgrade of the `catalog` module) | Monti catalog renders inside the platform, themed by tenant tokens |
| B2 | Data seam: tenant `cloudinaryFolder` + `catalog.json` drive content; zero Monti-specific code | A `_template` tenant could ship a catalog by config alone |
| B3 | Flip Monti's catalog tool from external link → internal route | Old Netlify site optional/redirects |

### Phase C — Trade Portal integration (the presentations tool) — **SHIPPED 2026-06-12**
| # | Task | Status |
|---|---|---|
| C1 | Slides addressable by URL | Done — extracted from the deployed deck, WebP 1600px (7.2 MB → 0.8 MB), served from `public/presentations/montitrentini/`. Cloudinary move later = config-only swap. |
| C2 | Generic responsive `presentations` component (swipe/keys/fullscreen/thumbnails, neighbour preload) | Done — one build replaces desktop + mobile sites |
| C3 | `presentations` block in client config (schema extended) | Done — config-only deck definition |
| C4 | Shareable buyer link | Done — `?client=montitrentini&page=presentations` (passcode-gated); becomes `montitrentini.cheeseshoptech.com/?page=presentations` after A3 |

> Note (2026-06-12): Stefano presented to MT ownership — **approved, positive move-forward.** A2 achieved.

### Phase D — Storefront unification (post-pilot start; biggest)
| # | Task | Exit criteria |
|---|---|---|
| D1 | Unify data: storefront consumes the canonical price-list pipeline output (no second pricing source) | One source of truth feeding shop + pricing tool |
| D2 | Port storefront UI into the platform as the `storefront` module (it already has admin + embed seams) | Shop runs under the platform URL/auth |
| D3 | Shopify decision: only when real checkout/payment is required (`STOREFRONT_STRATEGY.md`) | Documented go/no-go |

### Phase E — Feed + launch (parallel, per the old plan)
HubSpot pipeline → wire CRM connector (Make, `CRM_CONNECTOR.md`) once deals exist · campaign strategy → campaigns launch (~1 month clock) · class-of-trade %s + freight confirmations from Stefano · pricing/engagement `$___` figures.

### Phase F — Admin dashboards, roles & proposal engine (spec'd 2026-06-12)
Full spec: `ADMIN_DASHBOARDS_SPEC.md`. Concept locked: portal = CheeseShop TECH platform hosting client ecom sites + extending infrastructure/data management via gated, tenant-themed UIs; CST manages data, connectivity, and software (3rd-party + proprietary).

| # | Task | Notes |
|---|---|---|
| F1 | Roles: per-tenant admin passcode → `client-admin`; gate Manage features | **SHIPPED 2026-06-12.** Three-tier gate (client / client-admin / admin); storefront back-office now Manage-gated; new env vars in `.env.example` (backward compatible until they're set) |
| F2 | House dashboard P0: tenant management · integration health · data pipelines | **SHIPPED 2026-06-12.** `agency-console.jsx` on the house hub (admin-only): tenant cards + config-only onboarding card, seam mode table + gate test ping, per-tenant data freshness with staleness flag |
| F3 | Client content manager: catalog metadata editing → canonical data layer | Ports the parked edit feature from the standalone catalog app |
| F4 | Proposal engine v1 — **both tiers day one** (house pitches + client buyer proposals) | Reuses Presentations viewer + pricing-core; HEB v7 deck = reference template |
| F5 | Media storage: R2/B2 archive layer + upload automation + Storage panel | Strategy in spec §6; **create the bucket before Monti photography lands** |

Content engine = HubSpot plugin (campaigns authored/sent in HubSpot; portal shows status via the existing seam).

### Later (unchanged)
Clerk auth at client #2 · onboard client #2 (proves multi-tenancy end-to-end) · production domain cutover.

## Risks / reminders (Rick)
- **Stefano dependencies are the long pole:** class-of-trade %s, freight confirmations, photography. Queue all three now — answers arrive asynchronously.
- **Portal handoff (A2) is still not done** and costs nothing — it was step 1 of the old plan a week ago.
- The mobile trade portal's 4.4 MB single file will be slow on cell connections — Phase C fixes this; until then, send buyers the web URL.
- `PRICING_AND_ENGAGEMENT_MODEL.md` still has `$___` blanks — needed before quoting agency work to client #2.

## Working agreement
Cowork (Fable 5) = planning, config, docs, light component work, verification. Claude Code = heavy ports (Phases B–D execution). Backup before structural changes: `archive/backup_YYYY-MM-DD_before_<change>/`. `npm run build` + `npm run validate:clients` before any push; `phase-2-6-build` remains canonical.
