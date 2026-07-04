# HANDOFF — CheeseShop TECH platform

**Updated:** 2026-07-04 · **Branch:** `phase-2-6-build` · **Surface:** Cowork
**Push state (verified 2026-07-04 via git):** all four Media Hub items commits are ON ORIGIN
(`ec45b81` → `630153c` → `29c12c9` → `0d75e46`), branch in sync — do NOT re-run those buttons.
Still uncommitted on disk: `HANDOFF.md` · `docs/BUILD_LOG.md` ·
`monti_asiago_campaign/Asiago_Cold_Email_Sequence.md` · `pdf_out/Asiago_Sell_Sheet.pdf`
→ ship via `COMMIT SESSION CLOSE MEDIA HUB.command` (campaign materials must land before Monday).
**Read first:** `CLAUDE_CODE_BRIEF.md` → this → `docs/BUILD_LOG.md` (top) →
`docs/ONBOARDING_AND_AGENTS_SDD.md` + `docs/CONTENT_ENGINE_WIRING_SPEC.md`.

## ✅ MEDIA HUB = ITEM TRUTH (2026-07-03→04 session)
**Decision:** Media Hub owns the item IDENTITY + COPY record — item #, pack size, weight, UPC,
milk type, min age, short + long description, certification. **Pricing strictly NOT here**
(Custom Price List Creator keeps it — one mind). Full detail: `docs/MEDIA_HUB_ITEMS.md` +
BUILD_LOG 2026-07-04 entry.
- Items tab (first in Media Hub rail) + item fields on any SKU-linked photo (write-through, one
  record). Storage: Cloudinary raw `{tenant}/copy/items.json` via items-save/items-get fns.
  `VITE_MEDIA_BACKEND=cloudinary` confirmed — LIVE. All four slices pushed (verified on origin
  7/4); first slice verified on prod 7/3 (Alpeggio 20724 shows Item box in the asset dialog).
- **Seed = all 71 SKUs / 34 products** from catalog.json (`scripts/build-items-seed.mjs`);
  fills blanks only, Media Hub edits win.
- **Tag-driven fields:** `product-catalog` tag → SKU + item record; non-product photos (cow,
  pasture, production) → ONE description field. New usage tag: **production** (Production /
  Cheese making). Tiles show spec line (weight · pack · milk · age) instead of usage badges.
  Dialog: long-desc toggle, Download PNG, Share.
- **Consumers pull copy via `descriptionFor(doc, sku, 'short'|'long')`** — wire Studio/Content
  Engine next; never freehand item copy.
