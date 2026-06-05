# CheeseShop TECH — Setup & Deployment Walkthrough

**Owner:** Rick Posada · **Version:** 1.0 · **Last updated:** 2026-06-05

The single execution runbook: the exact order to stand up the platform and ship the
Monti Trentini pilot. The **Cowork Brief** sets scope and the **Operations Manual** holds the
technical detail — this file is the **sequence that ties them together**. Work top to bottom.
Do not start a phase until the prior phase's *Definition of Done* is checked.

> **Canonical fact (from the Build Log):** the platform core **is** CheeseShop TECH (owned IP).
> Monti Trentini is **tenant #1**, not the platform. Every step below must also work for client #2.

---

## How to use this file

- Each phase has: **Goal · Prerequisites · Steps · Definition of Done (DoD) · Log it.**
- A phase is finished only when every DoD box is ticked. Half-done is not done.
- **"Log it"** = append a one-line entry to `docs/BUILD_LOG.md` (newest on top) when the DoD passes.
- Deep technical detail is **referenced, not repeated** — links point to `OPERATIONS_MANUAL.md` (OM) sections.
- Anything requiring a credential, a card, or a domain change is flagged **[Rick action]** — Claude cannot and should not do these; they need Rick at the keyboard.

### Phase map

| # | Phase | Outcome | Gate before next |
|---|---|---|---|
| 0 | Foundations & accounts | All accounts exist, repo scaffolded | Accounts confirmed, repo pushes |
| 1 | Domain & hosting (Option C) | `cheeseshoptech.com` claimed + wildcard live | URL resolves over HTTPS |
| 2 | Design system & white-label shell | Token system + house brand locked | Skin renders from config |
| 3 | Auth (Netlify Identity) | Per-client login works | Test user can log in |
| 4 | React shell | Unified dashboard with navigation | Tenant resolves from subdomain |
| 5 | Cloudinary media | Automated per-client media sync | Media loads from client folder |
| 6 | CRM connector v1 (Make) | HubSpot + MT CRM data in dashboard | Live data visible |
| 7 | Pilot deploy | `montitrentini.cheeseshoptech.com` live | UAT signed off |
| 8 | CRM v2 (scale) | Merge.dev/Unified.to migration | Deferred until pilot validated |

---

## Phase 0 — Foundations & accounts

**Goal.** Every external account exists and the repo skeleton is in version control before any
feature work starts. This phase prevents the most common solo-build stall: discovering a missing
account mid-build.

**Prerequisites.** None. This is the floor.

**Steps.**

1. **[Rick action]** Confirm/create accounts, each with 2FA on and credentials in a password manager (never in docs or chat — OM §10):
   - Cloudflare (registrar + DNS — already holds `cheeseshoptech.com`)
   - Netlify (host)
   - GitHub (single repo)
   - Cloudinary (media)
   - Make.com (CRM middleware v1)
   - HubSpot (agency CRM — already live as of 2026-06-02)
2. **[Rick action]** Decide the Netlify plan tier now — it affects automatic wildcard preview subdomains (OM §5, and Build Log open item).
3. Confirm the repo scaffold (this folder): `docs/`, `config/clients/`, `public/coming-soon/`, `src/`.
4. **[Rick action]** Create an empty **private** GitHub repo named `cheeseshoptech-platform` (platform = CheeseShop TECH, never named after a client — Build Log canonical fact).
5. **[Rick action]** Push this scaffold to it: `git remote add origin <url> && git push -u origin main`.
6. Verify `.gitignore` excludes `.env` and `node_modules/` **before** the first push so no secret ever enters history (OM §10).

**Definition of Done.**

- [ ] All six accounts exist, 2FA on, credentials in the password manager.
- [ ] Netlify plan tier chosen and recorded.
- [ ] `cheeseshoptech-platform` private repo exists and this scaffold is pushed to `main`.
- [ ] `.env` and `node_modules/` are gitignored and absent from history.

**Log it.** "Phase 0 complete — accounts confirmed, repo pushed, plan tier = ___."

---

## Phase 1 — Domain & hosting (Option C)

**Goal.** Claim the URL and stand up the proxied wildcard so every future client subdomain needs
**zero** DNS work. This is the architectural keystone — get it right once.

**Prerequisites.** Phase 0 done. Cloudflare and Netlify accounts ready.

**Steps.** Follow **OM §2.1** exactly — summarized here as the sequence, full detail in the manual:

1. Deploy the `public/coming-soon/` page to Netlify first; note the `*.netlify.app` address.
2. **[Rick action]** Netlify → Domain management: add `cheeseshoptech.com`, `www`, and `*.cheeseshoptech.com`.
3. **[Rick action]** Cloudflare → DNS: add `CNAME @`, `CNAME www`, `CNAME *` → the Netlify address, **proxy ON** (orange cloud).
4. **[Rick action]** Cloudflare → SSL/TLS → Origin Server → create an Origin Certificate for `cheeseshoptech.com` **and** `*.cheeseshoptech.com`; upload cert + key to Netlify (custom certificate). This avoids the ACME-behind-proxy renewal failure.
5. **[Rick action]** Cloudflare → SSL/TLS → **Full (strict)**. Never "Flexible" (redirect loops — OM §2.3).

