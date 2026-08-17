# CheeseShop TECH — Project Roadmap & Daily Accountability

**Purpose:** Rick's own words (2026-08-17): "I constantly propose new ideas and projects with
little continuity." This doc is the fix — the single place every open thread lives, kept current,
that the daily email reads from and points back to. If it's not in here, it doesn't exist yet as
a tracked commitment.

**How to use this doc:** every thread below has a status (✅ Live / 🔧 In progress / 📋 Spec'd,
not built / 💭 Idea, not spec'd) and a **Next concrete action** — always something doable, not a
vague goal. The daily email pulls "Next concrete action" from whichever thread is flagged 🔴
PRIORITY. Update this file (not just BUILD_LOG.md) whenever a thread's status changes — that's
what keeps the email honest instead of stale.

**Last synced against repo:** 2026-08-17 (commit `74864cc`). Cross-referenced against
`CLAUDE_CODE_BRIEF.md` §3 (last updated 2026-06-06 — that file is stale by ~2.5 months of shipped
work; treat THIS doc as more current, and fix CLAUDE_CODE_BRIEF.md's state section in a future
session so it stops disagreeing with reality).

---

## 🔴 PRIORITY — Security & Auth upgrade

**Status:** 📋 Built, dormant, not flipped on. **Rick's call today: this is thread #1.**

A full per-user login system (Netlify Identity — roles, tenant scoping, invite/recovery flows,
`src/lib/auth.js` + `auth-context.jsx` + `login-screen.jsx`) has existed in the codebase since
Phase 3 and has never been turned on for real use. Production currently runs on
`VITE_AUTH_MODE=passcode` — one shared password per tier (client / client-admin / house-admin),
no per-person accounts, no revocation if someone leaves. This already caused one real incident:
the house passcode was shared with Monti Trentini's GM on 2026-08-13/14 (not malicious, but it's
exactly the failure mode a shared secret can't prevent).

**Why this blocks client #2:** a second client sharing the same platform with only passcode-tier
auth means one client's admin passcode, if it ever leaked the way the house one did, has no
blast-radius containment. Real per-user accounts are the floor for "production-ready for more
than one trusting client."

**Next concrete action:** Rick decides to proceed, gives Stefano's email for the invite, and says
whether to drive the Netlify dashboard himself or have Claude do it live via computer-use. Steps
are already written in `docs/AUTH_AND_ROLES.md` and [[cst-auth-upgrade]] — this is flip-a-switch
work (rotate `PORTAL_HOUSE_PASSCODE`, enable Identity, invite-only + strong passwords, unset
`VITE_AUTH_MODE=passcode`, redeploy, verify tenant isolation), not a rebuild.

**Not in scope for this pass:** the Clerk migration (per-user + real multi-tenant orgs) that was
the original plan for "when client #2 signs." That's still the right long-term answer at 10-client
scale — Identity's tenant model is a role-string hack. Sequence: Identity now (closes the gap for
free), Clerk later (when scale actually demands it).

---

## Scale-to-10-clients infrastructure

**Status:** 🔧 In progress — real groundwork shipped, real gaps remain.

**Shipped:** template tenant (`config/clients/_template.json` = full clone config, content-free),
`demo` tenant renders every app's empty state, ~15-minute new-client stand-up procedure
(`docs/CLIENT_ONBOARDING_GUIDE.md` Step 0), onboarding kit (6 intake files, native formats), the
Onboarding Hub UI on the house Command Center.