- **Standing rule (memory'd): every code change ends with a COMMIT button.**
- Open: 71 long descriptions blank (draft from catalog facts / queue Stefano) · bulk SKU→photo
  match by public_id · Price List Creator may read identity specs from items.json (pricing never).

## ✅ THE 2026-07-02 MEGA-SESSION — all live on prod
One session shipped: **template tenant** (`demo`, content-free clone, ?client=demo) · **onboarding
kit** (7 files, downloadable, Onboarding Hub on the house Command Center) · **Pricing & Inventory
data-intake state** (real app, Google-Drive delivery) · **Studio Director Stage 0+1** (deterministic
Auto-compose) · **one-viewport Studio workspace** (filmstrip rail, fitted preview, collapsible nav,
Focus, fullscreen, slideshow) · **both sending addresses decided + live** (sales@montitrentini-usa.com
via HubSpot Starter; hello@cheeseshoptech.com for all things CST — both Google Workspace) ·
**pricing proposal v1.1** (`docs/PRICING_PROPOSAL_v1.1.md`: $2.5K/$5K/$9.5K onboarding · $650/$1,500/
$3,000 monthly · N=18 buyout — PROPOSED, flinch-test before locking).

## DECISIONS (2026-07-03, Rick)
**First campaign (Asiago) = outreach/introduction only — NO pricing goes out in the send.**
Pricing follows in later touches / on request. Launch is NOT gated on Stefano's wholesale
pricing or freight numbers.
**Sending — VERIFIED REALITY: the HubSpot-connected inbox is `sales@montitrentini-usa.com`**
(G Suite, Enabled — the only one; hello@cheeseshoptech.com = CST house address, not connected).
All campaign sends go from sales@. Auth: montitrentini-usa.com SPF ✓ DKIM ✓ (its own Google
Workspace — Monti's, separate from Rick's) · DMARC missing (DNS at Network Solutions; add
`v=DMARC1; p=none` later, not blocking). Signature + template + materials all say Sales@ + cell
(347) 356-5617 + "Sent with CheeseShop TECH — Richard Posada's sales assistant". Positioning:
**CheeseShop TECH = Richard Posada's sales assistant.** Operating mode: **grease the wheels —
proof of function first**, fine-tune for impact/closed sales after.
**Email auth DONE (2026-07-03):** SPF + DMARC + HubSpot DKIM were already live; Google DKIM
record existed in Cloudflare but was never activated — clicked Start authentication in Google
Admin (status: "Authenticating email with DKIM", verified via public DNS). Materials swept to
hello@ same day. **All Touch 1 launch gates cleared** except a final test-send. Audience truth:
`monti_asiago_campaign/TOUCH1_AUDIENCE_2026-07-03.md` (list 17 = whole DB, never send; real
batch = 31 send-ready cheese-shop contacts, enriched +7 via web research + HubSpot write-back).

## 🚀 ASIAGO TOUCH 1 — LAUNCHES MONDAY 2026-07-06
All infrastructure LIVE as of 7/3: active list id 19 "Asiago Touch 1 — Cheese shops" (31
contacts) · template id 283799276 · sell-sheet PDF in HubSpot Documents (tracked) · sends from
sales@montitrentini-usa.com · SPF/DKIM verified · materials + signature swept. Scheduled task
`asiago-touch1-launch-day` fires Mon 8:00 AM with the launch checklist. Remaining before first
real send: Rick's test-send to himself. Full runbook:
`monti_asiago_campaign/TOUCH1_AUDIENCE_2026-07-03.md`.

## TOMORROW'S QUEUE (2026-07-03)
1. **Agent A1 (Content Agent)** on the Director substrate — spec §4 order: stable voice-block
   keys → flow renderer port (landing/email — feeds the plaintext→landing-page outreach pattern).
2. **Rick's side:** connect sales@ inbox in HubSpot · Anthropic Console + ~$25 spend cap (unlocks
   Stage 2 AI pass — ONE API account serves all tenants, never a plan per client) · campaign
   materials sweep to the new sending address before Asiago launch.
3. **Monti sales history** (kit file 06 for Monti itself) — unblocks A3/A4 forecasting.
4. Optional quick wins: footer build-stamp (kills the stale-cache confusion) · BSE→Brand Kit
   import button (wiring board row 6).

## ✅ LIVE (2026-07-02) — one address, three doors, Content Engine portal — ALL VERIFIED
- **cheeseshoptech.com** = the platform site (Drop site DELETED). Apex = coming-soon + quiet
  footer **Sign in** (?app=1 → gate). **admin.cheeseshoptech.com** = hidden house door.
  **montitrentini.cheeseshoptech.com** = client door (pattern: every client gets a subdomain).
  Cloudflare records DNS-only → cheeseshoptech-platform.netlify.app; Netlify project renamed
  **cheeseshoptech-platform**; apex = primary domain; SSL covers all four names.
- **UI reorg:** Tools nav → **CONTENT ENGINE** (app cards: Content Studio · Content Library ·
  Brand Systems · Brand Kits · Brand Voice · Media Hub). Sidebar: Dashboard · Pricing & Inventory ·
  CRM · Campaigns · Orders · Content Engine · Storefront. Dashboard = **Priority window**
  ("Priority — response needed", mock seam `VITE_ATTENTION_BACKEND`) + Operations lead cards +
  At-a-glance (Opportunities → Active campaigns → Market news).
- **BSE integrated + GATED:** in-app route `brand-systems` (iframe-srcDoc from
  `src/assets/brand-systems-engine.html`, lazy chunk, RoleGated admin/client-admin). Old public
  URL removed + 302s to the gate. **Re-copy flow: Projects source → `src/assets/` (strip back
  button), NOT public/.** QC series room stays public (portfolio).

