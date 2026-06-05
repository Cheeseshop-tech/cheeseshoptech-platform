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

## 2026-06-05 — Phase 1 IN PROGRESS — domain verified on Cloudflare, Netlify deploy pending

**Status.** Phase 1 (Domain & hosting, Option C) started, not complete.

**Done.** `cheeseshoptech.com` confirmed on Cloudflare — nameservers verified
(`dalary.ns.cloudflare.com` / `maciej.ns.cloudflare.com`). External DNS lookups confirm the zone
is authoritative on Cloudflare.

**Pending / next sit-down.**
1. Deploy `public/coming-soon/` to Netlify (drag-drop via app.netlify.com/drop) → capture the `*.netlify.app` URL.
2. Add 3 CNAMEs in Cloudflare DNS (`@`, `www`, `*`) → that Netlify URL, proxy ON. *(Records table currently empty — none saved yet; correct, since there was no Netlify target to point at.)*
3. Upload Cloudflare Origin Certificate (apex + wildcard) to Netlify; set SSL/TLS = Full (strict).
4. Verify `https://cheeseshoptech.com` loads the coming-soon page over HTTPS = Phase 1 DoD.

**Gotcha logged for next time.** DNS records can't be added until the Netlify site exists (the
CNAME target is the `*.netlify.app` hostname). Deploy first, then wire DNS.

**Note.** With Cloudflare proxy ON, Netlify may persistently show an "awaiting external DNS / not
pointing to Netlify" warning — this is expected in Option C and should be ignored. The Origin
Cert is what validates the connection. Do NOT switch to Netlify DNS.

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
