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
