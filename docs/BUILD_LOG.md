# CheeseShop TECH — Build Log

A chronological, append-only record of decisions, actions, and their rationale.
Newest entries at the top. Each entry: **what changed, why, and what it unblocks.**

> Format convention: `## YYYY-MM-DD — Title` · **Decision / Action / Status** ·
> keep entries short and factual. This file is the project's memory.

---

## ⚠️ CANONICAL FACT — read first

**The platform core IS CheeseShop TECH. Monti Trentini is a CLIENT (tenant #1), not the platform.**

- **CheeseShop TECH** = the multi-tenant platform + shared codebase = the owned IP / crown jewels. Stays with Posada & Co. **Never sold or transferred.**
- **Monti Trentini** = the first client environment running *on* the platform. A tenant, nothing more.
- At any client buyout, the client receives a **single-tenant fork** of their own site only — **never** the CheeseShop TECH platform core or its multi-tenant code.
- Do not conflate the two in any doc, contract, repo name, or config. Platform = CheeseShop TECH; clients = tenants.

---

## 2026-06-13 (cont.) — Cloudinary uploads live + Media Hub upload taxonomy (Asset Library step 1)

Image uploads now work end-to-end: unsigned Cloudinary preset `st_unsigned` (cloud sofcvmwa),
name committed in `netlify.toml [build.environment]` as `VITE_CLOUDINARY_UPLOAD_PRESET` (public by
design — ships in the bundle; kept in version control so it can't get lost). Commit 292651a.

First slice of the Asset Library (ASSET_LIBRARY_SPEC.md): the Media Hub upload now opens an
**"Asset details" dialog** — per-file Name + multi-select **Usage** tags — instead of silently
uploading filenames. Usage taxonomy (Rick, locked): Product Catalog · Hero · Story block ·
Lifestyle · Food styling · Social · Press/PR · Event · Brand asset. Name → Cloudinary caption;
usage → Cloudinary tags (alongside `draft`). `lib/media.js` owns the `USAGE` list + `PRODUCT_USAGE_ID`.
`uploadAsset` extended with `displayName` + `usage`. Usage shows as badges in the asset dialog.

Plus a **"Recent" tab** (first tab) so you can find what you just uploaded + tagged without digging
through folders — newest first, with usage badges on each tile. Interim bridge while the hub is
mock-backed: recent uploads are persisted in the browser (`localStorage`, per tenant, capped 60) so
they survive reloads. When the live Cloudinary backend lands, Recent becomes a `created_at`-sorted
view of real assets.

**Tabs now MIRROR the usage tags** (Rick): the Media Hub left tabs switched from storage folders
(products/brand/raw) to the usage taxonomy — Recent · All · Product Catalog · Hero · Story block ·
Lifestyle · Food styling · Social · Press/PR · Event · Brand asset. Each tab is a saved view that
filters the asset pool by tag (client-side, instant); the whole set is fetched once. Mock sample
assets were given `usage` tags so the tabs are populated in mock mode. Uploads now land in a neutral
`library` subfolder (tags, not folders, drive where an asset appears).

UI form (Rick chose): the views render as a **left vertical nav rail with a per-view count** —
chosen over a dropdown (keeps every view scannable at a glance; a dropdown hides them) and over the
wrapping horizontal row (busy at 11 items). File-explorer pattern; room to group later (Brand assets
▸ Logos/Vectors/GIFs). Design principle logged: match nav pattern to item count + mental model.

**Product Catalog exclusion (verified, no code needed):** the Catalog is a VIEW over the canonical
manifest (`lib/images.js`), not Media Hub uploads — so social/press/lifestyle/food-styling never
appear there. The tag-driven gate (only `product-catalog` enters the manifest) activates when the
unified library feeds the manifest.

**Still phase work:** uploads persisting in the Media Hub list across reloads, folder-as-usage
views, and the tag→manifest→catalog pipeline need the LIVE Cloudinary backend
(`VITE_MEDIA_BACKEND=cloudinary` + the `media-list` function + `CLOUDINARY_API_KEY/SECRET`
server-side). Today the hub is mock-backed; uploads save to Cloudinary but the list is sample data.

## 2026-06-13 (cont.) — Five-theme design session (Theme Engine completed)

Completed the "dedicated design session" the Theme Engine was gated behind (Scope §7.4, unblocked once
Rick answered Q1/Q2). Took the engine from **2 proof-of-concept registers to the full five**, each
mapped to a Monti channel + a flagship — all REGISTERS of the one brand kit, not new brands.

- **The five:** Heritage Editorial (provenance, exists), Fresh Market (retail/grocery, exists),
  **Chef's Table** (foodservice — dark Mountain-Ink, image-led, serif), **Trade Brief** (distributors —
  compact sans, dense range table, minimal imagery), **Alpine Gallery** (chains/flagship — Heritage
  Cream canvas, oversized serif, quiet gallery grid).
- **`themes.js`:** richer token vocab — `lead` now incl. `ink`/`cream`; `density` (airy/regular/compact);
  `typeRegister` incl. `grand`; `cover` incl. `minimal`; `product` incl. `grid-three-up`/`list-compact`.
  `themeColors()` now resolves an `onCanvas` legible color so a light (cream) lead keeps headings
  readable. New `themeSpec()` maps density+type → concrete classes (one place to tune the system).
- **`proposal-view.jsx`:** the renderer now actually **expresses** density (vertical rhythm, cover
  height, measure) and type register (heading voice, cover title), which it previously ignored. Added
  the `minimal` cover and the `grid-three-up` + `list-compact` product layouts. Existing two themes
  render unchanged. The builder's theme dropdown auto-populates from `THEMES`, so all five appear.
- **Verified:** `vite build` clean (1646 modules; isolated outDir to dodge the dist/.DS_Store EPERM).
- **Process note:** sandbox could not finalize the commit (mount blocked removing `.git/index.lock`);
  delivered as the `COMMIT THEME SESSION.command` easy-button — double-click, then DEPLOY as usual.

## 2026-06-13 (cont.) — Brand Kit + Theme Engine + Proposal v2 (the agency crown jewel)

Built the Brand Kit foundation and the Proposal Builder v2 on top of it (BRAND_KIT_AND_PROPOSAL_SPEC.md,
from MT ProposalBuilder Scope v2). **Business model encoded:** CheeseShop TECH owns brand orchestration
as the core value of the monthly fee — clients focus on product + sales.

- **Brand Kit (single source, "one mind one body"):** `src/data/<tenant>/brand-kit.json` — identity
  (logo/colors/type), imagery, voice, audience-tagged story blocks. Monti's PARSED from the existing
  Brand_Guide + Voice_and_Messaging (the "UI version of brand voice"). `_brand-kit-template.json` =
  onboarding worksheet. `lib/brandKit.js` reader + `lib/brand-kit-edits.js` overlay (commits f71766f).
- **Brand Management page** (house-admin, "Brand kits" nav): displays the kit + an EDIT-MODE worksheet
  — inline text, color pickers, list add/remove, story-block editing, logo/image upload (Cloudinary).
  Persists per-tenant in localStorage; Export commits JSON to source (commit ffbc4a1).
- **Single-source theming:** `resolveClient` derives brand colors + radius from the kit (commit ffbc4a1).
- **Theme Engine** (`lib/themes.js`): themes = composed layouts (lead color, density, type register,
  fixed cover + product image-placement zones) derived from the kit. Q1=both (CST demo + live per-tenant),
  Q2=placement zone is a fixed, well-composed image area. Two registers now; full five in a design session.
- **Proposal v2:** audience selector (filters story blocks), brand story-block multi-select, theme
  selector; themed render (cover, story blocks with image zones, product range, brand closing). Image
  zones always show a composed brand block as backdrop so composition holds before assets exist.
  Commits cfc8a6c, 2b43b9a, 9cc3fe9.
- **Process note / lesson:** cfc8a6c broke the Netlify build — `themes.js` was left untracked because
  the commit used `git commit -a` (stages modified-tracked only, NOT new files). Fixed in 2b43b9a.
  **Always `git add -A` (not `commit -a`) when a commit introduces new files.**

## 2026-06-13 (cont.) — Pricing tool UX pass (composition for live customer conversations)

Cosmetic/layout work on the Proforma (Pricing & Inventory), driven by Rick using it as a
customer-facing reference. Commits `d5f52b9`, `40af9c0`, `d05b8bb`.
- **Bill-to summary moved** from a 340px right rail to a full-width sticky top bar (bill-to +
  totals + Print/Record). The product table now runs the full width + length — product names
  fit on one line, more rows, no wrapping (was the core complaint).
- **Clickable product image → detail dialog** (`ProductDetailDialog`): large image, description/
  blurb, badge, live price at the selected class-of-trade, stock, lots, and full specs
  (milk/aging/net+gross per case/pieces/pallet/shelf). Built to answer buyer questions on the spot.
- **Dedicated "Inventory & lots" column** — lots were crammed under the product name; now spread
  into an aligned grid (lot # · cases · exp/ETA) with on-hand + on-the-water summary.
- **Larger thumbnails** (44→64px, sharper `card` preset; dialog uses `preview` w_1200).
- **Search moved** out of the controls row to a full-width bar directly above the product list.
- Note: codes not in the manifest (e.g. 02302) use the legacy `monti/<code>` packshot fallback and
  can show a blank thumb — `npm run sync:images` with Cloudinary creds folds in that folder.

## 2026-06-13 (cont.) — F5 SHIPPED: one canonical image source

**The SOURCE is now unified too** (commit `4b729af`), completing "one mind, one body": every surface
reads from ONE per-tenant manifest `src/data/<tenant>/images.json` (single shape), via the
`lib/images.js` reader, rendered by the single `cldImage` builder. Replaced the 3 mismatched
descriptions: `buyer-catalog.json` (deleted — Catalog is now a view over the manifest), `sku.image`
(Proposals/Pricing now use `codeImageUrl`, manifest-first + legacy packshot fallback so all 71 priced
SKUs render), and the media-list path. `scripts/sync-images.mjs` regenerates the manifest from the
Cloudinary Admin API; `npm run media:refresh` = sync + prewarm. Verified live (Catalog 103 images from
the manifest, codes intact). Optional follow-up: run `sync:images` with creds to fold in the
`monti/<code>` packshot folder + move masters to R2.

## 2026-06-13 — Image delivery unified ("one mind, one body") + Phase F shipped

**Big session.** Phase F (admin dashboards, roles, proposal engine) built end-to-end, then a deep
image-performance + unification pass. All on `phase-2-6-build`, deployed to staging.

**Phase F — shipped (commits 74f99fa, 494b7b1, 594a59c):**
- **F1** three-tier passcode roles (client / client-admin / admin) via `functions/gate.js`; storefront
  back-office is now Manage-gated. Passcodes set team-level in Netlify + deployed.
- **F2** Agency console on the house hub (admin-only): tenant management, integration health (live/mock
  per seam + gate ping), data pipelines with staleness flags.
- **F3** catalog metadata editing for client-admins (`lib/catalog-edits.js`, export/import JSON).
- **F4** proposal engine, both tiers (`components/proposals/*`, `lib/proposals.js`): builder + buyer
  share links that carry the proposal in the URL and quote prices LIVE via pricing-core (links never stale).

**Launch wiring (Rick, evening of 06-12):** `https://montitrentini.cheeseshoptech.com` LIVE (Cloudflare
CNAME DNS-only → platform; wildcard still serves coming-soon, specific records override). R2 bucket
`cheeseshoptech-media-archive` created. All three passcodes live.

**Image performance — root cause + fix (commits 7e7f719, 0d83cbe, 2cbbd01, 0de4d3a):**
- Symptom: Media hub + Catalog slow on first load, packshots misaligned.
- **Root cause:** thumbnails used `g_auto` (content-aware crop) → forces Cloudinary to decode the full
  ~45 MP master per image; and grids mounted the entire 100+ image folder at once.
- **Fix:** pad-on-white (no g_auto), 360 px thumbs, paginate 30/page, `npm run prewarm` to pre-build
  derivatives. Verified live via browser network inspection (cold multi-second → ~0.7 s median, warm ~16 ms).
- **Unification ("one mind, one body"):** the Catalog had its OWN URL code separate from the Media hub —
  which is why fixing one didn't fix the other. Consolidated EVERY image URL in the app through one
  builder `cldImage()` in `lib/cloudinary.js` (named presets = single source of truth). Catalog, Media
  hub, Proposals, Pricing tool all delegate; zero raw `res.cloudinary.com` URLs left in render code.

**Next — Phase F5 (designed, spec'd, NOT built):** `docs/IMAGE_PIPELINE_SPEC.md`. The render layer is
unified; the SOURCE isn't — the same images are still described in 3 mismatched files (buyer-catalog.json /
sku.image / media-list). Target = one sync job → one canonical `images.json` manifest per tenant → the
shared builder → every screen. Add a photo, run one command, it's everywhere, correctly sized.

## 2026-06-06 — Session checkpoint: Monti pilot portal is LIVE (passcode go-live)

**Milestone.** The Monti pilot portal is **live and accessible** on staging. Rick set
`VITE_AUTH_MODE=passcode` + `PORTAL_PASSCODE` (team-level Netlify env vars) and redeployed; the live
`/?client=montitrentini` URL now serves the green passcode gate → Operations Portal (verified by
screenshot). Hand Monti the URL + passcode and they're in. (Note: a stray trailing comma in the URL
falls back to the house view — copy it clean.)

**This session's arc (newest entries below):** Ledger design pass inc 2 → terracotta-as-house-signature →
Home hub (Operations-Portal composition becomes the standard landing) → house brand to its own
Terracotta + Cellar Olive → "At a glance" command center → all backend seams finished/ready-to-flip
(Shopify products+orders, campaigns fn) → **pilot passcode auth, then flipped LIVE**. CRM decided:
sample data for the pilot; wire HubSpot once it has deals (Salesforce dead).

**State.** Build feature-complete; `phase-2-6-build` clean + synced. Remaining = Phase 7 launch wiring,
which is mostly Rick feeding content/secrets into already-built seams. HANDOFF.md rewritten clean.

## 2026-06-06 — Pilot auth: shared passcode gate (Identity was too fiddly for one client)

**Decision (Rick).** Netlify Identity (invites, self-set passwords, free-form roles, deprecation
murk) was too much friction for a one-client pilot. Chose a **shared-passcode gate now, Clerk when
client #2 signs.** Match the auth to the stage — per-user roles/tenant isolation only matter with
multiple clients.

**Action.** Built an env-switchable passcode mode (`VITE_AUTH_MODE=passcode`):
- `netlify/functions/gate.js` — checks the passcode against server-side `PORTAL_PASSCODE` (secret).
- `src/components/auth/passcode-gate.jsx` — branded gate UI; POSTs to the function; DEV-only local
  check (`VITE_PORTAL_PASSCODE`) so `npm run dev` works without a functions server.
- `auth-context.jsx` — passcode mode grants a synthetic `client` session on unlock (localStorage),
  so nav/role-gated UI work; no tenant switcher, tenant from URL. `App.jsx` picks `Gate =
  PasscodeGate | RequireAuth` by env. Identity code untouched (the `identity` default is unchanged).

**Status.** validate + build clean; **browser-verified end-to-end** (passcode-mode dev): the
Monti-branded gate renders, correct passcode → lands in the green Operations Portal hub as a client
(no tenant switcher). **Default stays `identity`, so staging is unchanged until [Rick] sets two env
vars** (`VITE_AUTH_MODE=passcode` + `PORTAL_PASSCODE=…`) + redeploys — then Monti's in. Docs:
AUTH_AND_ROLES.md "Pilot auth" + .env.example. **Next:** Clerk swap at client #2 (closes the shared-
passcode limits: single code, client-side unlock flag, `?app=1` house reachable).

