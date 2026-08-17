# CLAUDE CODE — SOURCE OF TRUTH BRIEF

**Load this file FIRST in Claude Code, before any work.** It is the authoritative re-anchor for the
CheeseShop TECH platform. If anything Claude Code believes conflicts with this file, **this file wins** —
stop and reconcile before building. Prepared from the Cowork side, 2026-06-06, by reading the actual
repo (not just the docs).

---

## 0. Why this exists

A prior Claude Code session drifted toward building a **Monti-Trentini-only portal** and burned tokens
trying to reconcile it. The good news, verified against the repo: **the multi-tenant architecture is
intact.** Monti only *looks* omnipresent because it is the only tenant so far. The real risk is **branch
sprawl**, not architecture. This brief locks the canonical state so Claude Code stops re-deriving it.

---

## 1. CANONICAL FACT — never violate

**The platform core IS CheeseShop TECH (multi-tenant, owned IP). Monti Trentini is CLIENT / tenant #1 — nothing more.**

- CheeseShop TECH = the shared, multi-tenant codebase + infra = the crown-jewel IP. Never sold/transferred.
- Monti Trentini = the first tenant running *on* the platform. A test/first account.
- A client buyout delivers a **single-tenant fork of that client's own site only** — never the platform core.
- Never conflate them in any doc, repo name, config, route, or component.

## 2. HARD GUARDRAILS for Claude Code

1. **No per-client code. Ever.** Differentiation = `config/clients/<id>.json` (tokens + content) only.
   No client-named components, routes, or branches. (DESIGN_SYSTEM.md Part E.)
2. **Do not build a Monti portal.** Build the platform; Monti is loaded as data via the tenant resolver.
3. **Do not rebuild commerce.** Storefront is headless: a commerce engine (Shopify/Stripe/Medusa) keeps
   checkout/payments/tax; the portal owns experience/admin/data. (STOREFRONT_STRATEGY.md.)
4. **Secrets are server-side only** (Netlify functions / env vars). Never in the browser bundle or git.
   Claude never enters credentials — those are Rick's actions.
5. **One change = one commit; material decisions get a BUILD_LOG.md entry** (newest on top).
6. **Git happens in Claude Code**, not the Cowork sandbox (sandbox has stale-lock + no-creds issues).
7. **After every push, confirm the deploy — don't assume auto-publish fired.** Netlify's "Auto publishing
   is on" normally builds+publishes automatically off the GitHub webhook within ~1-2 min of a push (this
   worked correctly for 4-5 straight commits on 2026-08-17). But the webhook can silently miss a push —
   confirmed live on commit `74864cc`: git showed the push reached GitHub fine (`HEAD` == `origin/<branch>`),
   yet Netlify's Deploys page showed no deploy row at all for that commit, only the prior one. The fix in
   that case was manual: Netlify UI → Deploys → **Trigger deploy → Deploy project**.
   Practical rule: after pushing, open Netlify's Deploys page (or check via the API) and confirm a deploy
   row exists for the new commit hash. If it's missing after ~2 minutes, trigger it manually rather than
   waiting. Don't trust a changed bundle-filename hash alone as proof the new build shipped — Netlify can
   reuse near-identical filenames across builds; confirm a distinctive literal string from the actual code
   change is present in the live bundle (see `docs/HANDOFF_2026-08-16_crm-hubspot-close-out.md` §3 for the
   full false-positive trap writeup).
8. **Netlify env vars exist at TWO separate layers — check both.** Project-level (a site's own
   Environment variables page) and team-level (Team settings → Environment variables, shared silently
   across every project in the account) are two different dashboard pages with no visual link between
   them. A variable set only at the team level will never appear on the project-level page, but still
   applies to every build. Confirmed live 2026-08-17: `VITE_AUTH_MODE=passcode` was set at the team level
   only, missed all night while repeatedly checking just the project-level page, leading to a completely
   wrong conclusion that real Identity (not the passcode gate) was live. When verifying "is X env var
   set," check both layers. And don't stop at the dashboard — verify the actual LIVE APP behavior
   directly (the dashboard's own SPA can also serve stale cached data mid-session; a hard page reload
   resolved a false "still not deleted" reading during that same investigation).

## 3. CURRENT REAL STATE (verified against repo, 2026-06-06)

**Built & on `phase-2-6-build`:**
- Phase 0–1: repo, domain (Option C, Cloudflare wildcard → Netlify), apex coming-soon route.
- Phase 2: design system + full component catalogue (token-themed, AA-accessible). `docs/DESIGN_SYSTEM.md`.
- Phase 3: custom house-branded auth on Netlify Identity, tenant scoping + roles (`admin|client|pr|influencer|creator`). **Identity ENABLED on the staging site; admin `Rick.posada@outlook.com` invited.** `docs/AUTH_AND_ROLES.md`.
- Phase 5: Media hub — **LIVE on real Cloudinary** (cloud `sofcvmwa`, folder `monti-trentini`, 103 real assets, `VITE_MEDIA_BACKEND=cloudinary`). First real backend. `docs/MEDIA_HUB.md`.
- Phase 6: CRM connector + dashboard/orders (mock; Make wiring deferred). `docs/CRM_CONNECTOR.md`.
- Campaigns module (sales+social engine) + Home dashboard (cross-module command center).
- Storefront as a featured embedded tab + Storefront Admin back-office (mock `saveStore()` seam).

