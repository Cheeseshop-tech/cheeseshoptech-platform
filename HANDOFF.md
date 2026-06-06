# HANDOFF — CheeseShop TECH platform build

**Last updated:** 2026-06-05 (eve) · **Last chat:** Phases 2–6 built + pushed; git-connected staging site live

## Live now

- **Staging site:** https://cheeseshoptech-platform.netlify.app — new git-connected Netlify site, auto-deploys from branch `phase-2-6-build`. App serves (Monti login renders). `cheeseshoptech.com` (Drop coming-soon) untouched.
- **Code:** pushed to branch `phase-2-6-build`; PR #1 open vs `main` (not merged).

## Resume in the AM — next step: enable Netlify Identity

On the **`cheeseshoptech-platform`** site: Site config → Identity → Enable (Invite-only) → invite yourself (`admin`) + a Monti test user (`roles:["client"]`, `tenant:"montitrentini"`). Steps in `docs/AUTH_AND_ROLES.md`; full runbook in `docs/LAUNCH_AND_MAINTENANCE.md`. Then Cloudinary (Step 4) + Make (Step 5). Quick win available too: fix the `montitrentini.json` placeholder logo.

## Where we are

- **Phase 0 — COMPLETE.** Repo `cheeseshoptech-platform` live & private at github.com/cheeseshop-tech. Accounts set up (Cloudflare, Netlify, GitHub, Cloudinary, Make, HubSpot). Netlify tier = PRO.
- **Phase 1 — COMPLETE.** `https://cheeseshoptech.com` live over HTTPS (coming-soon page). Option C: 3 proxied CNAMEs in Cloudflare (`@`, `www`, `*`) → `cheeseshoptech.netlify.app`. Wildcard routing verified.
- **Phase 2 — COMPLETE.** Design system locked in `docs/DESIGN_SYSTEM.md` (warm artisanal house brand; overridable vs locked tokens; config schema; AA contrast guardrail; two-surface branding model in B0). Vite + React + Tailwind shell with token/theming system + `clientConfig` tenant resolver. **Full B4 component catalogue shipped** (shadcn pattern, Radix-backed, all token-themed + AA-accessible): button, card, input/textarea, label, select, checkbox, radio, switch, badge, table, tabs, dialog, toast, breadcrumb, empty-state, skeleton, AppShell. `App.jsx` is a working portal demo with a live tenant switcher.
- **Phase 3 — BUILT (needs Netlify enablement to sign off).** Custom house-branded auth on **Netlify Identity** (verified not deprecated — reversed 2026-02-19) via `gotrue-js`. Portal sits behind `RequireAuth` with tenant scoping (no cross-tenant visibility) + role gating (`admin|client|pr|influencer|creator`, stored in `app_metadata`). Topbar user menu + logout; admin-only tenant switcher. Full model + setup steps in `docs/AUTH_AND_ROLES.md`.
- **Phase 5 — BUILT (real Cloudinary sync deferred to launch).** Media hub: Cloudinary delivery layer with named transforms (thumb/card/hero, applied at delivery per OM §6), `listAssets()` data seam (mock food-sample backend now; Netlify-function Cloudinary Admin API later), folder tabs + gallery + asset dialog (copy delivery URL, approval control), env-gated upload. Approval states (`draft → approved-for-press → approved-for-influencers`) + role visibility per `POSITIONING.md`. Details in `docs/MEDIA_HUB.md`. (Walkthrough Phase 4 — shell + tenant resolution — was already done in our Phase 2.)
- **Phase 6 — BUILT (Make wiring deferred to launch).** CRM connector: `getCrmData()` seam (mock now; Netlify-function → Make webhook later), **Dashboard** (pipeline value/open orders/overdue invoices/contacts, pipeline-by-stage, activity, invoices) + **Orders** pages, data shape per OM §7. CRM is admin/client-only; added **role-based nav** (pr/influencer/creator see only Media hub). Details in `docs/CRM_CONNECTOR.md`.
- **Apex coming-soon route — BUILT.** Public coming-soon serves at the apex; the portal only at `<client>.cheeseshoptech.com`. **Deploying to `main` no longer replaces the public page**, so a production deploy is safe whenever wanted. Staff: apex `?app=1`; tenant preview: `?client=<sub>`. `npm run build` clean (1,614 modules). **Monti Trentini = tenant #1 / first test account.**

## Open / not blocking

**All deferred operational/launch work is now consolidated in `docs/LAUNCH_AND_MAINTENANCE.md`** — the single list to work through once design + build is solid (push, deploy decision, enable Identity + test user, Cloudinary folders/keys/preset, SSL hardening, registrar auto-renew, recurring reviews). Per Rick: hold all of it until we're in a more solid place.

- [ ] **Nothing pushed/deployed yet.** Build is green; everything is local.
- [ ] **Stale local `dist/` + `vite.config.js.timestamp-*.mjs`** are host-locked (can't delete from here) but are gitignored, so they won't be committed. Delete in Finder anytime; cosmetic.

## Next: Phase 7 — Pilot deploy (Monti Trentini)

Walkthrough Phases 2–6 are now built in code (design system, auth, shell/tenant resolution, media, CRM). What remains is **operational, not code**: work `docs/LAUNCH_AND_MAINTENANCE.md` to wire the real backends (Identity, Cloudinary, Make) and ship `montitrentini.cheeseshoptech.com` for UAT (OM §8). Optional code polish before pilot: the apex coming-soon route, and the three Netlify functions (media-list, crm) when their accounts are ready.

## How to run it (dev)

From this folder: `npm install` then `npm run dev`. Preview a tenant locally with `?client=montitrentini` (the header has a live tenant switcher). `npm run build` for production; `npm run validate:clients` to lint client configs against the schema + contrast bar.

## Lessons logged (don't repeat)

- Netlify "Activate Netlify DNS" nameserver screen (`dns#.p08.nsone.net`) is Option B — IGNORE. DNS lives in Cloudflare only.
- CNAME target is the `*.netlify.app` site address, never a nameserver.
- Deploy the Netlify site BEFORE wiring DNS.
- Differentiation is **tokens + content only** — never fork code or add per-client screens (DESIGN_SYSTEM.md Part E).

## First message for the next chat

> Read `HANDOFF.md` + `docs/BUILD_LOG.md` + `docs/LAUNCH_AND_MAINTENANCE.md`. Code for Phases 2–6 is built; next is launch (work the launch list) toward the Monti pilot — or optional pre-pilot code polish (apex coming-soon route, Netlify functions).
