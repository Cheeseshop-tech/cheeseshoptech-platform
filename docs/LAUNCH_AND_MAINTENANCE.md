# CheeseShop TECH — Launch & Maintenance Checklist

**Purpose.** One running list of every deferred *operational* action — the account/dashboard/deploy
work that can't be done in code. We build design + features now; we work this list once the build is
solid. **Last updated:** 2026-06-05.

> Convention: `[ ]` open · `[x]` done (date it). Code/feature work lives in `BUILD_LOG.md`, not here.
> Most items are **[Rick]** actions (account access / secrets / dashboards).

---

## A. Launch — do once, in order, when ready to go live

### 1. Source control
- [x] **Pushed** to branch `phase-2-6-build`; PR #1 open against `main` (2026-06-05).

### 1b. Connect CI — IMPORTANT correction (2026-06-05)
**Reality check:** the live `cheeseshoptech.com` Netlify site is a **Netlify Drop (manual) deploy — NOT
git-connected.** So pushes/PRs build nothing and produce no deploy preview (PR #1 shows 0 checks).
The docs' "commit + push → Netlify auto-deploys" describes the *intended* setup, which isn't wired yet.
- [x] **Resolved (2026-06-05):** stood up a NEW git-connected Netlify site **`cheeseshoptech-platform`** → **https://cheeseshoptech-platform.netlify.app**. Deploys from the repo, production branch = `phase-2-6-build`, build `npm run build` → `dist`, functions dir `netlify/functions`. First build published in 20s; the app serves live (verified: Monti login screen renders). `cheeseshoptech.com` (the Drop coming-soon) is untouched.
  - This is now the **staging/preview site**. At launch, point the `cheeseshoptech.com` domain (+ `*` wildcard) at this site and set production branch to `main` (after merging).
- [ ] Note: stray Netlify projects exist (`monti-trentini-catalog`, `mt-e-comm`, `super-platypus-…`) — review/clean up to avoid confusion.
- [ ] Minor: `montitrentini.json` `brand.logo` is a placeholder Cloudinary URL (`<cloud>`) → shows a broken image on the login. Set a real logo URL or clear the field (clears → falls back to the house wordmark).

### 2. Deploy decision — RESOLVED in code ✅
- [x] **Apex coming-soon route built (2026-06-05).** The app now serves the public coming-soon page at the apex and the portal only at `<client>.cheeseshoptech.com`. **Deploying to `main` no longer replaces the public page** — so a production deploy is safe whenever you want it. (Staff reach the house portal at the apex with `?app=1`.)

### 3. Auth — Netlify Identity (code is built; see AUTH_AND_ROLES.md)
- [ ] **[Rick]** Enable Identity on the **`cheeseshoptech-platform`** site (Site config → Identity → Enable) — this is the site running the app. Registration = **Invite only**. (Until enabled, the live login screen renders but can't authenticate.)
- [ ] **[Rick]** Enforce strong passwords; enable 2FA where available.
- [ ] **[Rick]** Invite a test user; after they accept, set `app_metadata`: `roles` + `tenant` (e.g. `["client"]`, `"montitrentini"`). Set yourself `["admin"]`.
- [ ] **[Rick]** Verify over HTTPS: test user logs in, sees only their tenant; admin can switch tenants; bad-tenant user is denied.

### 4. Media — Cloudinary — CODE DONE; needs config to flip on (see MEDIA_HUB.md)
- [x] **[Claude]** `media-list` function (paginated, Admin API, approvalState from tags) + real browser upload (unsigned preset, no secret) wired into the Media Hub.
- [ ] **[Rick]** Create folders `clients/montitrentini/{products,brand,raw}` + upload a few images.
- [ ] **[Rick]** Create an **unsigned upload preset**; note its name.
- [ ] **[Rick]** Netlify env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server) + `VITE_CLOUDINARY_CLOUD`, `VITE_CLOUDINARY_UPLOAD_PRESET`, `VITE_MEDIA_BACKEND=cloudinary` (build). Redeploy.
- [ ] Verify: real Monti media lists; upload works (tagged draft); transforms applied at delivery.

### 5. Domain / SSL hardening (carry-over from Phase 1)
- [ ] **[Rick]** Confirm Cloudflare SSL/TLS = **Full (strict)**; optionally upload the Origin Certificate (OM §2.1).
- [ ] **[Rick]** Registrar **auto-renew ON** for `cheeseshoptech.com`.

### 6. CRM (Phase 6 — dashboard built; backend wiring)
- [x] **[Claude]** `crm` Netlify function built (`netlify/functions/crm.js`, proxies the Make webhook). To activate: set `MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make`.
- [ ] **[Rick]** Build the Make scenario: client CRM (HubSpot/etc.) → dashboard data shape (OM §7 / docs/CRM_CONNECTOR.md); expose as a webhook → set `MAKE_WEBHOOK_URL` in Netlify env.
- [ ] **[Rick]** CRM tokens in Netlify env. Wire HubSpot (agency) + Monti's CRM for the pilot.

### 6b. Tools module — connect Monti's existing tools
- [x] **Shopify storefront URL** set → `https://mt-e-comm.netlify.app/ui_kits/shopify-store/` (live tile).
- [ ] **[Rick]** Host the **Price list calculator** (Custom Price List Creator) somewhere with a URL, then set its `url` + flip `status` to `live`. (Currently `coming-soon` since it's local.)
- [x] Image catalog → already wired to the native Media Hub (internal route).

### 7. Pilot go-live (Phase 7)
- [ ] Run the Client Onboarding Playbook (OM §8) for `montitrentini.cheeseshoptech.com`; UAT sign-off.

---

## B. Recurring maintenance

- [ ] **Quarterly:** review each client's Identity user list — least privilege (OM §10).
- [ ] **Quarterly:** design-system prune — consolidate one-offs (DESIGN_SYSTEM.md Part E).
- [ ] **Quarterly:** recovery drill — restore a previous Netlify deploy to a preview, verify a client renders (OM §9).
- [ ] **Ongoing:** rotate secrets in Netlify env as needed; never commit them.
- [ ] **Per release:** one change = one commit; material decisions get a `BUILD_LOG.md` entry.
- [ ] **Per new client:** copy `config/clients/_template.json`, run `npm run validate:clients`, add Cloudinary folders.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