**Live URLs:**
- Staging app: `https://cheeseshoptech-platform.netlify.app` — git-connected, **auto-deploys from `phase-2-6-build`**.
- `https://cheeseshoptech.com` — **Netlify Drop coming-soon, NOT git-connected** (pushes don't deploy it).

**Still mock behind seams:** CRM (Make), Campaigns, Storefront save, Home (aggregates mock).

## 4. BRANCH MAP + canonical decision

| Branch | What | Status |
|---|---|---|
| `main` | original scaffold | **stale — 12 commits behind** `phase-2-6-build` |
| **`phase-2-6-build`** | all real Phase 0–6 work | **CANONICAL** (staging deploys from it) |
| `pricing-module` | `phase-2-6-build` + 1 commit (`5f024b4` Pricing & Inventory tool) | ahead by the pricing tool; **build NOT verified** |

**Decision (Rick, 2026-06-06): `phase-2-6-build` is the single source of truth.** Everything consolidates onto it.

## 5. ⚠️ PRE-MOVE REQUESTS — do these BEFORE consolidating/merging

*"Make this possible before the move."* Do not merge or move to production until:

1. **Verify the build in a real env.** Run `npm install` then **`npm run build`** and `npm run validate:clients`
   on `pricing-module` — the Pricing & Inventory tool (`5f024b4`) has **never been built** (sandbox is
   Linux-only node_modules). Fix any build errors. This is the #1 gate.
2. **Confirm `phase-2-6-build` still builds clean** after any change, and that the staging site (which
   auto-deploys from it) is green.
3. **Decide main reconciliation:** at launch, fast-forward/merge `phase-2-6-build` → `main`, set Netlify
   production branch to `main`, and point `cheeseshoptech.com` + `*` wildcard at the `cheeseshoptech-platform`
   site. Until then, leave `main` alone (do not build off the stale scaffold).
4. **Clean stray Netlify projects** (`monti-trentini-catalog`, `mt-e-comm`, `super-platypus-…`) to avoid confusion. [Rick]

## 6. THE MOVE — consolidation steps (after §5 passes)

1. On a clean tree: `git checkout phase-2-6-build && git pull`.
2. `git merge pricing-module` (brings the Pricing tool in). Resolve conflicts; keep config/code DRY.
3. `npm run build && npm run validate:clients` → must be clean.
4. `git push` → staging auto-redeploys; verify the portal + pricing tool render.
5. Delete/retire `pricing-module` once merged. Keep `phase-2-6-build` as the only working branch until launch.

## 7. THEN — the pricing model

After consolidation, the **Pricing & Inventory tool** (native B2B quoting/freight/allocation + forecast,
token-themed for the tenant) becomes a first-class module. Two layers, don't confuse them:
- **The tool** (code): `src/lib/pricing-core.js` + `forecast-core.js` + `pricing.js`, UI
  `src/components/tools/pricing-tool.jsx`, mock data `src/data/montitrentini/*.json`. Real Netlify-function
  backend deferred (same data shape). Class-of-trade: distributor 0% / direct-retail +15% / direct-consumer
  +35% — **provisional, pending Stefano.**
- **The business pricing model** (`docs/PRICING_AND_ENGAGEMENT_MODEL.md`): Build → Operate → Buyout, still
  has `$___` placeholders + buyout multiplier N to set. This now must also reflect campaign + content-studio
  services (per POSITIONING.md), not just website build/operate.

## 8. Rick's pre-launch ops actions (gate pilot go-live, not the merge)

From `docs/LAUNCH_AND_MAINTENANCE.md` — all [Rick] dashboard/secret actions:
- Auth: enforce strong passwords; invite a Monti `client` test user with roles `client` + `tenant:montitrentini`; verify tenant scoping over HTTPS.
- Cloudinary: confirm folders/preset/env (media is already live, so mostly done — verify).
- CRM: ✅ **done — live on direct HubSpot** (`VITE_CRM_BACKEND=hubspot` + `HUBSPOT_TOKEN`, verified
  2026-08-16). The old "build the Make scenario / `MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make`" step was
  **cancelled 2026-07-16** — that path is deleted from the code. See `docs/CRM_CONNECTOR.md`.
- SSL: Cloudflare = Full (strict); registrar auto-renew ON.
- Host the Price-list calculator OR rely on the new native Pricing tool (decide).
- Set Monti `brand.logo` (currently empty → falls back to brand name).

## 9. Document index — read for detail (don't re-derive)

| Need | Doc |
|---|---|
| Full chronological history + rationale | `docs/BUILD_LOG.md` |
| What's live / where we are / next | `HANDOFF.md` |
| Architecture, stack, multi-tenant rules, buyout | `docs/OPERATIONS_MANUAL.md` |
| Company identity (brokerage, 3 pillars, media hub) | `docs/POSITIONING.md` |
| Design tokens, overridable vs locked, theming | `docs/DESIGN_SYSTEM.md` |
| Auth + roles model | `docs/AUTH_AND_ROLES.md` |
| Media hub | `docs/MEDIA_HUB.md` |
| CRM connector | `docs/CRM_CONNECTOR.md` |
| Headless storefront strategy | `docs/STOREFRONT_STRATEGY.md` |
| Security/scale/checkout options | `docs/INFRASTRUCTURE_OPTIONS.md` |
| Operational launch checklist | `docs/LAUNCH_AND_MAINTENANCE.md` |
| Phase-by-phase walkthrough | `docs/SETUP_AND_DEPLOYMENT_WALKTHROUGH.md` |

## 10. First message to use in Claude Code

> Read `CLAUDE_CODE_BRIEF.md` in full and confirm the canonical fact, guardrails, and that
> `phase-2-6-build` is the source of truth. Do NOT build a Monti-only portal — Monti is tenant data.
> Before any merge, run `npm run build` + `npm run validate:clients` on `pricing-module` and report
> results. Then propose the consolidation plan (§6) for my approval before executing.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co. · Source-of-truth brief v1*