**Watch-outs (OM §2.3).**

- Free Universal SSL wildcard is **one level deep** → keep subdomains flat (`client.cheeseshoptech.com`, never `x.client.cheeseshoptech.com`).
- **[Rick action]** Keep Cloudflare registrar auto-renew ON — a lapse takes the whole platform down (OM §10).

**Definition of Done.**

- [ ] `cheeseshoptech.com` and `www` load the coming-soon page over HTTPS.
- [ ] A test subdomain (e.g. `test.cheeseshoptech.com`) resolves over HTTPS with no cert warning.
- [ ] SSL/TLS mode is Full (strict); proxy is ON.

**Log it.** "Phase 1 complete — Option C live, URL claimed, wildcard resolves over HTTPS."

---

## Phase 2 — Design system & white-label shell

**Goal.** Lock the token system so one shared shell becomes any client's brand via config alone —
**no forked code per client.** This is the scalability engine (Design Guide Part B).

**Prerequisites.** Phase 1 done (you have a live surface to style).

**Steps.** Follow the Design Guide kickoff order:

1. Lock **Part A** (house brand): logo lockups, color palette, typography, spacing. Small and fast — unblocks everything visual.
2. Lock **B1 + B2**: the full house token set, the **overridable subset** (recommended minimum: `color.brand.primary`, `color.brand.accent`, `logo`, `font.heading`, `font.body`, `radius`), and the client config JSON schema + validation rules.
3. Rule: a missing client value **falls back to the house default** — never breaks (Design Guide B2).
4. Draft **B4** component catalogue (nav, cards, tables, forms, modals, empty states) against the dashboard wireframe. Recommended base: shadcn/ui + Tailwind.
5. Set the **Part D** QA bar (WCAG 2.1 AA floor) and wire it into the Phase 7 UAT checklist.

**Definition of Done.**

- [ ] House brand (Part A) decisions recorded in the Design Guide (no remaining `>>> DECIDE:` in Part A).
- [ ] Token set + overridable list + config schema locked (Design Guide B1/B2).
- [ ] Theming mechanic chosen (CSS variables + Tailwind theme, or CSS-in-JS) with WCAG AA contrast guardrail.
- [ ] Component catalogue drafted with states + a11y notes.

**Log it.** "Phase 2 complete — house brand + token system locked, overridable set = ___."

---

## Phase 3 — Auth (Netlify Identity)

**Goal.** Secure per-client portal login. Confirmed safe — Netlify reversed the Identity
deprecation on Feb 19, 2026 (Build Log finding).

**Prerequisites.** Phase 1 done (site deployed on Netlify).

**Steps.**

1. **[Rick action]** Enable Netlify Identity on the site.
2. Wire the login screen into the React shell (uses the house brand from Phase 2).
3. Enforce strong passwords; plan to review per-client user lists quarterly (OM §10).
4. **[Rick action]** Invite a test user; confirm least-privilege scoping (a user sees only their tenant — OM §10).

**Definition of Done.**

- [ ] A test user can log in and out over HTTPS.
- [ ] Login screen renders in house brand.
- [ ] Access is tenant-scoped (no cross-tenant visibility).

**Log it.** "Phase 3 complete — Netlify Identity live, test login verified."

---

## Phase 4 — React shell (unified dashboard)

**Goal.** One codebase that reads the subdomain, loads the matching client config, and skins
itself. All tools in one place.

**Prerequisites.** Phases 2 + 3 done (tokens + auth exist to render against).

**Steps.**

1. Build the shared React shell with navigation for the planned modules.
2. Implement **tenant resolution**: read the subdomain (`montitrentini` from `montitrentini.cheeseshoptech.com`), load `config/clients/<client>.json`, inject brand tokens (OM §1).
3. Keep **zero client-specific logic in `src/`** — everything client-specific lives in the JSON config (OM §3).
4. Add `netlify.toml` SPA redirect (all paths → `index.html`) so React Router works (OM §5).
5. Verify with the `montitrentini.json` and `_template.json` configs already in `config/clients/`.

**Definition of Done.**

- [ ] Visiting a client subdomain loads that client's brand skin from its JSON config.
- [ ] An unknown/missing config value falls back to the house default (no crash).
- [ ] No client-specific code exists in `src/` (config-only differentiation).
- [ ] SPA routing works on deep links (no 404 on refresh).

**Log it.** "Phase 4 complete — shell resolves tenant from subdomain, skins from config."

---

## Phase 5 — Cloudinary media

**Goal.** Per-client media, synced by API — **no manual drag-and-drop** in production (OM §6).

**Prerequisites.** Phase 4 done (shell can display media).

**Steps.**