## ✅ BUILT (2026-07-02 latest) — Pricing & Inventory data-intake state
Rick's rule: template apps = **the duplicate encoded app, never a mock**. `PricingTool` with an
empty catalog now shows its data-connection state: template downloads (01/02/03 from
`/onboarding-kit/`) → fill (Excel/Sheets) → **share a Google Drive folder with
hello@cheeseshoptech.com** (the shared file IS the pipeline — same weekly-sync process as live
tenants; in-app upload = roadmap). Ship via **`COMMIT PRICING INTAKE.command`** (run the HUB
commit first if not yet pushed).

## ✅ BUILT (2026-07-02 late night) — Onboarding Hub on the house Command Center
cheeseshoptech.com = **the new-client onboarding hub** (Rick's call after seeing the round live).
`onboarding-hub.jsx` on the house dashboard: template app cards (from `_template.json`, each
opens `?client=demo` at that app) + "Open the template portal" + intake-kit download tiles
(`public/onboarding-kit/`). Admin + client-admin sessions see it; Agency Console stays admin-only.
Build ✓ — **ship via `COMMIT ONBOARDING HUB.command`**.

## ✅ BUILT (2026-07-02 night) — Template tenant + onboarding kit + agents SDD
New round shipped on disk (build ✓, validate ✓) — **ship via `COMMIT ONBOARDING TEMPLATE.command`**:
- **`_template.json` = THE CLONE** (full Monti app set, content-free) + **`src/data/_template/`**
  (empty-but-valid data, the onboarding target shapes) + **`demo` tenant live** (`?client=demo`
  = every app's empty state; QA reference + prospect showroom; new-client stand-up ≈ 15 min).
- **`onboarding-kit/`** — client-facing intake: 00 README · 01 Catalog & Pricing.xlsx ·
  02 Inventory.xlsx (weekly) · 03 Commitments.xlsx · 04 Brand Asset Checklist ·
  05 Marketing Worksheet.docx · 06 Sales History.xlsx (forecasting foundation).
  Internal runbook: `docs/CLIENT_ONBOARDING_GUIDE.md`.
- **Agent roster scoped** in `docs/ONBOARDING_AND_AGENTS_SDD.md` Part 3: A1 Content · A2 Pricing ·
  A3 Replenishment · A4 Projection/Production · A5 Campaign Planning. Build order gated on data:
  Stage 0 → A1 first (data ready); A3/A4 blocked on **sales history** (kit file 06) + HubSpot deals.

## ✅ BUILT (2026-07-02, this session's close) — Studio Director Stage 0+1
`lib/studio-director.js` (deterministic Auto-compose: voice→text, Media Hub→images, catalog→
products, opportunity seed via ContentStudio) + Auto-compose in SlideStudio. Wire 5 closed.
Ship via **`COMMIT STUDIO DIRECTOR.command`**. Details: BUILD_LOG top entry.

## NEXT UP
1. **Agent A1 (Content Agent) on the Director substrate** — Stage 0 is in; next steps per
   spec §4: voice blocks addressable by stable key · flow renderer port (landing/email — feeds
   the plaintext→landing-page outreach pattern) · Stage 2 AI pass (needs Rick: Anthropic
   pay-as-you-go billing + spend cap).
2. **Sending address DECIDED (2026-07-02): `Sales@montitrentini-usa.com`** — Monti's outreach
   address. Strategy: **plaintext emails + links to rich HTML interactive landing/blog pages**
   (deliverability play: no heavy HTML in the send; the platform hosts the rich piece).
   Mailbox EXISTS — Google Workspace (Gmail business), like hello@. Remaining wiring:
   (a) connect the inbox in HubSpot — **route = HubSpot Starter**: 1:1 sends + templates from
   the connected inbox (Sales Starter has NO automated sequences — manual/semi-manual is fine
   for the ~150-shop stage-1 run); (b) verify DKIM/DMARC on montitrentini-usa.com pass for
   HubSpot-routed sends (Google's own records cover Gmail sends only); (c) point the
   Priority-window `attention-list` function at this mailbox (Gmail API or HubSpot inbox —
   pick when building); (d) update signatures/materials to the new address (OpenPhone number
   still pending separately).
   **CST house address also DECIDED (2026-07-02): `hello@cheeseshoptech.com` for all things
   CheeseShop TECH** — now in the onboarding-kit README; use it for the QC mailto→Make swap and
   the landing-page "Request an invitation" CTA. Mailbox EXISTS — Google Workspace (Gmail
   business), already set up. Ready to use client-facing today; verify DKIM/DMARC on
   cheeseshoptech.com only when it starts SENDING through HubSpot/Make.
   NEW BUILD ITEM this unlocks: **campaign landing-page pattern** — plaintext send → hosted
   interactive page (Content Engine output type; lives per-tenant on the platform).
3. **`scripts/import-catalog.mjs`** — kit file 01 → catalog.json + client.config pricing
   (closes the Claude-assisted gap in CLIENT_ONBOARDING_GUIDE Step 2).
4. **BSE→Brand Kit import button** (Brand Kits page) — wiring board row 6.
5. **Copy BSE/QC back-button edits upstream** to `Projects/Monti trentini Ecommerce strategy/`.
6. Kit file 06 for **Monti itself** — pull Monti's sales history to unblock A3/A4 forecasting.

## 🔧 SHIPPED EARLIER TODAY (2026-07-02) — Content Engine reorg + dashboard priority window
UI reorg per Rick: **"Tools" nav → CONTENT ENGINE** (new `content-engine-page.jsx` — app cards for
Content Studio · Content Library · Brand Systems · Brand Kits · Brand Voice · Media Hub; old top-level
tabs removed, routes reachable via `NON_NAV_PAGES`). **Dashboard leads with operations** (Pricing &
Inventory · CRM · Trade Portal · Campaigns — new campaigns card) + a **"Priority — response needed"**
window at the top (new `lib/attention.js` seam, `VITE_ATTENTION_BACKEND`, mock). At-a-glance order:
Opportunities → Active campaigns → Market news. **Coming-soon page** gains a quiet **Log in** →
`/login` 302 → house gate — goes live only when Rick **re-drops `public/coming-soon/`** on the
"cheeseshoptech" Netlify Drop site. Build clean + `validate:clients` ✓. Ship via
**`COMMIT CONTENT ENGINE UI.command`**. Spec for next build: `docs/CONTENT_ENGINE_WIRING_SPEC.md`
(Studio Director Stages 0–3; Stage 0 = deterministic auto-fill, no AI). Still open from last night:
**gate the BSE** · sending-address decision (now also gates the live attention/mailbox feed).

## ✅ LIVE TONIGHT (2026-07-01 late) — Brand Systems Engine + Queso Couture on the brand domain
Verified working end-to-end: **cheeseshoptech.com/tools/brand-systems-engine/** (BSE v1: headless brand-kit
architecture, canonical MT kit, Brand Systems guide view) and **cheeseshoptech.com/series/queso-couture/**
(QC showcase room, correspondence capture). Routing: the custom domain is held by the separate **coming-soon
Netlify Drop site** — its new `_redirects` proxies `/series/*` + `/tools/*` to `cheeseshoptech-platform`.
Iterate = edit source in `Projects/Monti trentini Ecommerce strategy/`, re-copy to `public/…` here, commit-
script, push; coming-soon changes = re-drop `public/coming-soon/` on the "cheeseshoptech" Netlify project.
Full detail: BUILD_LOG 2026-07-01 (cont. 3). **Immediate next:** gate the engine (ungated, full MT kit
inside) · sending-address decision (gates HubSpot auth + QC mailto→Make swap) · first QC Pinterest dispatch.

## ✅ DEPLOY UNBLOCKED — root cause found & fixed (2026-07-01, evening)
The recurring push failure was **missing GitHub HTTPS credentials**: Terminal was silently prompting
`Username for 'https://github.com':` in a window that closed before anyone read it (first retry then failed
visibly with "Invalid username or token" — an account password was entered where GitHub requires a token).
Fixed with a classic PAT (repo scope, no expiration, note "MacBook push — CheeseShop TECH deploys"), created
at github.com/settings/tokens while signed in as `Cheeseshop-tech`, now stored in macOS keychain — future
pushes just work. Second finding: the stranded `.git/index.lock` is created by the **Cowork sandbox itself**
(mount lets it create files under `.git/` but not delete them — even a plain `git status` strands a lock).
Rules going forward: sandbox git = read-only with `GIT_OPTIONAL_LOCKS=0`, never sandbox `git add/commit`;
**`FIX GIT LOCK AND PUSH.command`** (repo root) clears any lock + pushes on double-click.
`7f94011` + `1742a94` confirmed on origin; Netlify deploy triggered. To ship the new Slice 3 work below:
double-click **`COMMIT MARKET NEWS.command`**.

**Now unblocked on the Netlify side (verify next session):** `VITE_CRM_BACKEND=hubspot` was added as a site env var with **Builds**
scope (confirmed correct — Post processing, the first attempt, would NOT work for a Vite build-time var) —
but it can't take effect until the push above lands and triggers a new deploy. Once deployed, re-test
`https://montitrentini.cheeseshoptech.com/.netlify/functions/crm-hubspot` (should return JSON with real
company data, not the SPA HTML shell) and check the Opportunities lane for real Monti accounts.

### Earlier still-open item (2026-06-16, may be resolved — verify before redoing)
The CheeseShop TECH **landing page v1** + apex wiring were written and build-verified as of 2026-06-16 but
were also stuck unpushed at the time for the same `.git/index.lock` reason. Confirm whether this landed before
assuming it's still open. The resume `Richard_Posada_Resume.docx` is intentionally **left untracked**
(personal doc, not for the repo).

## NEXT UP (tomorrow, 2026-06-17)
**Platform / framework build continues — Track A never waits on client approval ([[cst-build-strategy]]).**
1. **Landing page → go-live.** `src/components/marketing/landing-page.jsx` v1 is built and wired at the apex
   (replaces ComingSoon). To launch: (a) wire the **"Request an invitation" CTA** — currently a
   `hello@cheeseshoptech.com` mailto placeholder — to a real inbox/form; (b) confirm the **apex DNS** serves
   the Netlify site; (c) eyeball it live. Source of truth = `docs/CST_POSITIONING_BRIEF.md`.
2. **Clean house URL (optional):** `admin.cheeseshoptech.com` — 1-line guard change (reserve the subdomain to
   skip the coming-soon/landing) + a Cloudflare DNS record + a Netlify domain alias. Today's house door = `?app=1`.
3. **Content-orchestration v1 = DONE** (categories · gated publishing OFF by default · download · quota; PPTX out).
   Optional later, its own careful pass: CST-gated Cloudinary uploads.
4. **Other framework items:** onboarding/clone path (new-client-in-X-steps, ties the brand-kit + campaign-log
   templates); "By CheeseShop TECH" tool watermark (build item); House Console (`agency-console.jsx`) deepening;
   "cora" Adobe font wiring. AI tool embed stays **parked** (`docs/AI_TOOL_EMBED_SPEC.md`).

**Client track (Monti) — GATED, do NOT send until Thursday.** Campaign fully staged. **Stefano meeting Thu
2026-06-18** (agenda `monti_asiago_campaign/Stefano_Meeting_Agenda_2026-06-18.md`; 7:30am reminder set) delivers
**approval + wholesale pricing + SEAFRIGO freight** → then finalize numbers on the materials and launch the
3-touch sequence to the ~150 shops. OpenPhone line pending (give Claude the number to finalize signatures).

## EARLIER NEXT-UP (teed up 2026-06-13, still valid)
**The big picture = the House Console** (`docs/HOUSE_CONSOLE_SPEC.md`): one agency control plane to
onboard clients, push data into their apps, monitor all, and flip between clients + tools with no
re-login. DECIDED: ONE app (console = same components in house theme + a client selector, NOT a
generic twin); SKU → **Item number**; item data IMPORTED from price-list spreadsheets; brand-first
onboarding. Build order (each independently shippable):
1. **Console shell** — client selector + unified tool side-nav (flip clients/tools, no re-login). Mostly wiring existing pieces (tenant switcher + Brand Mgmt per-client dropdown generalized). START HERE.
2. **Items importer** — spreadsheet → tenant item data (Item numbers).
3. **Bulk image upload + tagging** — folds in `docs/BULK_TAG_TOOL_SPEC.md` (multi-select, ADD-semantics, client loop over `media-update`) to backfill the 104 untagged images.
4. **Onboarding checklist** — ties 1–3 into a repeatable flow.
5. Campaigns deepen with HubSpot later. Also pending: client-admin **Product admin** (Catalog → read-only view, per DATA_OWNERSHIP_MAP).

## Latest session — media platform (2026-06-13, Cowork)
- **Asset platform COMPLETE end-to-end.** Cloudinary uploads live (unsigned preset `st_unsigned` in netlify.toml); Media Hub off mock onto the LIVE Cloudinary backend (`media-list` GET function, server-side secrets in Netlify: CLOUDINARY_CLOUD_NAME=sofcvmwa/API_KEY/API_SECRET + VITE_MEDIA_BACKEND=cloudinary). Upload Asset-details dialog (name + usage); Recent tab (localStorage); tabs mirror usage tags rendered as a LEFT NAV RAIL with counts; asset EDITING via `media-update` POST function (rename/re-tag/SKU link/alt/approval). **12-tag usage taxonomy** (lives in 3 files: media.js USAGE + both functions' USAGE_IDS — keep identical): Product Catalog, Hero, Story block, Lifestyle, Food styling, Social, Press/PR, Event, Brand asset, Email/Campaign, Print/Sell-sheet, Web/Marketing. Ownership model: `docs/DATA_OWNERSHIP_MAP.md` (Product=client-admin, Brand=house-only, Asset=Media Hub; join key = SKU). 104 existing images still untagged → bulk-tag tool (above) is the fix.

## Earlier session (2026-06-13, Cowork)
- **Five-theme design session DONE (Theme Engine complete).** Took `lib/themes.js` from 2 → 5 registers, each mapped to a channel + flagship: **Heritage Editorial** (provenance), **Fresh Market** (retail/grocery), **Chef's Table** (foodservice — dark Mountain-Ink, image-led serif), **Trade Brief** (distributors — compact sans, dense range table), **Alpine Gallery** (chains/flagship — Heritage Cream, oversized serif, gallery grid). All registers of the one brand kit. Token vocab expanded (lead +ink/cream, density, typeRegister +grand, cover +minimal, product +grid-three-up/list-compact); `themeColors()` adds a legible `onCanvas` for light-led themes; new `themeSpec()` maps density+type → classes. `proposal-view.jsx` now actually EXPRESSES density + type (was ignoring them) and renders the new cover/product layouts. Build verified clean. **ACTION: double-click `COMMIT THEME SESSION.command`, then `DEPLOY TO STAGING.command`** (sandbox couldn't finalize the commit — leftover `.git/index.lock`).
- **Still open (proposal engine):** real brand imagery upload to fill the placement zones (currently composed color blocks); Puppeteer PDF if pixel-perfect export is needed. The 5-theme session is now CLOSED.
- **Brand Kit + Theme Engine + Proposal v2 shipped** (the agency crown jewel; spec `BRAND_KIT_AND_PROPOSAL_SPEC.md`). Single-source per-tenant `brand-kit.json` (identity/imagery/voice/story blocks; Monti parsed from the brand guide). House-admin **Brand Management** page ("Brand kits" nav) with an editable worksheet (text, color pickers, lists, story blocks, image upload) + `_brand-kit-template.json` for onboarding. Portal theming now reads colors from the kit. **Theme Engine** (`lib/themes.js`) + **Proposal v2** (audience + story-block + theme selection, themed render with composed image zones). CST owns brand orchestration = the monthly-fee value. Commits f71766f/ffbc4a1/cfc8a6c/2b43b9a/9cc3fe9.
- **Build gotcha (recorded):** never `git commit -a` when adding NEW files — it skips untracked files and breaks the Netlify build (themes.js incident). Use `git add -A`.
- **Open for the proposal engine:** full 5-theme design session (Q1/Q2 answered); real brand imagery upload to fill the placement zones; Puppeteer PDF (vs browser print) if pixel-perfect output is needed.
- **Pricing tool UX pass** (commits `d5f52b9`/`40af9c0`/`d05b8bb`): bill-to summary → full-width sticky top bar (product table now full width/length); clickable product thumbnail → `ProductDetailDialog` (image + description + live price + specs + lots, for customer convos); dedicated spread-out "Inventory & lots" column; thumbnails 44→64px; search moved to a full-width bar above the list. Blank thumbs on non-manifest codes (e.g. 02302) clear once `npm run sync:images` runs with Cloudinary creds.
- **F5 SHIPPED — one canonical image source** (commit `4b729af`). Every surface reads ONE manifest `src/data/<tenant>/images.json` via `lib/images.js`, rendered by the single `cldImage` builder. `buyer-catalog.json` deleted (Catalog is now a view); Proposals/Pricing use `codeImageUrl` (manifest-first, legacy `monti/<code>` packshot fallback for the 44 SKUs not yet in the manifest). `scripts/sync-images.mjs` regenerates from Cloudinary; `npm run media:refresh` = sync+prewarm. Verified live. Optional: run `npm run sync:images` with `CLOUDINARY_*` creds to fold in the packshot folder + move masters to R2.
- **Image delivery unified ("one mind, one body").** Every image URL in the app now routes through ONE builder `cldImage()` in `src/lib/cloudinary.js` (named presets = single source of truth for size/crop/format). Catalog (`lib/catalog.js`), Media hub, Proposals (`lib/proposals.js`), Pricing tool all delegate; no raw `res.cloudinary.com` URLs left in render code. Commit `0de4d3a`.
- **Slow-image root cause fixed + deployed.** Thumbnails used `g_auto` (content-aware crop) → forced a full ~45 MP decode per image; grids mounted the whole 100+ image folder at once. Fix: pad-on-white (no g_auto), 360px thumbs, paginate 30/page, `npm run prewarm`. Live-verified (cold multi-sec → ~0.7s median). Commits `7e7f719`, `0d83cbe`, `2cbbd01`.
- **Phase F5 spec'd, not built:** `docs/IMAGE_PIPELINE_SPEC.md` — the render layer is unified but the SOURCE isn't (3 mismatched files describe the same images). Next: one sync job → one `images.json` manifest per tenant → every surface reads it. Best as its own session.

## Latest session (2026-06-12, Cowork)
- **LAUNCH WIRING DONE (evening):** `https://montitrentini.cheeseshoptech.com` LIVE (Cloudflare CNAME, DNS-only → platform site; the proxied wildcard `*.cheeseshoptech.com` still serves the coming-soon site — specific records override per tenant). **All three passcodes set** at Netlify TEAM level (`PORTAL_PASSCODE` reset — old one forgotten/retired — + new `PORTAL_ADMIN_PASSCODE`, `PORTAL_HOUSE_PASSCODE`, saved un-secret so values stay viewable) and deployed. R2 bucket `cheeseshoptech-media-archive` created (folder `monti-trentini/`) — photography masters go there first. Gate verified on prod (401 on bad codes). Note: a browser that unlocked once stays unlocked (localStorage) — that's persistence, not a security hole; new visitors always get the gate.
- **Concept locked + spec'd:** `docs/ADMIN_DASHBOARDS_SPEC.md` — platform concept, roles matrix, both admin dashboards, proposal engine (both tiers), media storage strategy (Cloudinary delivery / R2-B2 archive / Stream-Vimeo video). Plan Phase F added.
- **F1 SHIPPED — three-tier passcode roles.** `gate.js` now returns a role: `PORTAL_PASSCODE`→client, `PORTAL_ADMIN_PASSCODE[_<TENANT>]`→client-admin, `PORTAL_HOUSE_PASSCODE`→admin (backward compatible while unset). `client-admin` implies `client` (rolesOf). Storefront back-office toggle is Manage-gated. DEV codes: `monti` / `monti-admin` / `house`. **Rick: set the two new passcodes in Netlify env before relying on tiers in prod.**
- **F4 SHIPPED — proposal engine v1 (both tiers).** `src/components/proposals/` (builder + view) + `lib/proposals.js`. Builder (Manage tier, nav "Proposals"): buyer/headline/intro + story deck (reuses DeckViewer) + SKU picker from canonical catalog + class-of-trade select; drafts autosave per tenant. Share = the proposal encoded base64url in the URL hash (`?page=proposal#p=…`), passcode-gated, readable by any portal role; **prices quote live via pricing-core at render** so links never go stale. Print/PDF via browser. Verified: built an H-E-B test proposal, opened its link as plain client. Revocable per-proposal keys = v2 (backend seam).
- **F3 SHIPPED — catalog editing (client content manager v1).** Lightbox Edit-details panel (item code / title / description) for client-admin and admin; edits overlay the bundled data per tenant (`src/lib/catalog-edits.js`, localStorage `cs-catalog-edits-<id>` + Export/Import JSON — same model as the standalone app; export hands off to the price-list workflow). Client users see no edit UI. Verified in browser incl. persistence.
- **F2 SHIPPED — Agency console** (`src/components/home/agency-console.jsx`, house hub, admin-only): Tenants panel (per-tenant cards + config-only onboarding), Integration health (seam modes from VITE_* flags + gate test ping), Data pipelines (products/SKUs/commitments/images/decks + inventory staleness >14d). All three tiers + panels verified in the browser.
- **MT ownership approved.** Stefano presented the platform to Monti Trentini ownership — positive, move-forward response. Phase C green-lit and shipped same day.
- **Phase C shipped: Trade Portal → generic Presentations tool.** `src/components/presentations/presentations-page.jsx` — config-driven decks (`presentations` block, schema extended), responsive viewer (touch swipe + arrow keys + fullscreen + thumbnail rail + neighbour preload), nav tab appears only for tenants with decks. Slides extracted from the deployed web deck and re-encoded WebP 1600px (7.2 MB PNG → 0.8 MB) → `public/presentations/montitrentini/`. Monti's trade-portal tool flipped external → internal route `presentations`. Deep links: `?page=<key>` now seeds the initial page (e.g. `?client=montitrentini&page=presentations` for buyers). The two standalone trade-portal Netlify sites are now redundant once this deploys.
- **`docs/DEVELOPMENT_PLAN.md` added** — the rewritten roadmap: the three standalone Monti apps (trade portal web+mobile, image catalog, mt-e-comm shop) become reusable platform tools (Phases A–E). Local sources live under `~/Documents/Claude/Projects/`.
- **Phase B shipped: buyer-facing Image Catalog ported into the platform.** New `src/components/catalog/buyer-catalog.jsx` (search, category chips, grid/list, lightbox, view/download/copy-share via Cloudinary) + `src/lib/catalog.js` data seam (pricing.js pattern, `VITE_CATALOG_BACKEND=mock`) + `src/data/montitrentini/buyer-catalog.json` (103 images, extracted from `catalog-deploy-2`). The Catalog nav page now renders this; the old component-showcase demo was removed from `App.jsx` (copy in `archive/backup_2026-06-12_before_catalog_port/`).
- **Phase A1 shipped:** Monti tools now include **Trade Portal** (external link) and **Image Catalog** (internal route `catalog`); Media-hub tile relabeled "Media hub". `presentation` icon added to `lib/icons.js`.
- **Verified:** `npm run validate:clients` ✓, `npm run build` ✓, plus a full visual review in the browser (Rick approved). Committed as `82477bc` and pushed → staging auto-deployed.
- **Easy buttons added** (repo root, double-click in Finder): `REVIEW PORTAL.command` (local preview, passcode `monti`) and `DEPLOY TO STAGING.command` (push → Netlify). Don't paste their contents into Terminal — just double-click the files.
- Git remote updated to the repo's new GitHub location (`Cheeseshop-tech/...`).

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