## 2026-06-06 — Finish the backend seams: campaigns fn, Shopify orders, admin hydration

**Action.** Completed the remaining ready-to-flip seams (all env-gated, mock default, secrets
server-side; code-complete like CRM — live verification awaits Rick's tokens):
- **Campaigns** — `netlify/functions/campaigns.js` (Make proxy, mirrors CRM; `MAKE_CAMPAIGNS_WEBHOOK_URL`).
  Client `getCampaigns()` already flipped on `VITE_CAMPAIGNS_BACKEND=make`, so this completes it.
- **Shopify web orders** — `netlify/functions/store-orders.js` (Admin API, `read_orders`; uses
  `SHOPIFY_ADMIN_TOKEN`, distinct from the Storefront token) + `fetchStoreOrders()` in `store.js`.
- **Storefront Admin hydration** — `storefront-admin.jsx` now hydrates products + orders on mount via
  `fetchStoreProducts()`/`fetchStoreOrders()` (Shopify in headless mode, seed otherwise). Theme/
  content/settings stay portal-owned.
- `.env.example` — `MAKE_CAMPAIGNS_WEBHOOK_URL` + `SHOPIFY_ADMIN_TOKEN`.

**Status.** validate + build clean; functions syntax-checked; **browser-verified the Storefront Admin
still renders** (Design/Products/Content/Orders/Settings, live hero preview) — mock path unchanged.
**Net:** every mock seam is now code-complete and flips on env. What remains is purely Rick's launch
wiring (build the Make scenarios, provision real Shopify Storefront+Admin tokens, set the env vars) +
Phase 7 ops. No more verifiable code to write until a real backend/token exists.

## 2026-06-06 — Storefront → Shopify headless: products read path built (ready to flip)

**Decision (Rick).** Storefront commerce engine = **Shopify (headless)** — Shopify owns products +
checkout/payments/tax/inventory; the portal owns the experience + admin content. Reuses Monti's
existing Shopify rather than rebuilding commerce.

**Action.** Built the products read path, code-complete + env-gated (mirrors the CRM function;
secrets server-side; mock default — no live verification possible without Rick's token, same as CRM):
- `netlify/functions/store.js` — Shopify **Storefront API** GraphQL products proxy; maps to the
  portal store-product shape; needs `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_TOKEN`.
- `src/lib/store.js` — added `fetchStoreProducts()` (async; Shopify when `VITE_STORE_BACKEND=shopify`,
  else seed products, with fallback). `getStore()` stays sync (portal-owned theme/content/settings).
- `.env.example` — Shopify secrets + all backend switches documented. `STOREFRONT_STRATEGY.md` —
  wiring-status table (what Shopify owns vs the portal; what's built vs deferred).

**Status.** validate + build clean; **frontend bundle byte-identical** (helper tree-shaken until
consumed → zero regression); function syntax-checked. **To go live [Rick]:** a real Shopify store
with Storefront API enabled (current mt-e-comm shopify-store is a static mock) + set the 3 env vars.
**Remaining code (small, post-token):** hydrate the Storefront Admin product list via
`fetchStoreProducts()`; Admin-API orders read. Campaigns mirror this once a data source is chosen.

## 2026-06-06 — Home hub: "At a glance" command center + mock-seam audit

**Action.** Folded the (now-orphaned) `home-dashboard.jsx` content into the hub as an **"At a glance"**
section below the tool cards — new `components/home/command-center.jsx` (pipeline by stage, active
campaigns, recent activity, overdue invoices), rendered only for tenants with a CRM
(`hasCrm`), so the agency house hub stays clean. Deleted `home-dashboard.jsx` (superseded). The home
is now a true intro **and** command center. Verified: validate + build clean; browser-checked Monti
(full composition) — house unaffected.

**Mock-seam audit (the "off mock" reality).** Checked the three remaining mock seams — they're
already architected to flip to real via env flags, so "off mock" is mostly launch wiring + backend
choices, not new code:
- **CRM = code-complete.** `netlify/functions/crm.js` already proxies a Make webhook server-side;
  client flips on `VITE_CRM_BACKEND=make`. **Needs [Rick]: build the Make scenario + set
  `MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make` in Netlify.** No code left.
- **Storefront / Campaigns = stubbed real path, no backend yet.** `getStore`/`saveStore` +
  campaigns have the seam but the non-mock branch is a stub because there's no backend to point at.
  **Needs a decision first:** which commerce engine for the store (Shopify/Stripe/Medusa per
  STOREFRONT_STRATEGY) and where campaigns data lives — then the Netlify function mirrors the CRM one.

## 2026-06-06 — House brand → its own Terracotta + Cellar Olive (clients keep their color)

**Decision (Rick).** Swap the HOUSE brand back to the real CheeseShop TECH palette — **Terracotta
`#9A3B1B` primary + Cellar Olive `#5F6B2E` accent** (matching the wordmark) — so the agency reads
distinct from green clients like Monti. Supersedes the earlier "house → Forest Green" decision. The
green was only ever the *house* default; **tenants override their own color, so Monti stays fully
green** (montitrentini.json unchanged).

**Action.** Token-only: `src/lib/tokens.js` HOUSE.brand.colors + `src/index.css` :root house
fallback (primary `#9a3b1b`, accent `#5f6b2e`; on-primary/on-accent stay white, AA ✓). Updated
DESIGN_SYSTEM A (intro/A2/A5) to "warm artisanal house, tenants set their own." **Status.** validate
+ build clean; **browser-verified** — house hub now renders terracotta masthead/nav/figures
(Command Center); Monti hub still green. No per-client code touched.

## 2026-06-06 — Home hub: Operations-Portal composition becomes the standard landing

**Decision (Rick).** Adopt the Monti **Operations Portal** hub composition (the
`mt-e-comm.netlify.app/portal/` page he liked — green textured masthead + overlapping stat
rollup + tinted tool-launch cards) as the **standard home/landing for every client** in the
platform, CheeseShop-TECH-branded for the house. Hub **replaces** the old data-dashboard as the
home; tool cards click into the sidebar app. Solves the empty-house-dashboard gap at the same time.

**Action.** Ported it into the SHARED layer (no per-client code; differentiation = content + tokens):
- New `components/home/home-hub.jsx` — masthead (brand-primary gradient that darkens toward the
  corner so any tenant color works + cross-hatch + logo chip + italic motto eyebrow + display
  title/tagline), stat row pulled up to overlap the masthead, tinted tool cards w/ status-eyebrow tags.
- New `lib/hub-stats.js` — stat rollup: explicit config stats → house cross-tenant rollup
  (tenants/tools/modules) → tenant ops rollup (products / cases on hand / on the water / SKUs
  arriving / standing commitments, from the canonical `getPricingData` bundle — same logic as the
  static portal) → none.
- Content is config-driven: new `home` block (eyebrow/title/tagline/footer/optional stats) + tool
  `tag` field added to `client.schema.json`, `montitrentini.json` (Operations Portal copy), and
  `HOUSE` defaults in `tokens.js` (“Command Center”). Resolver surfaces `home` with house fallback.
- Extended the shared `ui/stat.jsx` with an `accent` prop (token-driven figure color) so the
  multi-color stat row stays on the ONE shared component. `App.jsx` lands on `dashboard` → `HomeHub`.

**Status.** validate + build clean; **browser-verified** both views — Monti renders the Operations
Portal faithfully inside the shell (34 / 3,921 / 1,908 / 18 / 6, real data); house renders a
CheeseShop-branded “Command Center” rollup (no longer empty). **Open:** house rollup is lightweight
(counts, not live cross-tenant metrics); old `home-dashboard.jsx` (pipeline/campaign cards) is now
unused — fold the best of it into the hub or a secondary section later if wanted.

## 2026-06-06 — Brand reconciliation: terracotta kept as the house wordmark signature

**Decision (Rick).** Spotted that the wordmark + favicon were still **Terracotta `#9A3B1B`** (the
original "warm artisanal" house primary) after the house was swapped to Forest Green — the running
app is green, but `cstech-wordmark.svg`, `cstech-favicon.svg`, and `DESIGN_SYSTEM` Part A still read
terracotta. Rather than finish recoloring everything green, Rick chose to **keep terracotta as the
deliberate house brand-mark signature** — warm wordmark over green chrome, a house-only identity cue
(doubles as an agency-vs-client distinguisher; tenants render their own color).

**Action.** Docs/comment only — **no asset or token change**, so the app is byte-identical (JS
bundle hash unchanged). Updated `DESIGN_SYSTEM` A (intro), A2 (primary→Forest Green, accent→Italia
Green, added a "Brand-mark signature: Terracotta — wordmark/favicon only, not a token" row), A5
(noted the terracotta wordmark is intentional, keep it); fixed the stale "warm artisanal" comment in
`tokens.js`. **Status.** validate + build clean. Closes the stale-brand-doc open thread.
**Open:** any external `CheeseShopTECH_Brand_Foundation.md` still needs the same green+terracotta update.

## 2026-06-06 — "Ledger" design pass increment 2 (shared Stat sweep + house signal)

**Action.** Completed the increment-1 follow-up. (1) **Stat sweep:** extended shared
`ui/stat.jsx` to absorb every variant — added optional `icon` (right slot, falls back from
`badge`), `onClick` (clickable deep-link tile w/ hover-border), and `tone="error"` props — then
deleted the **five** divergent local copies (`App.jsx` StatCard, `pricing-tool.jsx` Stat,
`crm-dashboard.jsx` Stat, `campaigns-page.jsx` Stat, `home-dashboard.jsx` KpiCard) and pointed all
consumers at the one component. Net −49 lines. The CRM/Campaigns/Home KPI tiles thereby **upgrade**
from plain `text-2xl` sans figures to the editorial italic-serif figure + uppercase eyebrow — the
whole point of the sweep. (Left Campaigns' tiny in-card `Metric` alone — different element.)
(2) **Agency-vs-client signal (Rick's pick: quietest option):** the shared `AppShell` now renders
a `cs-eyebrow` **"Agency Console"** tag under the wordmark **only when `resolved.isHouse`** — a
type/layout signal, NOT a color change (house stays Forest Green per the brand decision). Driven by
the existing tenant-resolver flag; no per-client code.

**Why.** Increment-1 left "sweep remaining stat tiles to shared Stat" + "add an agency-vs-client
distinguishing treatment (both green now)" open (see entry below). This closes both.
**Status.** `validate:clients` + `build` clean. **Verified in a real browser** (vite dev + headless
Chrome): house view shows the Agency Console tag + editorial Catalog tiles; Home KPI tiles render
the icon-variant editorial figure; tenant (montitrentini) view shows "Monti Trentini" wordmark with
**no** tag (gating confirmed: `hasAgencyTag:false`). Per-tenant green retained throughout.
**Unblocks:** Ledger pass effectively complete; remaining In-flight is code (CRM/store off mock) or ops (Phase 7).

## 2026-06-06 — Project tidy + Best-Practices Manual (cross-surface continuity)

**Action.** Operating-hygiene checkpoint. Created **`docs/BEST_PRACTICES.md`** — the manual for
keeping work coherent across the four Claude surfaces (Chat · Cowork · Claude Code · Claude Design):
the canonical-doc map (one home per fact), tool routing, the **checkpoint ritual** (build green →
commit → BUILD_LOG → rewrite HANDOFF), git/deploy discipline, and templates. **Rewrote `HANDOFF.md`**
to true current state (it was badly stale — predated all of today's work). **Tidied:** deleted 20
stray `vite.config.js.timestamp-*.mjs` + `.DS_Store`; archived the completed one-off
`CODE_HANDOFF.md` → `docs/archive/`; committed `CLAUDE_CODE_BRIEF.md` into the repo.
**Why.** The recurring drift (a surface re-deriving state from a rotted handoff) needed a system.
**Status.** Docs only; no code change.

## 2026-06-06 — "Ledger" design pass (house-wide, via shared layer)

**Action (Rick).** Bring the editorial "Ledger" feel Rick liked from the Monti portal into the
PLATFORM — applied through shared tokens/components so it cascades to every tenant + module, colors
stay per-tenant (no per-client forks; DESIGN_SYSTEM Part E).
- Type: load Fraunces **italic** axis; `h1,h2` + `CardTitle` render italic-serif (base layer).
  Tables get `tabular-nums`. New utilities `.cs-display`/`.cs-num`/`.cs-eyebrow` (index.css).
- Components: `ui/table.jsx` (finer tracked heads), `ui/badge.jsx` (uppercase tracked tags),
  `ui/card.jsx` (italic title, flatter shadow-sm), `layout/app-shell.jsx` (italic brand + eyebrow
  footer). New shared `ui/stat.jsx` (big italic-serif figure + eyebrow). Migrated inline stat tiles
  in App.jsx + pricing-tool.jsx. Documented in DESIGN_SYSTEM (A3 + B4 table).
- Verified: validate + build clean; rendered house catalog + Monti pricing — cohesive editorial look,
  per-tenant green retained. **Open:** sweep remaining module page headers/stat tiles to shared Stat
  in a follow-up; consider an agency-vs-client distinguishing treatment (both green now).

## 2026-06-06 — Pricing tool: fee line items + lot/expiry on the price list + Print/PDF

**Decision (Rick).** (1) Freight/handling are SEPARATE LINE ITEMS on the proforma, added at
proforma time, never folded into $/lb: **Trucking = $0.30/lb** on all delivered orders;
**Processing fee = $135** on delivered orders **under 1,500 lb**. Labels exactly "Trucking" /
"Processing fee". (Replaces the old flat-$300-below-threshold model.) Pickup = no fees.
(2) Show **lot # + expiration + in-transit ETA inline** on the price-list rows for a quick read
(editing/management stays on its own page). (3) **Print / PDF** the proforma.

**Changed:** `src/lib/pricing-core.js` `freightLines()` (trucking $/lb always + processing
below-threshold); `src/data/montitrentini/client.config.json` freight block; `pricing-tool.jsx`
(per-row lot/expiry list, `printProforma()` → clean branded proforma window with FIFO lot
allocation per line, "Print / PDF" button). Verified: freight math (1200lb→$360+$135; 1800lb→$540;
pickup→none), validate + build clean, rendered. Config-only %s still provisional pending Stefano.

## 2026-06-06 — House brand → Forest Green (supersedes Brand Foundation cool-studio rec)

**Decision (Rick).** Swap the CheeseShop TECH HOUSE brand to Forest Green (primary `#064E22`,
accent `#009640`) — green-on-warm-cream, in the Monti family — extending the look Rick liked
across the agency portal itself. Changed `src/index.css` (locked house defaults) + `src/lib/tokens.js`
(HOUSE fallback). Locked warm-stone surfaces unchanged. Build clean; AA on-primary = white ✓.

**Note / open:** this REVERSES the cool/neutral-studio direction in `CheeseShopTECH_Brand_Foundation.md`
§5/§7 (which argued the agency should read distinct from warm client brands so it doesn't compete).
The house now resembles the Monti client palette. Intentional per Rick. **TODO:** update the Brand
Foundation + DESIGN_SYSTEM house-brand section to record the new decision; consider a distinguishing
treatment (type/layout) so agency ≠ client even though both are green.

## 2026-06-06 — Pricing & Inventory native tool (closes the price-list gap)

**Action.** Added a native Pricing & Inventory tool for the Monti tenant — the platform's first
real B2B pricing capability, replacing the `price-list` "coming-soon" stub. Branch `pricing-module`.

- **Engines** (`src/lib/pricing-core.js`, `src/lib/forecast-core.js`): portable, framework-free
  quote/freight/allocation + demand-vs-supply forecast logic (ESM ports of the engines proven
  19/19 in the storefront build). Verified here: 6/6 logic checks on real data.
- **Data seam** `src/lib/pricing.js` (`getPricingData(resolved)`, mock-bundled now via
  `src/data/montitrentini/*.json` — canonical catalog/inventory/commitments/config from the
  adapters; real Netlify-function backend deferred, same shape). Movement capture → localStorage
  ledger (`mt-movement-ledger`).
- **UI** `src/components/tools/pricing-tool.jsx`: token-themed (no hardcoded brand — inherits
  tenant theme), three tabs (Proforma live quoting + Record-sale capture · Movement report ·
  Commitments). Uses platform UI components.
- **Wiring**: `montitrentini.json` price-list tool → `type:internal, route:"pricing", featured`,
  status live; `App.jsx` dispatches featured `route:"pricing"` → `<PricingTool>`.

**Decision.** Class-of-trade reflects the real model: distributor 0% (HQ list) / direct-retail +15%
/ direct-consumer +35% — provisional, config-tunable, pending Stefano.

**Status.** Config validates; all files parse clean; engine logic verified. **Full `npm run build`
NOT run** (this dev machine's node_modules is Linux-only / no native Mac node) — build + render
must be confirmed in a real env before merging `pricing-module` → `phase-2-6-build`. **Not deployed.**

## 2026-06-06 — 🟢 MEDIA HUB LIVE ON REAL CLOUDINARY (first real backend)

**Verified working in production.** Direct call to the deployed function
`GET /.netlify/functions/media-list?folder=monti-trentini` returns **103 real Monti Trentini assets**
from the Cloudinary `monti-trentini` folder (Apericheese, Asiago Antico Maso/Casetta/di Alpeggio, …),
with titles from Cloudinary captions, mapped to the `products` tab, `approvalState: draft`.

**Chain confirmed end to end:** function authenticated to Cloudinary Admin API (server-side
key/secret env vars work) → correct folder → delivery via cloud `sofcvmwa`. Mock is off
(`VITE_MEDIA_BACKEND=cloudinary`). This is the platform's **first real (non-mock) backend**.

**Config that made it work (commit `9197234` on `phase-2-6-build`):** `montitrentini.json`
`cloudinaryFolder` → `monti-trentini`; `media-list` default folder → `products`. Netlify env set:
`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, `VITE_CLOUDINARY_CLOUD=sofcvmwa`,
`VITE_CLOUDINARY_UPLOAD_PRESET=cstech_unsigned`, `VITE_MEDIA_BACKEND=cloudinary`.

**Note.** All 103 assets are `draft` (untagged) → admin/client see all; PR/influencer see none until
tagged `approved-for-press` / `approved-for-influencers`. Tagging workflow is the next media refinement.

**Process note.** Git from the Cowork sandbox is unreliable (stray `.git/*.lock`, no push creds) —
commit/push done from the native terminal (needed `sudo rm -f .git/HEAD.lock`). Going forward, do git
in Claude Code per `TOOL_ROUTING.md`.

---

## 2026-06-06 — Real media backend (Cloudinary read + upload)

**Built (first real backend).** Media is now wired for live Cloudinary, not just mock:
- **Read:** `media-list` Netlify function hardened with `next_cursor` pagination (≤5 pages) — server-side
  Admin API, secret never in the browser. Maps folder/sku/approval-tag/title.
- **Upload:** `uploadAsset()` in `cloudinary.js` does a direct browser→Cloudinary POST via an **unsigned
  upload preset** (no secret), into `clients/<id>/<subfolder>`, tagged `draft`. Media Hub upload button
  now opens a real file picker, uploads (multi-file), shows progress, and prepends results to the grid.

**To flip from mock to live (Rick — config only):** create Cloudinary folders + an unsigned preset,
set Netlify env (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` server; `VITE_CLOUDINARY_CLOUD`,
`VITE_CLOUDINARY_UPLOAD_PRESET`, `VITE_MEDIA_BACKEND=cloudinary` build), redeploy. Steps in
`docs/MEDIA_HUB.md` + LAUNCH §4. Secrets entered by Rick (Claude never enters credentials).

`node --check` passes on the function; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — Home dashboard (cross-module command center)

**Built.** The `Dashboard` tab now renders a new `HomeDashboard`
(`src/components/home/home-dashboard.jsx`) that aggregates all modules: greeting + store-status badge,
KPI grid (pipeline value, active campaigns, campaign reach, open orders, overdue invoices, media
assets — each deep-links to its module), pipeline-by-stage, active-campaigns list, recent activity,
and an overdue-invoices "needs attention" panel. Pulls in parallel from crm/campaigns/media/store
libs (all mock for now). Replaced the old `dashboard`→CrmDashboard route; `OrdersPage` still wired.
`CrmDashboard` component retained in the file but no longer routed (pipeline/invoices now surface on Home).

`npm run validate:clients` passes; `vite build` clean. Built autonomously while Rick was away. Not pushed.

---

## 2026-06-06 — Campaigns module (the sales + social engine)

**Built.** `Campaigns` nav tab (after Dashboard, admin/client) — the core POSITIONING pillar.
`src/lib/campaigns.js` (mock + `getCampaigns()` seam, `canViewCampaigns`, status/channel helpers) +
`src/components/campaigns/campaigns-page.jsx`: stat cards (active/scheduled/reach/attributed revenue),
campaign cards with channel chips (retail/DTC/social), status, date range, asset count, and live-KPI
row for active campaigns, plus a New-campaign dialog (scaffold). Enabled `campaigns` in Monti's
`modules`. Mock data (4 Monti campaigns); real backend (Make/CRM/social analytics) swaps behind the seam.

`npm run validate:clients` passes; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — STRATEGY LOCKED — headless storefront rebuild

**Decision (Rick + Claude).** When a client's storefront moves into the portal, we **rebuild the
experience layer natively and run headless** — a commerce engine (their Shopify, or Stripe/Medusa)
keeps checkout/payments/tax/fraud/fulfillment; the portal owns design, merchandising, content, admin,
and the conversion data. We do NOT rebuild commerce (that's rebuilding Shopify badly + owning a
client's revenue/uptime). This is the moat + the productized value-add ("we rebuild, improve, and run
your store"). Offering tiers: Connected (link-out) → **Headless rebuild** (paid value-add) → Fully
native (high liability, avoid). The Storefront Admin's `saveStore()` seam will target the commerce
API via a Netlify function (secrets server-side) when a real client signs.

**Captured in:** `docs/STOREFRONT_STRATEGY.md` (canonical), `POSITIONING.md` (pointer),
`PRICING_AND_ENGAGEMENT_MODEL.md` (build-fee tier note).

---

## 2026-06-06 — Storefront Admin (Live/Admin toggle + back-office)

**Built.** The featured Storefront page now has a **Live site | Admin** toggle (shown when
`tool.admin: true`; the Storefront tab is already admin/client-gated, so it reuses the portal login —
no separate auth). Admin = a tabbed store back-office (`src/components/tools/storefront-admin.jsx`):
- **Design** — primary/accent colors, logo, fonts, layout, hero headline/subhead + live preview.
- **Products** — table + Add-product dialog with **price & description**.
- **Content** — announcement bar, banners + pages with publish toggles.
- **Orders** — store order history.
- **Settings** — store status (live/maintenance), currency, flat shipping, payment provider.
A "Publish changes" action saves via the `saveStore()` seam (mock now; pushes to the live store later).

**Data.** `src/lib/store.js` mock store model + `getStore()/saveStore()` seam (`VITE_STORE_BACKEND`).
Schema gained `tool.admin`; set on Monti shopify. Scope per Rick: design, products (price+desc),
content, orders, settings — all under the existing admin/client login.

`npm run validate:clients` passes; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — Storefront promoted to a featured tab (embedded)

**Change.** A tool can now be `featured: true` → it gets its own top-level nav tab (placed right after
Dashboard) with a full page (`src/components/tools/featured-tool.jsx`): hero header, prominent
"Open full store" button, and — when `embed: true` — a **live in-portal iframe preview** of the tool
(with a framing fallback note + full-screen link). Featured tools are excluded from the Tools grid.
Shared icon map added (`src/lib/icons.js`). Schema gained `featured` + `embed` booleans.

**Monti.** Shopify tool → `featured:true, embed:true, icon:store, label:"Storefront"` → it's now a
"Storefront" tab embedding `mt-e-comm.netlify.app` live in the portal. Per Rick: make the store feel
like a first-class feature, not a tile.

`npm run validate:clients` passes; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — Tools module — surface a client's existing tools (launch tiles)

**Built.** Config-driven "Tools" page: each client lists existing tools in a `tools[]` array; the
portal renders branded launch tiles. `external` → opens a new tab (noopener); `internal` →
navigates within the portal; `coming-soon` → disabled tile. Added `tools` to `client.schema.json`
+ `_template.json`, carried through the resolver, and new `src/components/tools/tools-page.jsx`.
Nav item "Tools" (admin/client). Per the white-label rule, a new client's tools = config only.

**Monti seed.** Shopify storefront (external, **URL is a placeholder** `REPLACE-ME.myshopify.com`),
Image catalog (internal → the native Media Hub), Price list calculator (external, `coming-soon`
— the local Custom Price List Creator isn't hosted yet). Decisions this session: launch-tiles style,
tools are mixed/some-local.

**ACTION (Rick):** provide the real Shopify URL; host the price-list calculator (then set its URL +
flip status to `live`). Tracked on the launch list.

`npm run validate:clients` passes; `vite build` clean.

---

## 2026-06-06 — Identity enabled + invite/recovery handling added

**Netlify (driven via browser).** Enabled Netlify Identity on the `cheeseshoptech-platform` site
(API endpoint `…/.netlify/identity`), set registration to **Invite only** (email confirmation
required), invited **Rick.posada@outlook.com**, and set their role to **admin**.

**Code.** Our custom login (not the Netlify widget) now handles Identity hash-token links —
`getHashToken()` + `acceptInvite` / `completeRecovery` / `confirmSignup` in `auth.js`, and a
`SetPassword` screen wired into `App.jsx` BEFORE routing (invite links land on the apex). Post-accept
redirects admins to `/?app=1` (the house portal) so they don't bounce to coming-soon.

**Tenant assignment via roles.** Netlify's dashboard only edits ROLES (not arbitrary app_metadata),
so `tenantOf()` now also reads a `tenant:<id>` role. Assign a Monti client `client` + `tenant:montitrentini`.

**Also staged (not yet pushed):** Monti placeholder-logo fix (tenant logo → brand name fallback).

**ACTION (Rick):** push so staging redeploys, THEN click the invite email:
`rm -f .git/index.lock && git add -A && git commit -m "Auth: invite/recovery handling, tenant-role, logo fix" && git push`
(Sandbox still can't push — stale lock perms.) After redeploy, the invite link will work.

`vite build` clean (build verified).

---

## 2026-06-05 — Git-connected staging site live (cheeseshoptech-platform)

**Done.** Created a NEW git-connected Netlify site **`cheeseshoptech-platform`**
(https://cheeseshoptech-platform.netlify.app) from the repo. Production branch = `phase-2-6-build`,
build `npm run build` → `dist`, functions dir `netlify/functions` (auto-detected from netlify.toml).
First deploy published in ~20s; verified live — the Monti tenant login screen renders
(`?client=montitrentini`), burgundy-skinned with the co-brand footer. CI now works:
pushes to `phase-2-6-build` auto-publish. `cheeseshoptech.com` (Drop coming-soon) left untouched.

**This is the staging/preview site.** At launch: merge to `main`, set production branch = `main`,
point the `cheeseshoptech.com` domain + `*` wildcard at this site.

**Next:** enable Netlify Identity on THIS site (login renders but can't auth yet). Minor cleanup:
`montitrentini.json` logo is a placeholder `<cloud>` URL → broken image on login; set real or clear.

---

## 2026-06-05 — CORRECTION — cheeseshoptech.com is a Netlify Drop site, not git-connected

**Finding (verified in the Netlify dashboard).** The live `cheeseshoptech.com` project shows
"Last deployed from Netlify Drop" — a manual drag-and-drop deploy, **NOT connected to the GitHub
repo.** Therefore git pushes/PRs trigger no build and produce no deploy preview (PR #1 has 0 checks).
This **corrects** the assumption (from the walkthrough/OM) that "commit + push → Netlify auto-deploys"
— that's the intended design, not the current wiring. Implication: earlier deploy-risk warnings about
pushing to `main` replacing the apex were moot — the site isn't linked.

**Other Netlify projects present:** `monti-trentini-catalog`, `mt-e-comm` (both "Deploys from GitHub"),
`super-platypus-…` (Drop). Likely earlier experiments — flagged for cleanup.

**Decision pending (Rick).** How to host/CI the platform: connect cheeseshoptech.com to the repo, or
a new git-connected site, or keep local dev + Drop for now. Tracked in LAUNCH_AND_MAINTENANCE.md §1b.

---

## 2026-06-05 — Netlify functions built (media-list, crm)

**Built.** `netlify/functions/media-list.js` (Cloudinary Admin API → asset list, approvalState from
tags, secrets server-side) and `netlify/functions/crm.js` (proxies the Make webhook). Added
`[functions]` to `netlify.toml` (esbuild bundler) and extended `.env.example` with the frontend
`VITE_*` flags (cloud name, upload preset, backend switches, gotrue url, dev bypass). Both pass
`node --check`; app build clean.

**Activation (Rick, on launch list).** Set the server env vars (Cloudinary keys / `MAKE_WEBHOOK_URL`),
then flip `VITE_MEDIA_BACKEND=cloudinary` / `VITE_CRM_BACKEND=make`. Until then the app stays on mock
data. Can't be tested here without live accounts — code is complete and wired.

---

## 2026-06-05 — Apex coming-soon route — deploy risk resolved

**Built.** `src/components/marketing/coming-soon.jsx` (house-branded public landing). `App.jsx` now
serves it at the **apex/house view** (no tenant subdomain) and only renders the portal at
`<client>.cheeseshoptech.com`. **This removes the deploy blocker:** pushing to `main` no longer
replaces the public page — `cheeseshoptech.com` stays a landing page while subdomains serve the app.

**Routing rules.** Apex (isHouse, no `?app`/`?client`) → ComingSoon. Staff reach the house portal at
the apex with `?app=1`; `?client=<sub>` previews a tenant (dev). Admin tenant switcher → House now
sets `?app=1` so admins land on the house portal, not the public page. Dev (`npm run dev`) shows
coming-soon by default; use `?app=1` or `?client=montitrentini` to preview the portal.

**Note.** Monti Trentini is confirmed tenant #1 / first test account (already in `config/clients/montitrentini.json`).

`vite build` clean (1,614 modules).

---

## 2026-06-05 — PHASE 6 — CRM dashboard built (mock backend; Make wiring deferred)

**Built.** CRM data layer `src/lib/crm.js` with a `getCrmData()` seam (mock now; real later via
`/.netlify/functions/crm` → Make webhook, secrets server-side; `VITE_CRM_BACKEND=make`). Pages
`src/components/crm/crm-dashboard.jsx`: **Dashboard** (stat cards — pipeline value, open orders,
overdue invoices, contacts; pipeline-by-stage bars; activity feed; invoice table) and **Orders**
(order history table). Data shape per OM §7 (contacts/pipeline/orders/invoices/activity). Wired into
the nav for the `dashboard` + `orders` pages.

**Access control.** `canViewCrm` = admin/client only. Added **role-based nav filtering** in `App.jsx`:
external roles (pr/influencer/creator) now see only the Media hub; admin/client see all pages. Invalid
page for a role falls back to the first allowed page. `crm: none` → "connect a CRM" empty state, no error.

**Deferred to launch.** Make scenario (client CRM → data shape), CRM tokens + webhook URL in Netlify
env, then build the `crm` function. Tracked in LAUNCH_AND_MAINTENANCE.md §6. Detail in docs/CRM_CONNECTOR.md.

`vite build` compiles clean (1,613 modules).

---

## 2026-06-05 — PHASE 5 — Media hub built (mock backend; real Cloudinary sync deferred)

**Built.** Cloudinary delivery layer `src/lib/cloudinary.js` (named transforms thumb/card/hero/original,
applied at delivery per OM §6; cloud name account-global via `VITE_CLOUDINARY_CLOUD`, defaults to the
public `demo` cloud in dev). Media data layer `src/lib/media.js` with a `listAssets()` seam: mock
backend now (food sample images on the demo cloud so the gallery renders), real backend later via a
`/.netlify/functions/media-list` Cloudinary Admin API proxy (`VITE_MEDIA_BACKEND=cloudinary`). Media
Hub UI `src/components/media/media-hub.jsx`: folder tabs (products/brand/raw), gallery grid (card
transform), asset dialog (hero + copy delivery URL + approval control), upload affordance (env-gated
on an unsigned preset). Wired into the nav (the `media` page). `resolved` now carries `cloudinaryFolder`.

**Roles & approval.** States `draft → approved-for-press → approved-for-influencers`. Role visibility
(least privilege): admin/client = all + manage; creator = drafts; pr = press; influencer = influencer
assets. Maps the POSITIONING content-studio → media-hub → campaigns chain. Full detail in
`docs/MEDIA_HUB.md`.

**Deferred to launch (account/secrets — not buildable in code).** Create Cloudinary client folders,
set cloud name + API key + unsigned preset in Netlify env, then build the `media-list` function.
Tracked in the new `docs/LAUNCH_AND_MAINTENANCE.md` (consolidated launch + recurring ops checklist).

**Phasing.** Walkthrough Phases 2–5 now built in code (design system, auth, shell/tenant resolution,
media). Operational go-live for auth + media lives on the launch list. Next build phase: 6 (CRM via Make).

`vite build` compiles clean (1,611 modules).

---

## 2026-06-05 — PHASE 3 — Auth (Netlify Identity) built; needs Netlify enablement

**Verified first.** Netlify Identity is NOT deprecated — Netlify reversed the deprecation on
2026-02-19 (confirmed via search). Safe to build on.

**Built.** Custom house-branded auth on Netlify Identity via `gotrue-js` (chose custom over the
Netlify widget so login renders in the design system and can be tenant-skinned). Added:
`src/lib/auth.js` (GoTrue client + role/tenant helpers), `src/lib/auth-context.jsx`
(`AuthProvider` / `useAuth`), `src/components/auth/login-screen.jsx`,
`src/components/auth/require-auth.jsx` (`RequireAuth` tenant-scope gate + `RoleGate`). Portal now
sits behind auth; topbar has a user menu (avatar/role/logout); tenant switcher is admin-only.

**Model (lightweight v1, per POSITIONING).** Roles `admin|client|pr|influencer|creator` + a
`tenant` field, both in `app_metadata` (server-controlled). Tenant scoping: non-admin can load a
portal only if `app_metadata.tenant === subdomain` (admins any) — satisfies the no-cross-tenant DoD.
Full model + Rick's Netlify setup steps in `docs/AUTH_AND_ROLES.md`.

**Dev note.** Identity has no local endpoint, so `AuthProvider` injects a mock admin on `npm run dev`,
guarded by `import.meta.env.DEV` (cannot run in a production build). `VITE_DEV_BYPASS_AUTH=false`
to preview the real login.

**Phasing note.** This is walkthrough Phase 3 (auth). Walkthrough Phase 4 (shell + tenant
resolution) was already done early in our Phase 2, so its checklist is effectively met too.

**Still needed for DoD (Rick actions).** Enable Identity on the site, invite a test user + set
their metadata, deploy, then verify login + tenant scoping over HTTPS.

`vite build` compiles clean (1,608 modules).

---

## 2026-06-05 — DECISION — two-surface branding model locked

**Decision.** Storefront (customer-facing) = **100% client brand, always**, no platform mark.
Internal portal (operator-facing) = **co-branded**: client logo + tokens dominant with a subtle,
persistent "powered by CheeseShop TECH" mark (AppShell sidebar footer). Rationale: services-brokerage
retention — keep platform value visible without competing with the client's brand. Buyout fork drops
the mark. The mark is NOT a client-overridable token. Logged in `DESIGN_SYSTEM.md` B0. Already
matches the shipped shell.

---

## 2026-06-05 — PHASE 2 COMPLETE — full component catalogue shipped

**Status.** Phase 2 done. Full B4 catalogue built on the shadcn pattern (Radix + cva +
tailwind-merge), all token-themed and AA-accessible. `vite build` compiles clean (1,603 modules,
CSS 16.9 kB / JS 306 kB gzip ~98 kB).

**Added.** `@radix-ui` primitives (dialog, tabs, select, checkbox, switch, radio-group, label,
toast, slot). Components in `src/components/ui/`: button (now ref-forwarding + asChild), card,
input/textarea, label, select, checkbox, radio-group, switch, badge, table, tabs, dialog, toast
(+ `ToastProvider`/`useToast`), breadcrumb, empty-state, skeleton. Layout `app-shell.jsx`
(sidebar + topbar). `App.jsx` rebuilt into a real portal page (nav, stat cards, tabbed table /
form / empty / loading, dialog, toasts) with the live tenant switcher preserved. Catalogue table
documented in `docs/DESIGN_SYSTEM.md` B4.

**Env note (not a code issue).** Local `vite build` can't empty the stale `dist/` from a prior
session — those files are host-locked (EPERM on `.DS_Store`). Compile succeeds every run; verified
via a clean `--outDir`. Delete the old `dist/` folder in Finder if a local build is wanted; it's
gitignored and irrelevant to Netlify CI builds.

**Unblocks.** Phase 3 — auth + tenant routing (production subdomain→tenant load, lightweight roles).

---

## 2026-06-05 — PHASE 2 — Design system locked + white-label shell scaffolded

**Status.** Phase 2 DoD (decisions + scaffold) met. `npm run build` compiles clean (44 modules);
`npm run validate:clients` passes.

**Decisions locked** (`docs/DESIGN_SYSTEM.md` — supersedes the `>>> DECIDE:` prompts in DESIGN_GUIDE_STARTER):
- **House brand direction = warm artisanal.** Primary "Terracotta" `#9A3B1B`, accent "Cellar Olive"
  `#5F6B2E`, warm stone neutrals, espresso text `#221C14`, paper bg `#FAF6F0`. Headings Fraunces,
  body Inter, mono JetBrains Mono. Distinct from tenant #1 Monti Trentini (burgundy + gold).
- **Overridable tokens (client):** `color.brand.primary`, `color.brand.accent`, `logo`,
  `font.heading`, `font.body`, `radius`. Everything else (neutrals, semantic, spacing, type scale,
  elevation) is **locked/structural**.
- **Theming mechanic:** CSS custom properties (`--cs-*`) + Tailwind theme extension (not CSS-in-JS).
- **AA contrast guardrail:** runtime resolver computes on-color by luminance, warns + falls back if a
  client color can't reach 4.5:1. Same check gates `validate:clients`.

**Built.** Vite + React 18 + Tailwind 3 toolchain (none existed before). Token defaults in
`src/index.css`; `src/lib/{tokens,contrast,theme,clientConfig}.js` resolve a tenant from subdomain
(or `?client=` in dev) and inject its tokens. shadcn-pattern `Button` + `Card` reference components
(cva + tailwind-merge). Demonstrator `App.jsx` with a live tenant switcher proves one codebase
re-skins from config alone. Config schema formalized: `config/clients/client.schema.json` +
updated `_template.json`. Placeholder house wordmark/favicon in `public/brand/`.

**Watch-out (not done on purpose).** Deploying this build replaces the live coming-soon page at the
apex (Vite publishes the app to `dist/`). Hold the deploy until the portal is ready (Phase 4), or
keep a coming-soon route — decide before next `git push` + Netlify build.

**Unblocks.** Phase 2 remainder (full B4 component catalogue) and Phase 3 (auth/tenant routing).

---

## 2026-06-05 — PHASE 1 COMPLETE — URL live over HTTPS, wildcard working

**Status.** Phase 1 (Domain & hosting, Option C) DoD met. Verified externally:
- `https://cheeseshoptech.com` → 200, serves coming-soon page.
- `https://www.cheeseshoptech.com` → 301 redirect (healthy).
- `https://montitrentini.cheeseshoptech.com` (wildcard test) → resolves over HTTPS, 404 (expected — no tenant app yet; Phase 4). Confirms zero-per-client-DNS routing works.

**Setup.** Coming-soon deployed to Netlify at `cheeseshoptech.netlify.app`. Three proxied CNAMEs
in Cloudflare (`@`, `www`, `*`) → `cheeseshoptech.netlify.app`. TXT google-site-verification retained.

**Open hardening item.** Confirm Cloudflare SSL/TLS mode = Full (strict) and (optional) upload
Origin Certificate. Site serves fine on Universal SSL edge cert today; Full (strict) is the
chosen secure config.

**Gotchas hit (logged so we never repeat them).**
1. Adding the domain in Netlify dumps you on an "Activate Netlify DNS / update nameservers"
   screen offering `dns#.p08.nsone.net`. That is Option B — do NOT use it; click Done and ignore.
   It nearly got pasted into the CNAME targets.
2. CNAME target is the `*.netlify.app` site address (`cheeseshoptech.netlify.app`), NOT a
   nameserver. Watch spelling: n-e-t-l-i-f-y dot app.
3. Deploy the Netlify site BEFORE wiring DNS (the CNAME target doesn't exist until then).

**Unblocks.** Phase 2 — Design system & white-label shell.

---

## 2026-06-05 — PHASE 0 COMPLETE — repo pushed to GitHub

**Status.** Phase 0 DoD passed. Repo `cheeseshoptech-platform` is live and **private** at
github.com/cheeseshop-tech; `main` pushed and tracking `origin/main` (commits `491792c` scaffold
+ `885b371` build-log). `.env` gitignored and absent from history — verified.

**Accounts.** Cloudflare, Netlify, GitHub, Cloudinary, Make.com, HubSpot — all set up.
**Netlify plan tier = PRO** — unlocks automatic wildcard preview subdomains (OM §5) for per-client UAT previews.

**Note.** GitHub normalizes the org to `Cheeseshop-tech` (capital C); the lowercase remote redirects
fine but prints a "repository moved" notice each push. Optional: repoint remote to the capitalized URL.

**Unblocks.** Phase 1 — Domain & hosting (Option C: Cloudflare wildcard + proxy → Netlify).

---

## 2026-06-05 — Project repository & docs scaffolded

**Action.** Created the `cheeseshoptech-platform` project folder with:

- `/docs` — Cowork Brief (v1.1), this Build Log, and the Operations Manual
- `/config/clients` — per-client JSON config (`montitrentini.json` + `_template.json`)
- `/public/coming-soon` — deployable placeholder page to claim the URL
- `/src` — React shell, components, and the per-client config loader

**Why.** The brief calls for all docs to be versioned in GitHub alongside the codebase.
Single repo, single source of truth.

**Unblocks.** Architecture is now documented; coding can begin against a known structure.

---

## 2026-06-05 — Client exit model + pricing structure added

**Action.** Added Operations Manual **§12 — Client Exit & Ownership Transfer (Buyout)** and a
new doc **`PRICING_AND_ENGAGEMENT_MODEL.md`**.

**Model.** Three revenue moments + clean exit: **Build** (one-time, tiered) → **Operate**
(monthly retainer + per-task menu) → **Buyout** (one-time exit, single-tenant fork only).

**Buyout pricing principle.** `buyout = migration labor + (N months × monthly operate fee)`,
N ≈ 12–24, so a buyout compensates lost recurring revenue and isn't a way to dodge the monthly.

**Strategic note.** A documented exit path is a **sales asset** (removes lock-in fear) AND a
revenue event. Reinforces the IP boundary: clients get a single-tenant fork, never the
CheeseShop TECH platform core.

**Next.** Set real numbers + buyout multiplier N in the new Project; brief legal on MSA + SOW
+ exit terms in the original contract.

---

## 2026-06-05 — Design Guide starter created (consult stage)

**Action.** Added `DESIGN_GUIDE_STARTER.md` — outline + decision prompts for the Best
Practices / Design Guide. Centers on a **white-label design-token system**: shared React
shell rendered from tokens, each client overriding only an approved subset (color, logo,
fonts, radius) with safe fallbacks to house defaults.

**Why.** Differentiation must come from **config + content, not bespoke code/layouts** —
this is the lever that lets onboarding scale to 10–20 clients without design debt.

**Next.** Develop in the new Project. Kickoff order: house brand → token set + config schema
→ component catalogue → photography/content → QA bar (wired into onboarding UAT).

---

## 2026-06-05 — DECISION: Domain & hosting = Option C (Cloudflare wildcard + proxy)

**Decision.** Run `cheeseshoptech.com` as: **Cloudflare** (registrar + DNS + proxy) →
**Netlify** (host), using a single **proxied wildcard** `*.cheeseshoptech.com` and a
**Cloudflare Origin Certificate** uploaded to Netlify, with SSL/TLS mode **Full (strict)**.

**Options considered.**

- **A — Cloudflare DNS, basic:** rejected. Requires a manual per-subdomain cert on every client onboarding.
- **B — Delegate DNS to Netlify:** rejected. Auto wildcard cert, but surrenders Cloudflare proxy/WAF/DDoS/analytics.
- **C — Cloudflare wildcard + proxy:** **selected.** One wildcard covers all clients (no per-client work) AND keeps the full Cloudflare stack.
- **C+ — Cloudflare for SaaS:** deferred to parking lot; revisit when a client wants their own vanity domain.

**Why.** Best of both: zero per-client cert/DNS steps + retained edge security. Standard
pattern for multi-tenant subdomain platforms.

**Constraints captured.**

- Universal SSL free wildcard is **one level deep** → keep subdomains flat (`client.cheeseshoptech.com`).
- Use a **Cloudflare Origin Cert** (long-lived) to avoid Let's-Encrypt-ACME-behind-proxy renewal failures.

**Unblocks.** URL can be claimed today by deploying the coming-soon page and pointing the
wildcard. Per-client subdomains then require no DNS work.

**Reference.** Wiring steps → Operations Manual §2.

---

## 2026-06-05 — FINDING: Netlify Identity is staying (auth choice safe)

**Finding.** Netlify **reversed** the planned deprecation of Netlify Identity on
**Feb 19, 2026**. It remains a supported authentication option — no migration required.

**Impact.** v1 plan to use Netlify Identity for per-client portal login is **confirmed safe**.
Auth0 remains an option later for enterprise clients but is not needed for v1.

**Source.** Netlify Support — "Netlify Identity is staying (Feb 2026 reversal)."

---

## 2026-06-05 — Strategic direction confirmed: multi-tenant platform (not one-off)

**Decision.** Build a **multi-tenant client portal**, not a single Monti Trentini site.
CheeseShop TECH owns/operates the infra; each client gets isolated content, data, and
branding on a shared codebase. Monti Trentini is the **pilot** — every decision must also
serve client #2 and #3.

**Stack locked (v1):** Netlify (host) · GitHub (single repo + per-client JSON config) ·
Cloudinary (per-client media folders) · Netlify Identity (auth) · React (frontend) ·
Make (CRM middleware v1) → Merge.dev/Unified.to (CRM v2).

**Sequencing discipline.** Ship first, iterate after. Strict definition-of-done per phase
before adding new workstreams.

---

## Open items / next actions

- [ ] Deploy `coming-soon` page to Netlify and wire Option C (claim the URL)
- [ ] Confirm Netlify plan tier (affects automatic deploy-subdomain wildcards)
- [ ] Lock Platform Architecture document v1 (Agenda item 1)
- [ ] Scope Client Onboarding Playbook — definition of done (Agenda item 2)
- [ ] Formalize Best Practices Manual from existing work (Agenda item 3)
- [ ] Scope Build & Maintenance Manual + ownership (Agenda item 4)
- [ ] Set up Cloudinary account + per-client folder convention
- [ ] Build Make scenario: HubSpot + Monti Trentini CRM → dashboard