1. **[Rick action]** Create the Cloudinary folder for the client: `clients/<client>/{products,brand,raw}` (OM §6, Design Guide C2).
2. Automate upload/sync via the Cloudinary API; keep the product SKU in the `public_id` for traceability.
3. Define named transformation presets (thumb, card, hero) so the codebase references names, not raw URL params (Design Guide C2).
4. Apply transforms at delivery via URL — never re-upload resized copies.
5. **[Rick action]** Store the Cloudinary API key in Netlify environment variables, never committed (OM §10).

**Definition of Done.**

- [ ] Monti Trentini's media loads in the dashboard from `clients/montitrentini/...`.
- [ ] Upload/sync runs via API (no manual upload step in the documented flow).
- [ ] Named transform presets defined and referenced by the shell.

**Log it.** "Phase 5 complete — Cloudinary sync live for montitrentini folder."

---

## Phase 6 — CRM connector v1 (Make)

**Goal.** Client CRM data flowing into the dashboard via Make middleware — zero new infrastructure
(brief §4).

**Prerequisites.** Phase 4 done (dashboard can display the data).

**Steps.**

1. **[Rick action]** Build a Make scenario mapping the client's CRM (HubSpot / Salesforce / Zoho / Pipedrive / Monday) → the dashboard data shape (OM §7).
2. Feed: contact records, order history, sales pipeline, invoice/payment status, communication logs.
3. Store the client's CRM type in `config/clients/<client>.json` (`crm` field).
4. **[Rick action]** Keep all CRM tokens in Netlify environment variables (OM §10).
5. For the pilot, wire **HubSpot (agency)** + **Monti Trentini's CRM** (Build Log open item).

**Definition of Done.**

- [ ] Live CRM data is visible in the Monti Trentini dashboard.
- [ ] `crm` field set correctly in `montitrentini.json`.
- [ ] No CRM secret is committed to the repo.

**Log it.** "Phase 6 complete — Make connector live, MT CRM data in dashboard."

---

## Phase 7 — Pilot deploy (Monti Trentini)

**Goal.** Ship `montitrentini.cheeseshoptech.com` and validate the whole stack on a real client
before scaling. **Ship first, iterate after** (brief §7).

**Prerequisites.** Phases 1–6 done.

**Steps.** This is the Client Onboarding Playbook (OM §8) run for tenant #1:

1. Pre-onboarding checklist — confirm all assets exist: logo (vector), brand colors, product photography, price list, CRM access.
2. Brand intake → fill `montitrentini.json` (subdomain, brand, cloudinaryFolder, crm, modules).
3. Commit + push → Netlify auto-deploys; visit `montitrentini.cheeseshoptech.com` to verify (OM §4).
4. **UAT** — **[Rick action]** client signs off on the preview URL before launch (OM §8).
5. Handoff & training — short Loom walkthrough; agree the post-launch support window **in writing**.

**Definition of Done (the new-client DoD, OM §4 + §8).**

- [ ] Subdomain resolves over HTTPS, brand skin correct.
- [ ] Media loads from Monti Trentini's Cloudinary folder.
- [ ] CRM data visible in the dashboard; login works.
- [ ] Client has signed off on UAT; training delivered; support window agreed in writing.

**Log it.** "Phase 7 complete — Monti Trentini pilot LIVE and UAT-signed. v1 validated."

---

## Phase 8 — CRM v2 (scale) — deferred

**Goal.** Replace per-client Make scenarios with one unified API (Merge.dev or Unified.to) covering
the top-5 CRMs.

**Do not start until Phase 7 is validated** (brief §7 sequencing discipline; this is a parking-lot
item until the pilot proves the model).

**Steps (when triggered).**

1. Pick Merge.dev vs Unified.to; map the unified schema to the existing dashboard data shape.
2. Migrate the HubSpot + Monti Trentini connections off Make onto the unified API.
3. Retire the Make scenarios once parity is confirmed; keep them as fallback for one cycle.

**Definition of Done.**

- [ ] All active clients' CRM data flows through the unified API with no per-client Make scenario.
- [ ] Pilot data parity confirmed pre-cutover.

**Log it.** "Phase 8 complete — migrated to <Merge.dev|Unified.to>, Make scenarios retired."

---

## Standing rules across every phase

- **One change = one commit** with a clear message; significant decisions also get a Build Log entry (OM §11).
- **Backup before structural changes:** `archive/backup_YYYY-MM-DD_before_<change>/`.
- **Secrets** live in Netlify env vars, never in the repo or in chat (OM §10).
- **Design-for-extraction now, not at exit:** provision in the client's own accounts where the asset is ultimately theirs, keep client values in config only, maintain a per-client asset register from day one (OM §12.2). A clean buyout is a sales asset and a revenue event.
- **Recovery drill quarterly:** restore a previous Netlify deploy to a preview and verify a client still renders (OM §9).

---

## The parking lot (do NOT build until pilot is live — brief §7)

Cold-chain logistics integration · commission-agreement automation · AI image-enhancement pipeline ·
full Services page on CheeseShopTECH.com · import-traffic monitoring · Cloudflare for SaaS
(client-owned vanity domains).

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