**Real gaps:** `scripts/import-catalog.mjs` (data ingestion) not built — onboarding kit file 01
still needs Claude-assisted manual ingestion per client. Sales-history import is a documented gap
across two systems (agent A3/A4 forecasting AND Monti's own forecast). Pricing model itself
(`docs/PRICING_PROPOSAL_v1.1.md`) is proposed, not locked — Stand-Up Month + monthly tiers, needs
a "flinch test" before it's real. Agent economics (A1–A5) need Rick's Anthropic Console account +
spend cap set up before Stage 2 AI features unblock across the roster.

**Next concrete action:** decide and lock the pricing model (v1.1 proposal exists, needs a
yes/no/adjust), since that gates how "client #2" is actually proposed and signed at all.

---

## Ecommerce — D2C + Wholesale (the "jewel")

**Status:** 🔧 Foundations laid, most of the real build ahead. This is the single biggest body of
undone work on this list, and the one Rick flagged as most at risk of perpetual deferral — worth
protecting from getting bumped every time something more urgent shows up.

**D2C storefront (headless, Shopify-backed):** Decision locked 2026-06-06 — portal owns the
experience layer (frontend, merchandising, admin, analytics), Shopify owns checkout/payments/
tax/inventory (`docs/STOREFRONT_STRATEGY.md`). Product-catalog READ from Shopify's Storefront API
is built (`netlify/functions/store.js`) but has never run against a real store — Monti's current
Shopify presence is a static UI mock (`mt-e-comm`). Orders (Admin API) are deferred. Theme/hero/
banner/page management is portal-owned but still mock data.
**Next concrete action:** [Rick] confirm Monti has (or will have) a real Shopify store with
Storefront API enabled, then set `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_TOKEN` +
`VITE_STORE_BACKEND=shopify` in Netlify — that one step turns the mock into a live read.

**Wholesale ordering (portal-native, NOT ecomm):** Decision locked 2026-07-16 — wholesale pricing
and PO submission live inside the portal catalog, never in the ecomm platform, because wholesale
cheese pricing (catch weight, freight floors, class-of-trade margins, quote validity windows)
doesn't fit an ecommerce data model. 4-phase build plan (`docs/WHOLESALE_ORDERING_WORKFLOW_SPEC.md`):
Phase 1 (quote validity + price snapshot) — ✅ shipped 2026-07-16. Phase 2 (buyer email gate,
pre-authorized identity) — 📋 spec'd, not built. Phase 3 (customer pricing profiles + server-side
catalog price levels) — 💭 not started. Phase 4 (PO submission + pipeline stages) — 💭 not started.
**Next concrete action:** build Phase 2, the buyer email gate — it's the identity layer everything
after it depends on (`docs/PROPOSAL_BUYER_EMAIL_GATE_SPEC.md` already exists).

---

## Monti Trentini (client #1) — ongoing operations

**Status:** ✅ Live and actively used day-to-day; this is upkeep + incremental feature work, not
a green-field build. Booth→HubSpot CRM sync, Recap-to-Gmail, Pricing/Inventory sync, Content
Engine, Media Hub, Quote Builder, Asiago campaign tooling are all shipped and in real use.

**This week's fixes (2026-08-17):** booth→HubSpot 403 root-caused and resolved (wrong credential
type, not a missing scope — see [[hubspot-token-wrong-app]]); Recap button rebuilt to force Gmail
compose from the tenant's real sales identity instead of a bare, unreliable `mailto:` link, and
click-tested live.

**Open, not urgent:** decide whether `HUBSPOT_TOKEN` should move from the Private App token
(today's fix) onto a Service Key deliberately — HubSpot's own current guidance recommends Service
Keys for exactly this kind of data-only integration (see [[hubspot-token-wrong-app]] update).

---

## Also on the radar, not yet a tracked thread

- **CST business model crossroads** ([[cst-business-model-crossroads]]) — Stefano's interest in
  partnering in CST itself (not just being a client) is unresolved and higher-stakes than any
  item above; it changes the incentive structure around auth, IP, and pricing decisions once
  settled. Needs Rick's explicit decision, likely with legal counsel, before it's actionable here.
- **In-app Progress/Onboarding tab** — see `docs/PROGRESS_TAB_SPEC_2026-08-17.md`, spec'd
  2026-08-17, not built. This roadmap doc is its data source once it exists.
