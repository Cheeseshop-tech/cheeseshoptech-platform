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

## 2026-07-02 — Studio Director Stage 0+1 SHIPPED (deterministic Auto-compose)

**The teed-up highest-leverage build (CONTENT_ENGINE_WIRING_SPEC §3), now real.**
`src/lib/studio-director.js` — `directDraft({resolved, user, opportunity})`, pure resolution,
no AI, $0: composes a full deck (cover → statement → story → image beat → product range →
closing) from the tenant's own systems. Kit voice → text slots (Stage 1 taste rules: statements
take the shortest line, story slides the long blocks); Media Hub → image slots (slot-tag →
12-tag-taxonomy crosswalk, approved-first, SKU-linked preferred, never the same image twice);
catalog → product slots (opportunity SKUs → featured → catalog order); Monti sample contact
blanked so it can't leak cross-tenant. **SlideStudio** gains an Auto-compose button (empty-state
hero + toolbar). **ContentStudio** feeds the Director the last Opportunity Compose draft
(headline/storyKeys/skuCodes) — wire 5 closes: market intelligence → Studio end-to-end.
**Fit fix (after Rick's live screenshot — `COMMIT STUDIO FIT FIX.command`):** the preview's
ResizeObserver attached at Studio mount (template gallery — pane didn't exist yet), so the main
slide collapsed to minimum width in prod. `useFitWidth` now takes an `active` flag, measures on
attach, re-measures on nav-collapse/Focus changes, ignores 0-size rects. The slide now fills the
pane; collapsing the left nav grows it further — which was Rick's point: nav collapse buys the
filmstrip room AND a much bigger main slide.

**Plus workspace view options (same session):** collapsible left nav — lever in the topbar,
collapses to an icon rail, persisted per browser (`app-shell.jsx`, serves every page not just
the Studio) · Studio **Focus mode** (auto-expand the slide, panels hide) · **fullscreen current
slide** (Expand button) · **fullscreen slide show** (Play; ←/→/Space/click advance, Esc exits,
position returns to the editor on close).

**Plus the one-viewport workspace (Rick's UX rule: less scrolling = faster design + continuity):**
vertical filmstrip rail (left, scrolls) · height-fitted 16:9 preview (ResizeObserver) · inspector
scrolls internally (right) · deck title inline in the toolbar · per-slide template switcher.
Zero page scroll while editing on desktop; mobile falls back to stacked flow.
Build ✓ — ship via **`COMMIT STUDIO DIRECTOR.command`**. This is the substrate for agent A1
(ONBOARDING_AND_AGENTS_SDD Part 3); Stage 2 (AI pass) plugs in behind the same call once
Anthropic billing + spend cap are set (Rick).

---

## 2026-07-02 — Pricing & Inventory data-intake state (real app, not a mock)

**Decision (Rick).** The template Pricing & Inventory must be **the duplicate encoded app**, not
a mock/dead shell — and its empty state must carry the data-upload path: preferred file formats +
the same delivery process as live tenants = **a shared Google Drive file** (until a future client
needs different). In-app upload stays roadmap.

**Shipped (build ✓ — `COMMIT PRICING INTAKE.command`).** `PricingTool` now renders a `DataIntake`
panel when `catalog.products` is empty: Step 1 download templates 01/02/03 from
`/onboarding-kit/` (with what each feeds + cadence) · Step 2 fill (Excel or Google Sheets,
example-row guidance, "engine never invents pricing") · Step 3 share a Drive folder view-access
to hello@cheeseshoptech.com — the shared file IS the pipeline, weekly inventory sync, no
re-uploads. Applies to ANY tenant with an empty catalog (demo today, every new client tomorrow).

---

## 2026-07-02 — Onboarding Hub on the house Command Center (late night)

**Decision (Rick, after seeing the deployed round).** cheeseshoptech.com (house) = **the hub for
new-client onboarding**: the template apps visible ON the Command Center, not only behind
`?client=demo`.

**Shipped (build ✓ — commit via `COMMIT ONBOARDING HUB.command`).** New
`src/components/home/onboarding-hub.jsx` on the house dashboard: template app cards from
`_template.json` (each opens the demo tenant at that app, new tab), "Open the template portal"
launcher, and intake-kit download tiles (kit copied to `public/onboarding-kit/` — blank templates,
safe public; page sits behind the house gate). Visible to admin + client-admin house sessions;
Agency Console stays admin-only. Sending addresses locked same night: **Sales@montitrentini-usa.com**
(Monti outreach, HubSpot Starter, plaintext + hosted-page pattern) + **hello@cheeseshoptech.com**
(all things CST) — both live Google Workspace mailboxes.

---

## 2026-07-02 — Template tenant + onboarding kit + agents SDD (new round)

**Decision (Rick).** New development round: (1) the Monti app set copied into the platform as a
content-free **template tenant**; (2) a **client onboarding intake kit** (templates + instructions
per client department); (3) the **agent roster** scoped — content engine, pricing/inventory,
replenishment, sales projection/production, campaign planning. Spec: `docs/ONBOARDING_AND_AGENTS_SDD.md`.

**Shipped (build clean, `validate:clients` ✓ — commit via `COMMIT ONBOARDING TEMPLATE.command`).**
- **`config/clients/_template.json` upgraded** bare stub → THE CLONE: full Monti-shaped config
  (all modules, six tools, home block) with placeholder copy. Still skipped by registry/validator.
- **`src/data/_template/`** — empty-but-schema-valid data set for all nine seam files; the target
  shapes the onboarding kit maps into. Brand-kit placeholder hexes blanked so config colors win.
- **`demo` tenant LIVE** (`config/clients/demo.json` + `demo:` registered in pricing/images/
  brandKit/attention/signals/market-news seams → `_template` data). `?client=demo` renders every
  app's empty state — QA reference + prospect showroom. CRM/campaigns fall through to empty mocks.
- **`onboarding-kit/`** (client-facing): 00 README (owners/cadence/ground rules) · 01 Product
  Catalog & Pricing.xlsx (Products + Pricing Rules sheets) · 02 Inventory Availability.xlsx
  (SKU Summary + Lot Detail, weekly) · 03 Standing Orders & Commitments.xlsx · 04 Brand Asset
  Checklist.md (design team) · 05 Marketing Content Worksheet.docx (voice/story blocks/calendar) ·
  06 Sales History.xlsx (**the forecasting foundation** — new intake, feeds agents A3/A4).
- **`docs/CLIENT_ONBOARDING_GUIDE.md`** (internal runbook): Step 0 stand-up-a-tenant (~15 min,
  config only) → kit → per-file ingestion map → verification. Known gaps listed (import-catalog
  script, generic inventory parser, House Console checklist UI).

**Agent roster scoped (SDD Part 3).** Build order: Studio Director Stage 0 → A1 Content Agent
(data ready today) → A2 Pricing Agent → sales-history intake → A3 Replenishment → goals.json +
HubSpot deals → A4 Projection/Production + A5 Campaign Planning. Key finding: **sales history is
the gap** for everything forecast-shaped — hence kit file 06.

---

## 2026-07-02 — Content Engine reorg + dashboard priority window + coming-soon login + Director spec

**Decision (Rick).** The portal UI reorganizes around the two-engine model: **"Tools" nav →
CONTENT ENGINE**, and the **Dashboard = start-the-day operations view**.

**Shipped (build clean, `validate:clients` ✓ — commit via `COMMIT CONTENT ENGINE UI.command`).**
- **Content Engine page** — `src/components/tools/content-engine-page.jsx` (replaces ToolsPage
  route; key stays `tools`). Per-app cards: Content Studio · Content Library · Brand Systems
  (external → BSE) · Brand Kits (house-admin) · Brand Voice (→ BSE Voice) · Media Hub. Platform-
  shared registry, role-filtered. Their old top-level tabs removed; routes stay reachable via
  `NON_NAV_PAGES` (deep links + engine cards + compose all work); Brand kits render is RoleGated;
  Media hub tab kept ONLY for pr/influencer/creator (their whole portal is the hub).
- **Dashboard leads with operations** — Monti `tools` config reordered: **Pricing & Inventory ·
  CRM · Trade Portal · Campaigns** (new campaigns tool card + `megaphone` icon), then Image
  Catalog · Storefront. Media hub card moved off the grid (lives in the Content Engine). Grid
  heading "Tools" → "Operations".
- **Priority window** — `priority-card.jsx` at the top of the dashboard: **"Priority — response
  needed"** (URGENT emails awaiting reply, deadline tasks). New seam `lib/attention.js`
  (`VITE_ATTENTION_BACKEND`, mock bundle `data/montitrentini/attention.json`, Sample chip);
  planned live source = a mailbox-reading Netlify function (gated on the sending-address decision,
  Prereq #3). Renders nothing when clear.
- **At a glance order** — Opportunities → **Active campaigns → Market news** → pipeline/activity/
  needs-attention (command-center.jsx).
- **Coming-soon login** — quiet bottom-right **Log in** on `public/coming-soon/index.html` +
  `/login` 302 → platform house gate in `_redirects`. **Live only after Rick re-drops
  `public/coming-soon/` on the "cheeseshoptech" Netlify Drop site** (not git-connected).
- **`docs/CONTENT_ENGINE_WIRING_SPEC.md`** — the Studio Director: how Content Studio wires to
  Media Hub/Cloudinary · Brand Voice · Design System · Brand Kit · templates, and the intelligence
  as an escalating resolver pipeline: Stage 0 deterministic auto-fill (build first, $0) → Stage 1
  taste heuristics → Stage 2 AI pass (unparks AI_TOOL_EMBED, selection-only, no image gen) →
  Stage 3 dispatch awareness. Gap #1 named: BSE→brand-kit import + **gate the BSE** (still open).

**Unblocks / next:** Stage 0 `lib/studio-director.js` + Auto-compose button · BSE kit-import on
Brand Kits page · attention-list function once the sending address exists.

## 2026-07-02 (cont.) — ONE ADDRESS + sidebar order + branched-page back buttons + sides spec

**Decision (Rick).** Consolidate cheeseshoptech.com + montitrentini.cheeseshoptech.com under ONE
point of reference — the platform site serves everything; the Netlify Drop coming-soon site
retires. Also on record: **onboarding tools live on the CST side** (correction from "client side").

**Shipped (build clean).**
- **Apex = ComingSoon + Sign in, served by the platform.** `App.jsx` apex render swapped
  LandingPage → `ComingSoon` (kept for launch, one-line swap-back comment). `coming-soon.jsx`
  gains a quiet footer **Sign in** → `?app=1` → gate. `docs/DOMAIN_CONSOLIDATION_RUNBOOK.md` =
  Rick's ~10-min DNS/Netlify steps (alias on platform site, apex record in Cloudflare, verify,
  retire Drop site). After the flip: coming-soon edits deploy via git (no re-drops), /tools/* +
  /series/* serve natively (proxies obsolete).
- **Sidebar order (Rick):** Dashboard · Pricing & Inventory · CRM · Campaigns · Orders · Content
  Engine · Storefront (`NAV_ORDER` sort; featured tabs slot by config key). Catalog off the
  sidebar — reachable via its dashboard card (`catalog` added to `NON_NAV_PAGES`).
- **Back buttons on branched pages** (house rule: every page branched off the site gets one):
  BSE + Queso Couture — quiet `< Back` text line under the eyebrow, right side; history-back when
  referred, else cheeseshoptech.com. ⚠️ Edited in `public/` — copy upstream to the
  `Projects/Monti trentini Ecommerce strategy/` sources or the next re-copy overwrites.
- **`docs/PLATFORM_SIDES_SPEC.md`** — the dividing line: **CST side = factory** (template
  client-build apps + the 5-step onboarding flow: kit import → item-code importer → bulk
  image/tag → branded blank templates → config clone) vs **client side = product** (functional
  apps + proprietary data/brand system). Includes the 10-row wiring board ("all apps live and
  communicating") with priority order; SEAMS panel is its live twin.

**Rick's actions to go live:** double-click `COMMIT CONTENT ENGINE UI.command` → run the DNS
runbook → verify apex Sign in → (still open) sending-address decision.

## 2026-07-02 (cont. 4) — SESSION CLOSE — everything live + pushed

**Final state, all verified:** apex/www/admin/montitrentini all serve `cheeseshoptech-platform`
with valid SSL · old Drop project DELETED (netlify.app 404s — domain can't wander back) · repo
`phase-2-6-build` in sync with origin (Content Engine reorg + BSE integration + coming-soon Sign
in all deployed). The day's shape: **UI reorg (Content Engine + operations dashboard + Priority
window) → BSE integrated + gated → one-address domain consolidation with three doors.**
Open items carried: sending-address decision (blocks 3 wires) · copy BSE/QC edits upstream to
Projects sources · Studio Director Stage 0 = next build. Memory updated (`cst-domains-and-doors`).

## 2026-07-02 (cont. 3) — DOMAIN CONSOLIDATION EXECUTED — one address, three doors, LIVE

**Done (Rick + Claude, verified live from the sandbox).** The DOMAIN_CONSOLIDATION_RUNBOOK was
executed and extended with a staff door:
- **cheeseshoptech.com** → the platform site (coming-soon + quiet Sign in). PRIMARY domain.
- **www** → 301 to apex. **admin.cheeseshoptech.com** → NEW hidden house door (reserved
  STAFF_HOSTS subdomain, straight to the gate; Cloudflare CNAME DNS-only). 
- **montitrentini.cheeseshoptech.com** → client door, unchanged. Pattern going forward: every
  client gets `<brand>.cheeseshoptech.com` (professional norm; clients never see the house).
- Legacy `/tools/brand-systems-engine/` 302s to the gated in-app page ✓; `/series/queso-couture/`
  public ✓. Let's Encrypt reissued for all four names.
- Netlify project renamed **cheeseshoptech-platform** (was display-named
  "montitrentini.cheeseshoptech.com" — that name kept luring the domain to the wrong site).
- Gotchas hit + solved: domains were attached to the old Drop site (had to remove alias → www →
  primary, in that order); "Add a domain" was clicked once on the wrong project (byte-compare
  caught it); apex/www invisible-cert phase until Renew certificate after adding both.
- **Old Drop site ("cheeseshoptech.com" project) is now unused** — delete it to prevent the
  domain wandering back.

## 2026-07-02 (cont. 2) — BSE INTEGRATED into the app under Content Engine (and thereby GATED)

**Decision (Rick).** "Integrate [the BSE] into the main site under Content Engine" — the CST.com
portal, not a public path.

**Action.** The engine's single-file HTML moved INTO the app: `src/assets/brand-systems-engine.html`
(back-button block stripped — portal chrome does nav), lazy-loaded via `?raw` dynamic import
(separate 220 KB chunk, only fetched when opened) and rendered in an `iframe srcDoc` by the new
`src/components/brand/brand-systems-page.jsx`. Internal route **`brand-systems`** (NON_NAV_PAGES),
**RoleGated admin/client-admin**. Content Engine cards "Brand Systems" + "Brand Voice" now route
internally (were external links). `srcDoc` inherits the app origin, so the engine's localStorage
kits share the portal's store. **The ungated public copy is REMOVED** — commit script does
`git rm -r public/tools/brand-systems-engine` (sandbox can't delete on the mount) — which **closes
the "gate the engine" open item** from 2026-07-01. Old public URL will 404 by design; the QC
showcase room stays public (portfolio/lead magnet). Build clean.

**Iterate note.** BSE source of truth remains `Projects/Monti trentini Ecommerce strategy/` —
re-copy now targets `src/assets/brand-systems-engine.html` (strip the back block), not `public/`.

## 2026-07-01 (cont. 3) — Brand Systems Engine LIVE + Queso Couture series + brand-domain proxy

**Shipped (all verified live on cheeseshoptech.com).**
- **Brand Systems Engine v1** — `public/tools/brand-systems-engine/` (single-file, self-contained).
  Closes **Standing Prerequisite #1** (brand voice doc → living app). Headless architecture: portable
  brand-kit JSON is the contract; CST brands the chrome, client kits carry their own systems (`brandSystem`
  vars re-skin the workspace). Umbrella houses three disciplines: **Brand Guide · Brand Voice · Brand Design**.
  Renamed same-day from "Brand Voice Engine" (old `/tools/brand-voice-engine/` path removed).
- **Canonical MT kit v1.1** — rebuilt from `Monti_Trentini_Brand/` sources (Brand_Guide.md 2026-05-24 audit
  + token JSONs): real palette (Forest Green #064E22, Heritage Cream, Pantone refs, use ratios), Cora italic +
  Futura PT (Adobe kit `med2peg`), official motto/mantra, Casa Finco 1925 history, 800 m dairy (prefer over
  600 m generic in MT copy). Kit + blank template + schema README:
  `Projects/Monti trentini Ecommerce strategy/Brand_Systems_Templates/`.
- **Queso Couture** — CST style play under **Brand Design**, FULLY SEPARATE from MT (no client product claims
  on plates; charter + plate register in `Projects/.../CST_Queso_Couture/00_Series_Charter.md`). Plates 02–03
  clean; Plate 01 predates the split (carries MT claims) — retire/rework before public use. Showcase room
  live at `public/series/queso-couture/` — atelier-colophon voice (no sales pitch), "Correspondence" intent
  capture (interim **mailto → rick.posada@outlook.com**).
- **Brand-domain routing solved.** Root cause of 404s: cheeseshoptech.com is held by the separate
  **coming-soon Netlify site** ("cheeseshoptech", Netlify Drop), not cheeseshoptech-platform. Fix: dropped
  `public/coming-soon/` (now incl. `_redirects` + `robots.txt`) onto that site — `/series/*` and `/tools/*`
  now **proxy (200)** to `cheeseshoptech-platform.netlify.app`. Public face stays "Launching soon";
  unlisted rooms ride the brand domain. Platform `robots.txt` also added (Disallow /series/ /tools/).

**Architecture decision (Richard).** Two engines, separate but connected: **Brand Systems Engine** = source
of truth (kits out) → **Content Engine** = assembly line (campaigns out). Kit JSON is the conveyor.
Design series library doubles as CST's portfolio/lead magnet ("cheese brands see themselves in it").

**Commits:** `a34ae9e` (pages + robots), rename commit (BVE→BSE path), `6b58f1f` (coming-soon proxy files —
**unpushed at session end**; proxy is live via Drop regardless). Note: tonight's commits were made from the
sandbox before re-reading the sandbox-git rule — locks were self-healed, nothing stranded; rule respected
going forward (docs edits left uncommitted for `COMMIT BRAND SYSTEMS ENGINE.command`).

**Unblocks / next:** (1) **gate the engine** — unlisted but ungated, carries full MT kit; (2) **sending
address (Prereq #3)** — now also gates QC mailto→Make swap; (3) first QC Pinterest dispatch (UTM
`?utm_source=pinterest&utm_campaign=qc_series`); (4) MT-LP-001 build; (5) MT board deck (project deliverable).

---

## 2026-07-01 (cont. 2) — Push unblocked (PAT auth) + Opportunity Engine Slice 3: Market News card

**Deploy fix (root cause found).** The recurring "push not working": (1) GitHub HTTPS auth had no
credential — Terminal was silently prompting `Username for 'https://github.com':` inside a window that
closed unseen. Fixed with a classic PAT (repo scope, no expiration, note "MacBook push"), now stored in
macOS keychain — future pushes just work. (2) The stale `.git/index.lock` blocking commits is created by
the *Cowork sandbox itself*: it can create files under `.git/` but not delete them, so any lock-taking
sandbox git command (even `git status`) strands a lock. Rule going forward: sandbox uses
`GIT_OPTIONAL_LOCKS=0`; `FIX GIT LOCK AND PUSH.command` (repo root) self-heals lock + push on double-click.
`7f94011` + `1742a94` confirmed on origin 2026-07-01 ~17:00; Netlify deploy triggered.

**Action — Slice 3 (spec §5), on mock.** The Tier 1 "morning read" + the Tier 1→2 bridge:
- `data/montitrentini/market-news.json` — 6 sample items (trade + consumer), spec §2a shape.
- `lib/market-news.js` — `getMarketNews()` behind `VITE_MARKETNEWS_BACKEND` (mock|function),
  `marketNewsAreSample`, `NEWS_CATEGORIES`. Newest-first sort in the seam.
- `components/home/market-news.jsx` — `MarketNewsCard`: Trade/Consumer tabs, headline · source · date
  rows opening the article, Sample chip. House-only **"→ Signal"** action distills a headline into a
  Tier 2 signal (deterministic `distill()` — no AI pass yet).
- `lib/signals.js` — localStorage overlay (`cs-signals-local-<tenant>`, same model as brand kit /
  Library catalog): `loadLocalSignals` / `addLocalSignal` / `removeLocalSignal`, merged in `getSignals()`.
  Promoted signals immediately feed `rankOpportunities`.
- `command-center.jsx` — renders the card in the At-a-glance grid; `signalsVersion` bump on promote
  re-ranks the Opportunities lane without flashing the whole strip.
- `agency-console.jsx` — `market-news` row added to the SEAMS integration panel.
**Status:** `npx vite build` clean (to `/tmp/dist-check`; sandbox can't empty `dist/` on the mount —
same create-not-delete asymmetry as the lock). Next: wire the real overnight source (scheduled morning
research task writing `market-news.json` — spec-recommended v1), then Slice 4 (one live signal feed).

## 2026-07-01 (cont.) — SKU pre-select + Slice 2 (HubSpot companies, scoped) — committed, NOT yet pushed

**Action — SKU pre-select (closes the Slice 0+1 gap).** `command-center.jsx` now passes
`getPricingData(resolved)?.catalog` into `rankOpportunities` — the catalog arg was never passed before, so
`skuCodes` was silently always empty and Compose never pre-selected anything. Also fixed 5 product-id refs in
`signals.json` that didn't match `catalog.json` (best-effort placeholders flagged in the prior handoff):
`grana-padano-dop`→`grana-padano`, `parmigiano-reggiano-dop`→`parmigiano-reggiano-pdo` (×2),
`provolone-dolce`→`mild-provolone`. All 8 signals now resolve cleanly against the catalog.

**Action — Slice 2, scoped to companies/contacts (deals don't exist yet).** Tested the live
`crm-summary` function directly: `HUBSPOT_TOKEN` already existed in Netlify and works — 697 contacts, 591
companies, **0 deals**. Since the mock CRM shape (`pipeline`/`orders`/`invoices`) is deal-centric, decided
(Rick) to scope Slice 2 to real accounts only and leave pipeline/invoices on mock until deal-stage tracking
exists in HubSpot for real — rather than ship a dashboard with a misleadingly-empty pipeline.

- `netlify/functions/crm-hubspot.js` (new) — read-only, paginated HubSpot companies + contacts count. Leaves
  `pipeline`/`orders`/`invoices`/`activity` empty on purpose (see scope note above).
- `lib/crm.js` — `getCrmData()` branches on `VITE_CRM_BACKEND`: `mock` → bundled sample, `hubspot` → the new
  function, anything else → the existing Make-webhook proxy (unchanged).
- `lib/opportunities.js` — `accountsFromCrm()` now also ingests `crm.companies`, so real HubSpot accounts
  (with their Channel) flow into the ranking.
- `command-center.jsx` — Pipeline-by-stage / Recent-activity cards now hide when their array is empty,
  instead of rendering misleading all-zero rows once a real backend is live.
- **Company property `Channel` internal name confirmed live in HubSpot as `channel`** (Settings > Properties
  > Company properties > Channel > Internal name) — matches what the code assumed, no fix needed.

**Status.** Committed as `1742a94` (on top of `7f94011`) — build compiles clean. **NOT yet pushed** as of
this writing; multiple push attempts from the Cowork sandbox and from Rick's Terminal have not landed on
`origin/phase-2-6-build` (still shows "ahead 2" after `git fetch`) — root cause not yet confirmed, see
`HANDOFF.md` for the exact retry steps. Netlify env var `VITE_CRM_BACKEND=hubspot` was added with **Builds**
scope (all scopes) — confirmed correct scope (Post processing, the first attempt, would NOT have worked;
`VITE_*` vars need the Builds scope since Vite reads them at build time) — but the value can't take effect
until the push lands and a new deploy runs.

**Unblocks (once pushed + deployed).** Live re-test of `crm-hubspot` endpoint + Opportunities lane showing
real Monti accounts. **Next after that:** Slice 3 (Market News card + scheduled morning brief, no connector
needed).

---

## 2026-07-01 — Market Intelligence / Opportunity Engine — Slice 0 + 1 shipped (on mock)

**Decision.** Extend the Content Engine from one input (brand voice) to three — **brand voice + market
signal + customer profile** — fused into ranked "who / why-now / what-to-say" content actions. The brand
story is the **selector** (brand-fit scoring picks the angle), not a passive input. Full architecture:
`docs/MARKET_INTELLIGENCE_SPEC.md`.

**Action — Slice 0 (reconcile).** Salesforce is dead; **HubSpot IS the CRM**. Fixed stale Salesforce refs
in `lib/crm.js`, `command-center.jsx`, and `agency-console.jsx` (`SEAMS`: CRM `liveWhen:"hubspot"`, added a
`signals` seam row). Added the channel→audience crosswalk `CHANNEL_TO_AUDIENCE`/`audienceOf` in `crm.js`
(Distributor→distributor · Restaurant/Chef→foodservice · Specialty grocer + Retail chain→retail ·
Partner/Producer→excluded).

**Action — Slice 1 (engine, on mock).** `data/montitrentini/signals.json` (8 real Monti signals) ·
`lib/signals.js` (`getSignals` seam, `VITE_SIGNALS_BACKEND`) · `lib/opportunities.js` (`rankOpportunities`,
brand-fit-weighted 0.45/0.30/0.25) · `emptyProposal()` gains `buyerId` + `signalKeys` · **Opportunities lane**
on the Command Center → **Compose** seeds a proposal draft and jumps into the builder. Compose target = the
previously **orphaned `ProposalBuilder`, revived behind a non-nav `compose` route** in `App.jsx`
(ContentStudio/SlideStudio keeps the "proposals" nav slot).

**Status.** Build compiles clean (`vite build` — only the pre-existing chunk-size warning). Engine verified
against mock CRM: Eataly (distributor, active reorder) tops at 97 with the supply-chain angle. **Uncommitted
on disk — Rick reviews, then pushes.** No new credentials used.

**Unblocks.** Demo-ready proof of the "Content Engine wired to the CRM" pitch on mock — waits on no one.
Next: Slice 2 (wire HubSpot read-only, needs `HUBSPOT_TOKEN` in Netlify env) · Slice 3 (Market News card +
scheduled morning brief) · pass a real `catalog` into `rankOpportunities` so Compose pre-selects SKUs.

---

## 2026-06-20 (cont.) — Wheel: motion locked in Blender, photoreal ceiling, pivot to illustrated

**Track A (Higgsfield photoreal intro) — stalled on the rigid tilt.** Higgsfield
(Cinema Studio / Seedance) renders gorgeous photoreal cheese but **morphs** the
wedge instead of a rigid hinge — failed repeatedly across v2/v3 prompts, end-frame
anchoring, and the "imitate the diagram" wording. Checked Higgsfield's Edit tab:
Grok Imagine Edit / Kling Video Edit exist but there's **no outline→photoreal
restyle (ControlNet) mode** — Method A is a dead end for line-art input.

**Blender owns the MOTION.** Built the exact rigid hinge: a wedge tilts up 90°
about its **bottom outer rim edge** (the lever), rigid, no morph, wheel stays
whole. Scripts in `design/asiago-wheel/handoff/blender/`: `previz_rigid_tilt.py`
(spin+flyover), `outline_motion.py` (Freestyle OUTLINE plate, photo perspective,
wedge right-of-center via BASE_SPIN, stand+hold), `solid_standing.py`,
`photoreal_standing.py`. Renders + `wedge_storyboard.png` + `key_*` frames + the
clips copied to **`~/Downloads/Wheel Story/`**. Geometry/axis spec:
`docs/WEDGE_GEOMETRY_AND_AXIS.md`.

**Photoreal-in-Blender hit a ceiling (Rick: "terrible").** Procedural materials =
smooth golden "clay" (no skin); the only photo texture maps we have
(`textures/paste_*`,`rind_*`) are low-res web crops = bad. True photoreal needs a
GOOD texture source we don't have (high-res cut-face/rind photo, or Firefly
seamless textures). **Decision (Rick): drop photoreal, focus the ILLUSTRATED
animation** per `docs/CST_OPENING_ANIMATION_STORYBOARD.md`.

**Track B (illustrated explainer) — started.** Built Phase 1, the **data-viz open**:
`prototypes/cst-data-open.html` — an 8-slice pie chart that draws itself on in CST
brand colors with leader lines + typewriter business-term labels (Pricing, Content,
Sales, Inventory, Social Media, Content Studio, Orders, Dashboard). Self-contained
HTML, doubles as a landing asset. **NEXT:** grid + pie→cheese morph → 8 app labels
→ rigid wedge reveal + app window → colored-pencil logo. Blender MCP connector is
installed but the **add-on server isn't started** (N-panel → BlenderMCP → Connect);
until then Blender is driven via console clipboard-paste. **Status.** In progress.

## 2026-06-20 — Asiago wheel goes 3D in Blender + split into TWO tracks

**Action.** Built the Asiago wheel for real in **Blender 5.1** (driven via app
control — the Blender MCP connector never linked). `build_asiago_wheel.py` = a
one-click procedural build: separate wedge objects (apex at origin), beveled,
procedural paste/rind, 3-point studio rig, camera, Cycles. Rendered photoreal
hero stills (`renders/wheel_hero2.png`), then a clay **motion previz**
(`renders/previz.mp4` via `previz_animation.py` — spin + camera push-in + one
wedge eject). Saved `design/asiago-wheel/asiago_wheel.blend`.

**Decisions (Rick).** (1) **Wedge count = 8** (one per portal app:
Dashboard·Campaigns·Catalog·Orders·CRM·Media hub·Tools·Content Studio) — rebuilt
from 7. (2) **Paused photoreal**, pivoted the styled version to an **illustrated
"art + tech"** look — cel-shaded brand tones + Freestyle ink outlines
(`style_illustrated.py`, `renders/wheel_illustrated.png`). (3) Split the effort
into **two parallel, separate tracks** (see `design/asiago-wheel/handoff/docs/
TRACKS_AND_AGENDA.md`):
- **Track A — Higgsfield cinematic intro (photoreal):** rotation + a wedge
  standing (tilt **corrected** vs the awkward v1) + zoom-in + camera flyover,
  **longer** cut, **no app/label text** → then **After Effects** for the CST logo
  build + animation overlay. Assets: Firefly photoreal still + Higgsfield v1 clip.
  Paste-ready prompt: `HIGGSFIELD_INTRO_LONG_PROMPT.md` (+ `HIGGSFIELD_SPIN_TILT_PROMPT.md`).
- **Track B — art-tech illustrated wheel (Blender):** the branded opening
  animation (pie→cheese morph → spin → per-wedge portal reveal with labels) and
  the same-engine real-time **app launcher**. Storyboard + art direction:
  `CST_OPENING_ANIMATION_STORYBOARD.md`.

**Shared.** After Effects is the post home for both (logo/titles/music); the video
engines output clean plates. Higgsfield watermark removes only via a
watermark-free export tier, not the prompt. **Status.** Track A: longer corrected
prompt ready → Rick to generate in Higgsfield, then AE. Track B: 8-wedge model +
illustrated style v1 + clay previz done → refine look, add morph, labels.

## 2026-06-19 — Wheel embedded as the flow landing HERO (code-slot)

**Action (Rick: "the version you have now").** Built `prototypes/flow-landing-wheel-hero.html` — the
interactive photo-textured Asiago wheel mounted as the **`kind:"code"`/scene HERO slot** of a `flow`
landing (per `docs/SLOT_MANIFEST_SCHEMA.md`). Brand-painted CST house kit (Forest/cream/Fraunces), nav +
eyebrow→title→sub hero, the live wheel (drag/click → eject + readout, unchanged), then flow band
("One platform. Every channel. Built to sell." + CTA) + footer, all scroll-revealed. Wheel module
(textures + deterministic mechanic) reused **verbatim** from `…-photoref.html` via Python splice — proves
the showpiece drops into the Content Engine flow renderer as-is. **NEXT:** when Stage-3 `.glb` lands, swap
geometry/material inside the same hero slot (no landing changes). **Status.** Prototype.

## 2026-06-17 — In-engine beauty still + Stage-3 decision (Blender/Substance)

**Action.** Built `prototypes/asiago-wheel-beauty-render.html` — a standalone hero still (photo
materials, per-wedge mirror-flip variation, RoomEnvironment + PCFSoft **cast shadows**, 3⁄4 angle, one
wedge ejected, high-res supersample); saved `design/asiago-wheel/beauty-render-inengine.png`. **Finding:**
two hard ceilings on photoreal *here* — (1) web-res references → only ~150px clean paste, soft/swirly at
hero scale; (2) no Blender/Node in-env → no path-tracer. **Decision (Rick):** go **Stage 3** — real
Blender + Substance on his machine. Wrote `docs/ASIAGO_WHEEL_BLENDER_BUILD.md`: specs matched to the
prototype (7 wedges · 51.43° · R:H 3:1 · paste=cut faces · apex at origin), Substance paste/rind recipe,
Blender model→bevel→UV→materials→HDRI→Cycles, then bake + **glTF/Draco/KTX2** export back into the
runtime (eject code unchanged). Two outputs from one model: hero still (Track B) + web GLB (Track A).
**Status.** Guide ready; Rick to build offline, then hand back the `.glb` + still.

## 2026-06-17 — Photo-textured wheel (render-plan stage 2, lean path)

**Action.** Kicked off the photoreal track from `ASIAGO_WHEEL_RENDER_PLAN.md`. Baked **real reference
crops** into PBR maps with PIL (the in-session stand-in for Substance/Firefly): **paste** (eyes) from
`formaggio…stagionato` bottom-left block crop, **rind** from `slider_vecchio`'s clean brown side.
De-lit each via **divide-by-blur** (kills the shadow gradient → flat albedo, keeps eyes/pores), retinted,
derived **bump** from luminance. Masters saved to `design/asiago-wheel/textures/` (paste/rind ×
albedo+bump, ~185 KB total). New prototype `prototypes/asiago-wheel-3d-photoref.html` inlines them as
base64 data-URIs (avoids file:// canvas-taint) and swaps the procedural canvas textures for
`TextureLoader` maps — same geometry, same deterministic eject, real photographic paste on every wedge.
**Open follow-ups:** per-wedge UV offset/rotation to break the pinwheel repetition · deepen paste
contrast · richer rind on the arc · then Blender bevel+bake+HDRI (stage 3). **Status.** Prototype.

## 2026-06-17 — Wheel v3.1 — fixed perspective + deterministic motion

**Action (Rick notes).** (1) *Out of perspective* → dollied camera back + narrowed FOV (26°), eased the
rig lean to −0.24 and lifted it; the wheel now reads as a clean round 3D object, no skew. (2) *No random
rotation* → replaced the sine-wave rock with a **scripted, repeatable timeline**: rotate slice to slot
(`T_ROT`) → slide it **radially out of the wheel** (`RAD_OUT`, reads as pulling a slice from the pie) +
push toward camera (`POP_Z`) → **one clean 360°** revolution → settle facing front and **hold**.
Identical path + end pose every time; non-selected wedges retract to the nearest full-turn (no unwind).
Drag-spin still snaps nearest-to-slot on release. **Status.** Prototype.

## 2026-06-17 — Full spinnable Asiago WHEEL selector (v3)

**Action.** Built `prototypes/asiago-wheel-3d-prototype.html` — the slices assemble into a **complete
wheel** and become the nav. **7 sector wedges** (apex-at-origin geometry, PBR paste face + eyes, rind
rim/arc) seated at `i·(2π/7)` on a `wheel` group, tilted back on a `rig` so the depth + rind band read.
**Spinnable** (pointer-drag → `wheel.rotation.z` with snap-to-slot on release) and **selectable**
(raycast a slice, or a tool-chip picker). The selected slice eases to the **bottom ACTIVE SLOT**, then
**pushes forward** (`pop` group +Z toward camera) and **rotates on its own slice axis** (`spin` group,
pivot at the wedge centroid) to present itself — while the readout types its `page · id · function` and
HTML labels **orbit** each slice (projected per-frame). All 7 tools wired (Proforma…Commitments).
Self-contained (procedural textures, no external assets). **NEXT:** real-photo albedo texture · tune
eject (distance / full barrel-roll vs rock) · then embed as a `kind:"code"` scene-slot in a `flow`
manifest (apex landing hero). **Status.** Prototype only.

## 2026-06-17 — Photoreal PBR skin on the 3D wedge (v2)

**Action.** Built `prototypes/asiago-wedge-3d-photoreal.html` — the wedge gets a real **PBR skin**.
Procedural **canvas textures**: paste albedo with scattered **eyes** (dark-cored holes + ring +
highlight) over mottled aged straw, plus rind albedo with grain + cracking; matching **bump maps** so
light catches the surface. **UV-mapped** geometry (radial×height on the cut faces, angle×height on the
curve, planar caps). `RoomEnvironment` + PMREM for soft studio reflections, **ACES** tone mapping;
paste = `MeshPhysicalMaterial` w/ faint clearcoat (waxy aged look), rind = rougher standard. Warm key +
cool fill + warm rim restore dimensional shaping. Fully **interactive** (drag/hover/readout intact),
**self-contained** (no external assets, no CORS). Interactive-grade realism — a true-photographic pass
would map the enhanced reference photo as albedo; the **Higgsfield** route is the *non-interactive*
cinematic graph→cheese intro (art layer, linear video), not this nav. **Status.** Prototype only.

## 2026-06-17 — 3D Asiago wedge POC (Three.js) — the wheel goes 3D

**Action.** Built `prototypes/asiago-wedge-3d-prototype.html` — a **true 3D** Asiago wedge in Three.js
(ES module + OrbitControls via CDN importmap). Custom **extruded sector geometry** with two material
groups: **PASTE** (pale straw-gold) on the radial cut faces, **RIND** (tan/amber) on the curved edge +
caps; warm key/fill/rim lighting; **drag-to-rotate** (OrbitControls) + hover auto-spin; tool readout
type-on. Renders headless via swiftshader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`).
Procedural material POC. **NEXT:** map the **enhanced Asiago reference photo** as the texture
(eyes/crystalline paste/rind detail) → replicate around the **full 3D wheel** → embed as a
`kind:"code"`/scene slot in a `flow` manifest (apex landing hero). **Status.** Prototype only.

## 2026-06-17 — Showpiece cheese → WHEEL OF ASIAGO (Monti flagship); source folder

**Decision (Rick).** The dynamic-landing cheese-wheel is now a **wheel of Asiago** (Monti's flagship
Asiago PDO, "Product of the Mountains") — ties the showpiece to the hero product + brand story (was
BellaVitano-form). **Created `design/asiago-wheel/`** for source assets: `references/` (drop reference
photos) + README (shot list — top-down whole wheel · cut wedge w/ eyes + rind cross-section · rind
close-up · 3⁄4 views; look = pale straw→golden, irregular eyes, natural rind; illustration over
photoreal). Pipeline: compile → enhance (Adobe/Firefly) → 3D (Three.js wedge/wheel) → embed as a
`kind:"code"`/scene slot in a `flow` manifest. The cheese-wheel POC's color/texture get retuned to
Asiago once refs are in. **Status.** Folder + brief; awaiting Rick's reference images.

## 2026-06-17 — cheese-wheel nav (interaction POC) — the dynamic-landing concept

**Action.** Built `prototypes/cheese-wheel-nav-prototype.html` — proves the core interaction of Rick's
dynamic-landing idea: a **market-size wheel rendered as an ILLUSTRATED wheel of cheese** (golden body
+ amber rind + eyes/cracks, BellaVitano-form inspired — form only, not the brand's trade dress).
Wedges sized to segment/tool weights (from channel research); each wedge **is** a portal tool. Hover
→ the wedge **lifts + tilts (pseudo-3D) + brightens** and the tool's **page ID + function TYPE in**
(typewriter) + a segment-share bar. SVG + vanilla JS, illustration-over-photoreal, on-brand (CST green
UI + Fraunces italic). 7 tool slices. **NEXT layers:** true 3D wedge (Three.js/R3F); **Higgsfield**-
generated graph→cheese morph + illustrated art (Higgsfield = linear video, NOT interactive — assets
only, can't drive from here); then embed the showpiece as a `kind:"code"`/scene slot in a `flow`
manifest (stays inside the engine, not a fork). **Status.** Prototype only — no app code.

## 2026-06-17 — flow renderer POC (animated landing) — schema `flow` mode proven

**Action.** Built `prototypes/flow-landing-prototype.html` — a self-contained POC of the **`flow`**
layout mode (`SLOT_MANIFEST_SCHEMA.md`). The CST apex landing as a flow **manifest** (`sections[]` of
typed slots: role/kind/`$token` paint + `anim`) → a generic **flow renderer** (walks manifest → DOM,
paints from tokens, tags animations) → a brand-painted **animated** landing page (fade-up · stagger ·
count-up via IntersectionObserver; reduced-motion safe). **Same slot vocabulary as the fixed/slide
mode** — only the layout + renderer differ. Proves the new half of the locked contract. Matches the
existing `prototypes/template-engine-prototype.html` (fixed-mode POC). **NEXT:** port to React
(`flow-renderer.jsx` + an apex flow template) when the fixed engine port lands; then `code` kind +
Composer flow authoring. **Status.** Prototype only — no app code touched.

## 2026-06-17 — Canonical slot-manifest schema LOCKED (Option A)

**Decision (Rick).** Locked the Content Engine contract in `docs/SLOT_MANIFEST_SCHEMA.md`. Verified the
manifest **already exists** as the v2 POC (`prototypes/template-engine-prototype.html`) and IS the Slot
Kit 1:1 (role var/brand/lock × kind image/text/shape, `as:"title"|"story"`, `$token` paint via
`brand-tokens.js`, bindings via tag/asset/voice). **Chose Option A: ONE slot vocabulary, TWO layout
modes** — `fixed` (absolute x/y/w/h canvas → slides/social, the locked POC shape) + `flow` (stacked
`sections[]`, responsive → landing/email, NEW). Extensions added to the vocab: `kind:"code"` (sanitized
embed) + `anim` attribute (none/fade-up/stagger/count-up/parallax). Build order off the contract:
(1) port fixed engine `template-manifests.js`+`manifest-renderer.jsx`; (2) build flow renderer (landing
first); (3) add code+anim; (4) Slot Composer emits both modes. **Status.** Schema doc only — no code.
Current files: v1 `slide-templates.js`+`slide-renderer.jsx` exist; `brand-tokens.js` exists; v2 manifest
files NOT yet ported.

## 2026-06-17 — Slot Composer spec (house-admin visual template builder)

**Decision (Rick).** Greenlit the **Slot Composer** — a HOUSE-ADMIN-ONLY drag-and-drop canvas that
composes templates in the Slot Kit language and emits the existing template manifest
(`slide-templates.js` shape, rendered by `slide-renderer.jsx`). Spec: `docs/SLOT_COMPOSER_SPEC.md`.
Drag containers/cards/shapes → tag each slot (role VAR/BRAND/LOCK × kind image/text/story/shape/code
× binding: upload / Media Hub / brand voice / Brand Kit token / code × anim) → save to template
library → renderers paint per client. Lives in the House Console (`agency-console.jsx`), admin-gated;
clients consume + fill VAR only. **Sequencing locked:** manifest + renderers first (Excalidraw bridge
now) → Composer is Phase 2 (a GUI over stable JSON; build the contract before the GUI). Reuses
component catalogue + Media Hub + Brand Kit + template engine. Templates = house IP (not transferred
at buyout). **Status.** Spec only — no code.

## 2026-06-17 — Slot Kit = foundational language for the Content Engine (+ handoff)

**Decision (Rick).** The **Slot Kit** is the foundational core of the Content Engine: a
template-guided, **brand-painted** content language. Wireframe a layout on a **960×540** canvas
(Excalidraw); every box is a **slot** = one **role** (`VAR` fill-per-use · `BRAND` swappable asset ·
`LOCK` auto-painted from the Brand Kit) × one **kind** (`image` · `text` · `story` · `shape`). It
compiles to a template **manifest** the engine renders. One slot-defined template → many outputs.

**Direction.** Fan the same manifest across channels: slides/PPTX (done) → **email** + **HubSpot
(social)** + **animated landing pages** (new). The Brand Kit paints the LOCK/BRAND slots so every
output is on-brand by construction. **NEXT: design the first animated landing page as a Slot Kit
wireframe in Excalidraw → hand off → manifest → renderer.**

**Tracked now.** Committed `design/slot-kit.excalidraw` + `design/SLOT_KIT_GUIDE.md` (were untracked;
now preserved as the engine's source language). The guide = the labeling vocabulary.

**Handoff for the design/build surface.** The **slot language is the CONTRACT.** Build the
landing-page, email, and social renderers to consume the *same manifest shape* the slide engine uses;
keep roles/kinds identical across renderers. Don't fork the vocabulary per output. (`brand/
monti-logo-transparent.png` still untracked — commit if it's the canonical mark.)

## 2026-06-17 — Competitive landscape: Keychain strategic read

**Action.** Added `docs/COMPETITIVE_LANDSCAPE.md` — full strategic read of **Keychain** (keychain.com,
the CPG *manufacturing* network: KeychainOS + Keychain360; ~30k mfrs / 20k brands; ~$68M; free for
brands, $5k–$100k/yr enhanced listings for manufacturers; no rev-share/API/partner program).
**Decision/framing:** Keychain is a **strategic ADJACENCY — not a partner, not a competitor.** It's
upstream (sourcing/make-it); CST is downstream (brand/sell-it). Key gap: Keychain promotes *makers to
brands*, never a *brand/product to buyers or consumers* — that's CST. Doc covers: reselling angle
(package Keychain's free buyer side as a "Source & Scale" managed service; manage Monti's producer
listing) and a conceptual **downstream integration** (Keychain export → CST canonical-catalog adapter
→ storefront; manual handoff until an API exists; never build a dependent feature). **Status.** Docs only.

## 2026-06-17 (cont. 5) — Content Studio IS the template engine

Rick: "the template engine prototype is the app now." Made it so. `App.jsx` route `proposals` (Content Studio)
now renders `ContentStudio` (`src/components/proposals/content-studio.jsx`) → opens **directly** into `SlideStudio`
(full-window: type switcher, template gallery, filmstrip, slot inspector). The old `ProposalBuilder` "pitch/range"
form is no longer routed (retired; will return as the **Sales sheet** type in the switcher). `SlideStudio` back
button is now optional (page mode). **Image-adjust ported** to the live renderer + inspector: fit (cover/contain),
zoom/resize, reposition, skew X/Y, reset (stored on the slide in `slots.__img`, applied in `slide-renderer.jsx`).
Note: deploys were building but **auto-publish was off** in Netlify — turned on; that was why v2 looked "not live."
Still to port for full prototype parity: **Present mode** + **16:9 Export PDF**. `vite build` clean.

## 2026-06-17 (cont. 4) — v1 retired; manifest engine is canonical

Removed the dead region-based `DeckComposer` modal from `presentations-page.jsx` and its now-unused imports
(SLIDE_TEMPLATES/getSlideTemplate/firstImageId, getBrandKit, voiceOptions). The **tokenized manifest engine
+ `SlideStudio`** is the single source of truth for Content Studio composition; `slide-templates.js` (manifests)
and `slide-renderer.jsx` (coordinate renderer) fully replace the v1 region model. `vite build` clean.
POC (`prototypes/template-engine-prototype.html`) extended this session with: content-type switcher, full-window
deck builder, per-image Adjust panel (fit/zoom/reposition/skew), and 16:9 PDF export (cream + auto-fit hold).
Still to port to the app: Adjust-image panel + 16:9 PDF export.

## 2026-06-17 (cont. 3) — Template Engine v2 PORTED into the React app

POC approved → ported the manifest engine into Content Studio. New/changed:
- `src/lib/brand-tokens.js` (new) — `brandTokens(resolved)` resolves `$accent/$display/$logo/…` from the
  tenant Brand Kit (colors, type cssStacks, logo/seal); `resolveTok` + `voiceOptions` (story blocks, ready
  phrases, lines) for copy slots.
- `src/lib/slide-templates.js` (rewritten) — now the 10 tokenized **manifests** (coordinate slots, roles
  var/brand/lock, z-order, tags, fills, pick, logo toggle). Same export names (`SLIDE_TEMPLATES`,
  `getSlideTemplate`, `firstImageId`) so callers didn't change.
- `src/components/presentations/slide-renderer.jsx` (rewritten) — coordinate renderer painted by tokens; cqw
  fonts; gradient/scrim shapes; per-slide hide (`slots.__off`); brand/lock asset overrides; present mode
  (hides empty slots + wireframe); legacy string-slide fallback kept.
- `DeckComposer` (presentations-page.jsx) — template-first slot panel: image slots → live **MediaPicker**
  (`defaultTag = slot.tag`, stores Cloudinary public_id), copy slots → **brand-voice** dropdown + free text,
  story slots → story-block filler, logo → "show on this slide" toggle + swap. Saves link-based deck
  `{kind:"deck", category:"slide-deck", cover, slides:[{t,slots}]}`. DeckViewer/proposal-view already render
  structured slides via SlideRenderer.

**Full-window composer + content-type switcher** (`src/components/presentations/slide-studio.jsx`, new):
Content Studio's "Compose deck" now renders inline as the main view (modal removed) — content-type switcher
(slide-deck live; blog/email/social-post/social-carousel/sales-sheet coming-soon), slide filmstrip, per-slide
template dropdown, slot inspector beside the live painted preview. `proposal-builder.jsx` renders `<SlideStudio>`
when composing and saves via the same Content-Library seam.

Quote template (#7) gained an optional hero photo with a left→right gradient fade. **Text auto-fit ported**
(imperative shrink-to-box pass in SlideRenderer via data-cqw nodes + ResizeObserver). `vite build` clean.
Deferred (matches POC stubs): Cloudinary bg-removal pipeline + tag, product-name metadata link (Custom Price
List), server-side PDF, Content-Library write seam.
Prototype kept at `prototypes/template-engine-prototype.html` as the reference spec.

## 2026-06-17 (cont. 2) — Template Engine v2: tokenized manifest POC + bindings

Rick supplied a PowerPoint-derived **handoff** (`product-feature-v1`): a coordinate field-map — slots with
roles **var/brand/lock**, absolute x/y/w/h on a 960×540 canvas, z-order, per-slot fonts/colors. Adopted the
slot model over v1's region approach (marketing slides are compositions, not reflowing docs — that's why the
handoff JPEGs look polished). **Challenged & refined it** before building:
- **Critical fix — tokenize the paint.** Handoff hard-coded Monti hexes/fonts (`#00963F`, Georgia). That makes
  a *Monti* template, not a *platform* template, and breaks the clone canon. Refined so slots reference Brand-Kit
  **tokens** (`$accent`, `$display`, `$logo`); the renderer resolves them against the active tenant's kit. Same
  manifest → any brand, zero edits. (Migration trivial: the literal hexes already *are* Monti tokens.)
- **Templates are platform-shared** (`templates/<family>/vN`), painted per tenant — not tenant-namespaced.
- **Text auto-fit** (shrink-to-box) so real copy doesn't overflow fixed boxes.
- **Scope honestly:** coordinate manifests = fixed-canvas (slides + social per ratio); blog/email = separate
  flow engine later. **HTML is the source render; PPTX/PDF/PNG are derived** (defer the `render.ts` PPTX path).
- **Bindings live in the manifest** (built ahead of the plug-in phase): image slots → **Media Hub** (tag-filtered),
  copy slots → **brand voice** (story blocks / phrases / lines), lock → painted from kit.

**Built:** `prototypes/template-engine-prototype.html` — a self-contained, tokenized POC. Template browser of
10 templates (product-feature + the 9), all painted from ONE `BRAND_KIT` object via tokens; template-first
editor (pick → painted → fill each slot); required Title per template; Media-Hub pickers for images, brand-voice
dropdowns for copy; Monti Heritage Cream canvas. Decision (Rick): **tokenized paint**. This is the "smart brand-kit
plug-in + smart slide-deck builder" foundation. Next: build a 10-slide Monti deck to stress-test the 9, then port
the manifest engine into the React Content Studio (live MediaPicker + brand-voice doc + Cloudinary).

## 2026-06-17 (cont.) — Template Engine: spec + v1 (Content Studio templates)

Rick: Content Studio needs templates. Model decided & spec'd (`docs/TEMPLATE_ENGINE_SPEC.md`) + diagrammed:
**a template = layout SLOTS + brand-kit PAINT + slot BINDINGS** (image slots → MediaPicker; copy slots →
story blocks/topics; text → input; logo/colors/fonts → auto-painted from the Brand Kit). One engine serves
slides now, then social (size-aware, image export) / blog (HTML) / email (email-safe) — only layouts+sizes
differ. Reuses ~80% of existing parts (Brand Kit, Theme Engine, MediaPicker, story blocks, DeckViewer).
**v1 build (slides):** `src/lib/slide-templates.js` (Image/Cover/Statement/Story slot defs) + `SlideRenderer`
(brand-painted) + template-based DeckComposer (pick template → fill slots → live preview) + DeckViewer renders
structured slides (`{t, slots}`), with string slides kept as legacy full-bleed images (backward compatible).
Decks save link-based to the Content Library (category slide-deck). Clone fit: shared templates + per-tenant
Brand Kit paint → instant on-brand starter deck for any client (the `_template` onboarding model).

**v1.1 — template library expanded (5 added).** Beyond Image/Cover/Statement/Story, added five layouts to
`slide-templates.js` + `SlideRenderer`: **Three-up (pillars)** (3 image+caption columns), **Big stat**
(large figure + label on brand field), **Quote** (pull-quote + attribution), **Product range** (3 product
cards, image + name), **Closing / CTA** (logo + headline + CTA pill + contact). All brand-painted via
`--cs-color-*` tokens with cqw sizing; empty slots render on-brand placeholders. Build clean. Nine templates
now selectable in the Content Studio composer.

## 2026-06-17 (cont.) — CRM tool card on the Operations Portal landing page

Added a **CRM** entry to Monti's `config/clients/montitrentini.json` `tools` array (registered the `contact`
icon in `src/lib/icons.js`; `type: internal`, `route: "crm"`, `tag: "CRM · live"`) so it appears in the
dashboard **Tools** grid → opens the CRM page via `onNavigate("crm")`. Pure **config** change — clone-friendly:
include or omit the CRM tool per client in the `_template`, zero code. Build clean. (CRM now reachable three
ways: side-panel nav, Tools-grid card, and the house CRM-snapshot card.)

## 2026-06-17 (cont.) — CRM surfaced: house snapshot + tenant CRM page

**Verified live** earlier: the read-only HubSpot connection returned 632 contacts · 514 companies · 0 deals.
Now surfaced in two places: (1) **house dashboard** — a live "CRM snapshot" card (`agency-console.jsx`)
auto-loads the three counts on open; (2) **tenant Operations portal** — a new **CRM page**
(`src/components/crm/crm-page.jsx`) + side-panel nav **"CRM"** (`App.jsx`, allowed admin/client) showing
count tiles + a **recent-contacts table**. `crm-summary.js` extended to also return `recentContacts` (newest
10: name/email/company/created). Distinct from the **Campaigns** page (social/email marketing). All
read-only/additive; build clean. NOTE: single HubSpot connection = Monti's CRM for now; per-tenant CRM keys
are a future multi-tenant concern.

## 2026-06-17 — CRM seam live (read-only HubSpot) + clean admin URL + UX polish

**CRM go-live (read-only, additive):** new `netlify/functions/crm-summary.js` — direct HubSpot via the
**Service Key** (`HUBSPOT_TOKEN`, server-side only), READ-ONLY, hits the CRM search endpoint for
contacts/companies/deals totals. Integration-health panel gains a live **"HubSpot CRM (read-only)" Test
row** (counts or error). **Deliberately additive:** did NOT flip `VITE_CRM_BACKEND` (lib/crm.js treats any
non-mock value as the **Make** webhook → would break the CRM dashboard), and did NOT touch the Make `crm.js`.
Decision: Service Key (HubSpot's recommended single-account credential) over legacy private app. Full CRM-
dashboard-on-HubSpot (map shape + flip flag) = its own next slice. **Clean house URL:** reserved subdomains
`admin`/`app`/`console` now skip the landing → house app (`App.jsx`); DNS + Netlify alias still Rick's to add.
**UX polish:** gate eyebrow (house vs client), Content Studio subtitle, Content Library "Load content" + empty
state. **Doc:** `docs/INTEGRATION_WIRING_BRIEF.md`. Build clean.

## 2026-06-16 — CheeseShop TECH landing page v1 (apex)

Built `src/components/marketing/landing-page.jsx` from `docs/CST_POSITIONING_BRIEF.md` and wired it at the
apex in `App.jsx` (replaces `<ComingSoon/>` render; ComingSoon file kept for rollback). Invite-only, outcome-led:
hero "The brand power of a big team. The focus of a small one." + brand-to-sales-engine sub; 4 pillars; a proof
band (10–20% consistency stat + the founder's 300%→$5M cheese-brand story); closing CTA; quiet "Log in" → /?app=1.
House brand via tokens. Build clean. OPEN before launch: the "Request an invitation" CTA is a **mailto placeholder
(hello@cheeseshoptech.com)** — wire a real form/inbox; and confirm the apex DNS serves the Netlify site.

## 2026-06-16 — SESSION RECAP (platform-build day)
Content-orchestration v1 shipped end-to-end (Slices 1–4: categories, gated publishing, download-to-device, quota)
then simplified (PPTX cut → no risky backend; review gate OFF by default behind per-client `reviewRequired`).
Canonical locked: **CheeseShop TECH = platform/agency Rick owns; Monti = client/tenant.** Two-track rule
(platform build never waits on client approval; goal 10+ clients in 6–12 mo). Positioning brief written
(platform moat + founder credibility from the real resume + competitive sampling). Landing page v1 built. Monti
campaign staged, **gated on Stefano's approval + pricing (Thursday 2026-06-18 meeting; reminder set 7:30am)**.

## 2026-06-16 — Review gate OFF by default (per-client opt-in)

Rick's call: the CST review gate isn't needed. Junk/sprawl is already controlled by the **10-item quota** +
light link/thumbnail storage, and brand consistency is enforced at the **inputs** (brand kit / themes /
CST-controlled Media Hub) — so reviewing a client's own finished proposals is redundant. Implementation:
saves now post **directly** unless a per-client **`resolved.reviewRequired`** flag is set (default off →
Monti self-saves). The approval machinery (STATUS, Approve/Return UI, dedup flag) is **kept but dormant** —
activates only when a client opts in, so the template keeps the capability for future clients. Two onSave
sites changed (DeckComposer in Content Studio + LoadDialog in Content Library). Spec §7/§13 updated. Build clean.

## 2026-06-16 — PPTX cut from the app (de-risks Slice 5)

Rick's call: PowerPoint is handled entirely outside the platform — export to PDF first. Removed PPTX from
the LoadDialog upload path (`accept` now `.pdf,image/*`; kind detection drops the pptx branch; copy updated
to "export to PDF"). Why it matters: PPTX was the only Cloudinary `raw` finished type, so this **eliminates
the need to touch `media-list.js`** — finished files are now PDFs + images (both `image` resource type,
already listed). Spec §11/§12 updated; the risky "finished-file backend" slice collapses to an optional,
deferred CST-gated-writes pass. Net: less surface area, lower risk, build clean. (Legacy `pptx` badge label
kept as a harmless display fallback.)

## 2026-06-16 — Content orchestration Slices 3 + 4: download-to-device + storage quota

Spec §9/§10. **Download-to-device:** `downloadHref()` in `presentations-store.js` adds Cloudinary
`fl_attachment` so the browser saves the file instead of navigating; a **Download** button shows on any
Library card whose `url` is a Cloudinary file (PDF/image/PPTX). Live decks/links have no single file → no
button. **Storage quota:** `DEFAULT_QUOTA = 10` (per-tenant override `resolved.contentQuota`); counts the
client's stored catalog only (platform/config decks don't count). Content Library header shows **`n/quota
stored`** (red when full) and **disables Load** at the cap; both save paths guard — LoadDialog (Library) and
DeckComposer (Content Studio) refuse to add when full and toast "delete or download to add." Frees on
delete. Build clean. NEXT (spec §12): finished-file backend — extend `media-list`/upload for raw/finished
types + CST-gated Cloudinary writes (the last orchestration slice; bigger, touches Netlify functions).

## 2026-06-16 — Content orchestration Slice 2: submission + review/dedup (gated publishing)

Spec §3/§7. `presentations-store.js`: `STATUS` (submitted/posted/returned), `entryStatus()` (legacy/house
entries default **posted**), `updateEntry()`, `duplicateKeys()` (flags entries sharing a normalized title
or identical url). Saves now stamp status by role: **house/CST (admin) → posted; client/client-admin →
submitted** (DeckComposer in Content Studio + LoadDialog both). Content Library: non-managers see **posted
only**; managers also see pending/returned with **Pending review / Returned** badges + a **Possible
duplicate** flag (house). House-only **Approve** (→ posted) / **Return** (→ returned, optional note via
prompt) actions per card. Models gated publishing without a backend (per-tenant localStorage); a real review
queue + cross-tenant House Console comes later. Build clean. NEXT (spec §12): download-to-device; storage
quota (default 10/client); finished-file backend (raw types + CST-gated Cloudinary writes).

## 2026-06-16 — Content orchestration Slice 1: content-type categories

First slice of `CONTENT_ORCHESTRATION_SPEC.md`. Two-track rule in effect — platform build proceeds
independent of client approval (see memory `cst-build-strategy`). `presentations-store.js`: added the
**content-type taxonomy** `CONTENT_CATEGORIES` (presentation · slide-deck · social-post · email-campaign ·
blog-post) + `categoryLabel()` + `entryCategory()` (legacy entries fall back to "presentation"); entries
gain a `category` field. Content Library (`presentations-page.jsx`): **category tabs** (All + 5, with live
counts) that filter the grid; each card shows a category badge; "Nothing in this category yet" empty state.
DeckComposer auto-tags saves as `slide-deck`; LoadDialog gained a category selector; config decks default
to `slide-deck`. Build clean. NEXT slices (spec §12): submission/review queue + dedup; download-to-device;
storage quota (default 10/client); finished-file backend (raw types + CST-gated writes).

## 2026-06-16 — Content Studio / Content Library + Slice 2 deck composer

The proposal surface evolved into a content system (Rick's "one mind, one body" as outputs multiply
to social/blog). Shipped together:
- **Renames (display only, route keys stable):** "Create a Proposal" → **Content Studio** (makes it);
  "Presentations" → **Content Library** (holds it). "Catalog" reserved for the Product Catalog (avoid
  collision). Mental model: **Media Hub uploads ingredients → Content Studio pulls + composes → exports
  finished pieces (slides/social/presentations/blogs) to the Content Library.**
- **Story topics panel** (`proposal-builder.jsx`): brand-voice angles from `brand-kit.json storyTopics`
  (7 for Monti), under the range picker; click → appends the line to the proposal intro.
- **Attribution from the brand kit:** `brand-kit.json` `attribution` field → proposal-view closing line
  shows **"Imported by Monti Trentini USA"** (was "Prepared with CheeseShop TECH"); other tenants fall
  back. Sell sheets updated to match (Posada & Co. + CheeseShop TECH removed from prospect-facing footer).
- **Slice 2 — slide-deck composer (images-only), SHIPPED:** **"Compose deck" button lives in Content
  Studio** (`proposal-builder.jsx`, next to Clear/Preview) — composing belongs where you *make* things.
  `DeckComposer` (exported from `presentations-page.jsx`) pulls Media Hub images via the tag-filtered
  `MediaPicker` (hover-preview), orders slides (up/down/remove), first slide = cover. Saves a
  **link-based "deck"** entry into the **Content Library** catalog (`addEntry`) — slides are Cloudinary
  delivery URLs (references, **no upload**); plays in `DeckViewer` (iPad touch + fullscreen), shares by
  link. Confirms the model: **Media Hub → Content Studio composes → Content Library holds.** Build clean.
  NEXT slices: story-block text slides; social-post + blog export paths.

## 2026-06-16 — AI tool embed PARKED (house-admin design agent)

Rick: "let's hold off for now but tag it in the build." Decided NOT to build a live in-app AI agent
yet. Tagged: `docs/AI_TOOL_EMBED_SPEC.md` (PARKED) + a `PARKED(ai-embed)` code marker in
`proposal-builder.jsx` where an "Auto-compose" button would sit. Reasoning captured: the in-website
AI would reuse the exact secret-safe Netlify-function pattern already in prod (media-* functions) —
browser → function (holds `ANTHROPIC_API_KEY`) → Claude API → draft back. Prereqs are Rick's:
pay-as-you-go Anthropic API billing (separate from the Claude subscription) + a console spend cap.
Cost-per-compose is cents; the real cost is build/maintenance, so deferred until self-serve volume
earns it. Until then the design-agent role = Claude in Cowork (no infra/key/cost). Hard rule kept:
NOT AI image generation — compose from the real Media Hub photography, don't synthesize. Resume only
after Slice 2 (deterministic composer) exists; AI is the optional layer on top.

## 2026-06-16 — "Create a Proposal" + color-safe PDF export + tag-driven Media Hub picker

Three shippable pieces (build verified clean each time; deployed via Terminal paste — see lock note).

- **Renamed Proposals → "Create a Proposal"** (nav `App.jsx` + builder headings).
- **Print-to-PDF export, color-safe.** `proposal-view.jsx` "Export PDF" (window.print) now backed by
  a real `@media print` block in `src/index.css`: isolates `.proposal-print` (hides app chrome via
  visibility + absolute lift), forces `print-color-adjust: exact` so themed cover/closing/zone
  backgrounds actually render (browsers strip backgrounds by default = the #1 cause of washed-out
  exports), `@page 14mm`, `break-inside: avoid` on product rows/cards/story blocks. DECISION: PDF is
  the proposal format — exports brand hex + Fraunces/Inter directly (no PPTX round-trip). Diagnosed
  Rick's HEB color shift = the Mac "Reduce File Size" Quartz filter dropping the color profile, NOT
  the app. Sharing/email stays in the Presentations tab (Rick's choice). Caveat: brand kit's first
  heading font "cora" (Adobe) isn't web-loaded → falls back to Fraunces until Adobe Fonts is wired.
- **Tag-driven Media Hub image picker (Slice 1).** New `src/components/media/media-picker.jsx`:
  scrollable thumbnail panel reading the SAME `listAssets()` seam, usage-tag filter dropdown,
  hover-to-enlarge preview pane (above the scroll area so it never clips), click to select. Wired
  into the builder: a **Cover image** picker + a **per-story-block** image picker. Proposal model
  (`proposals.js`) gained `heroImageId` + `storyImages{}` (backward compatible; fall back to brand
  kit). `proposal-view.jsx` zones now honor the picks. NEXT = **Slice 2: slide-deck composer**
  (assemble tagged images + story blocks into the in-app deck — iPad touch-present + fullscreen,
  export to PDF, save to Presentations).

## 2026-06-16 — Presentations = catalog of finished proposals (Load + Share + PDF first-page thumbnail)

Presentations reframed (Rick: "a catalog of finished proposals to catalog and share"; Proposals is
where they're built). `presentations-store.js` (per-tenant localStorage catalog, mirrors
brand-kit-edits). PresentationsPage "Load presentation" dialog takes a proposal three ways — paste
URL, browse files, or drag & drop — accepting PDF / PPTX / image via new `cloudinary.js`
`uploadFileAuto()` (unsigned `/auto/upload`; images downscaled, raw passes through). Each card gets
Open / Share (Web Share API → clipboard) / admin Remove. `pdfThumbUrl()` renders a PDF's **first
page** (`pg_1,c_limit,f_jpg`) as the auto cover — CONFIRMED working. **Cloudinary "Allow delivery of
PDF and ZIP files" ENABLED** (unlocks both the PDF link and the thumbnail). PPTX is stored/shareable
but downloads to open (no inline preview) → PDF is the recommended format.

## 2026-06-16 — Media Hub admin-clearance DELETE

`netlify/functions/media-delete.js` (Cloudinary Admin API DELETE, secret server-side,
invalidate=true). `media.js` `canDeleteMedia()` = admin OR client-admin (first cut was admin-only,
hid it from Rick's client-admin role). Red Delete button in AssetDialog w/ confirm; drops from
grid/recent on success. Hard delete (not archive). Commit `72db00b`.

## 2026-06-15 — Media Hub uploader fix + brand kit to Cloudinary + Asiago campaign

- **Upload "stalls forever" fixed.** `cloudinary.js` `downscaleForUpload()` (cap longest edge 2560px,
  PNG→PNG else→JPEG) runs BEFORE the unsigned POST. Root cause: unsigned preset ~10 MB cap, farm
  masters were 15–40 MB. Tradeoff: hub uploads are web-master, not print-res. Deployed (commit
  `023f373`). **RECURRING MB WALL:** Cloudinary free plan rejects >10 MB account-side — no
  signed/server/chunked upload beats it; the FILE must shrink. `downscaleForUpload` only shrinks
  images, NOT PDF/PPTX. For big decks, compress the PDF first (Rick did 22 MB → 6 MB via Preview
  "Reduce File Size").
- **Monti brand web-asset kit → Cloudinary** (29 files → `monti-trentini/library/`, clean public_ids,
  tagged). Working sandbox→Cloudinary route: `curl -F file=@… -F upload_preset=st_unsigned …` to
  `…/v1_1/sofcvmwa/image/upload` (the Cloudinary MCP can't read sandbox `file://` paths). Manifest:
  `monti_asiago_campaign/brand_kit_cloudinary_manifest.csv`.
- **Asiago launch campaign collateral** in `monti_asiago_campaign/`: photo-forward sell sheet
  (`Asiago_Sell_Sheet.html`), 3-touch relationship-first email sequence, social starter, brief.
  Pricing-by-inquiry (no numbers). Email = `Sales@montitrentini-usa.com`.
- **National Cheese Shop campaign:** 161 companies imported to HubSpot, "National Cheese Shop
  Campaign" active list (id 17), Channel = Cheese shop / Boutique grocery.

## DEPLOY / GIT LOCK NOTE (read before deploying)

The Cowork sandbox **cannot manage `.git` locks** ("Operation not permitted" on the mounted repo),
and running git from the sandbox can LEAVE a stale `.git/index.lock` that silently blocks all
commits (the `.command` buttons' `git add` then fails → "nothing committed" → push says "Everything
up-to-date"). FIX going forward: Claude does NOT run git in the sandbox; it hands Rick a paste-in-
**Terminal** block that does `rm -f .git/index.lock .git/*.lock`, stages the named files, commits,
and pushes. Rick's Mac has the permission the sandbox lacks. Verify a real commit hash +
`phase-2-6-build -> phase-2-6-build` (not "up-to-date").

## 2026-06-13 (cont.) — Usage taxonomy covers all dispatch paths (12 tags)

Rick: tags must map 1:1 to dispatch destinations so no asset has a home it can't reach. Final set
(12, Event appears ONCE, Lifestyle separate): Product Catalog, Hero, Story block, Lifestyle, Food
styling, Social, Press / PR, Event, Brand asset, **Email / Campaign, Print / Sell-sheet, Web /
Marketing** (3 added). Updated the single source `src/lib/media.js USAGE` + both functions'
`USAGE_IDS` (`media-list`, `media-update`) so they stay in lockstep — change the list in one place
conceptually, but it lives in 3 files; keep them identical.

## 2026-06-13 (cont.) — Media Hub asset editing (the WRITE half) + ownership map

Fixed the "backwards" gap (Rick: Catalog had data-entry, Media Hub didn't). Established the data
ownership model and made the Media Hub the true asset control plane — it can now EDIT assets, not
just upload them.

- **`docs/DATA_OWNERSHIP_MAP.md`** — three domains, one authoring home each: Product (SKU → price-list
  admin), Brand (Brand Kit), Asset (Media Hub). Join key = **SKU**. Product copy is NOT an asset field
  (one description, many photos); it lives with the SKU. Catalog → pure view long-term. Guardrail: one
  authoring home per fact; everything else references by key.
- **`media-update` Netlify function (WRITE)** — server-side Cloudinary Admin API update of an asset's
  tags (approval + usage) and context (caption/sku/alt). Same secret-safe pattern as `media-list`;
  reuses the existing `CLOUDINARY_*` env (no new secrets).
- **Asset edit dialog** — managers open an asset → Edit → rename, re-tag usage, link a SKU, add alt
  text, set approval; Save persists via `media-update` and merges into local + Recent state. `media.js`
  `updateAsset()` is the seam (mock = local-only no-op). Replaced the old approval-only quick buttons.

Learning note: this is the READ/WRITE split of an API made concrete — `media-list` (GET) reads,
`media-update` (POST) writes, both behind serverless functions holding the secret. The browser only
ever sees safe, shaped data.

## 2026-06-13 (cont.) — Asset Library LIVE backend (Media Hub reads real Cloudinary)

Flipped the Media Hub from mock to the real Cloudinary backend. The `media-list` Netlify function
(already existed — calls the Cloudinary Admin API server-side via Basic auth, so the API secret
NEVER touches the browser; paginates the tenant's `monti-trentini/*` prefix) now also returns
`usage[]` (tags ∩ the USAGE taxonomy) and recognizes the `library` upload subfolder — so the tag
tabs + per-view counts work against real assets. Frontend unchanged (the seam was already there).

Activation = env only: `VITE_MEDIA_BACKEND=cloudinary` (build-time, public) + server-side secrets
`CLOUDINARY_CLOUD_NAME` (sofcvmwa), `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set in Netlify
alongside the `PORTAL_*` secrets. These are real secrets — dashboard only, never committed.

Learning note: a *serverless function* is code that runs on-demand on a server (Netlify), not in the
browser — so it can hold secrets and call privileged APIs, returning only safe, shaped data. This is
the control-plane/data-plane split made concrete: the function is the gatekeeper between the public
UI and the privileged Cloudinary Admin API.

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
