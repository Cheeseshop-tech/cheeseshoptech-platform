# HANDOFF — CheeseShop TECH platform

**Updated:** 2026-06-06 · **HEAD:** `phase-2-6-build` tip (latest: Ledger pass + project tidy) · **Surface:** Claude Code
**Read first:** `CLAUDE_CODE_BRIEF.md` → this → `docs/BUILD_LOG.md` (top) → `docs/BEST_PRACTICES.md`.

## Live now
- **Staging app:** https://cheeseshoptech-platform.netlify.app — git-connected, **auto-deploys from `phase-2-6-build`**. Behind Netlify Identity login (admin `Rick.posada@outlook.com`). Staff: `/?app=1` (house); tenant preview: `/?client=montitrentini`.
- **Public:** https://cheeseshoptech.com — Netlify Drop coming-soon, **not git-connected** (pushes don't touch it).
- **Real backend live:** Media hub on Cloudinary (cloud `sofcvmwa`, 103 Monti assets). Others mock behind seams.

## Where we are
- **Phases 0–6 — COMPLETE/BUILT.** Domain + apex coming-soon, design system + component catalogue, Netlify Identity auth + roles/tenant-scoping, Media hub (real Cloudinary), CRM connector + Dashboard/Orders (mock), Campaigns + Home dashboard. Detail in the phase docs.
- **Pricing & Inventory tool — BUILT + LIVE** (native module, Monti tenant). Proforma (class-of-trade quoting) · Movement report (forecast-core) · Commitments. Fees as line items (Trucking $0.30/lb + Processing $135 under 1,500 lb), lot#/expiry inline on the price list, Print/PDF proforma. Engines: `src/lib/pricing-core.js` + `forecast-core.js`; data seam `src/lib/pricing.js` (mock-bundled `src/data/montitrentini/*.json`).
- **Brand — official green.** Whole platform Forest Green `#064E22` (house + Monti tenant).
- **Design — "Ledger" pass increment 1 shipped.** Editorial italic-serif display house-wide via shared layer (DESIGN_SYSTEM A3+B4): h1/h2 + CardTitle italic, tabular figures, refined Table/Badge/Card/Stat. Colors stay per-tenant.
- **Branch hygiene — clean.** `phase-2-6-build` canonical + synced. `main` = stale scaffold (untouched). No sprawl.

## In flight / not done
- **Pricing backend** — still mock-bundled JSON; real Netlify-function backend deferred (same shape).
- **CRM / Campaigns / Storefront** — mock behind seams; wiring is launch work.
- **Ledger increment 2** — sweep remaining module headers/stat tiles to shared `ui/stat.jsx`; add an agency-vs-client distinguishing signal (both are green now).
- **Phase 7 — Monti pilot** — operational launch wiring (Identity test user, Cloudinary verify, Make CRM webhook, SSL) in `docs/LAUNCH_AND_MAINTENANCE.md`. **Rick's dashboard/secret actions**, not code.

## Open threads
- Real **class-of-trade %s** + the two freight confirmations → pending Stefano (placeholders in now; config-tunable).
- `docs/PRICING_AND_ENGAGEMENT_MODEL.md` still has `$___` + buyout-multiplier `N` to set.
- Brand Foundation's "cool-studio" rec is **superseded** (house is green now) — update brand docs; decide the agency-vs-client distinction.

## First message for the next surface
> Read `CLAUDE_CODE_BRIEF.md` + this `HANDOFF.md` + `docs/BUILD_LOG.md` (top). Confirm: platform = CheeseShop TECH, clients = tenants; `phase-2-6-build` is the source of truth; differentiation = tokens + content only. The build is green and deployed. Pick up from **In flight** — Ledger increment 2 (design), or Phase 7 launch wiring (ops), or take CRM/store off mock (code). Propose the plan before executing.

## How to run / verify (dev)
`export PATH="/tmp/node-v22.18.0-darwin-arm64/bin:$PATH"` (bootstrap Node — see BEST_PRACTICES §4) → `npm install` once → `npm run dev` (DEV admin auth bypass) → preview `?client=montitrentini`. `npm run build` + `npm run validate:clients` before any push. Verify a deploy by grepping the staging JS bundle for a latest-commit string.
