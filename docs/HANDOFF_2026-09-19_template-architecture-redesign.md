# HANDOFF — Template/Tenant Architecture Redesign (ADR)

**Status:** Proposed
**Date:** 2026-09-19
**Deciders:** Rick Posada
**Supersedes (for now):** the "just populate demo.json with mock data" plan from earlier the same day (tasks #19–24 in that session — see "How this changes the open task list" at the end). Nothing in that plan is wrong, it's just Phase 3 of this larger plan now, not the first move.

## Orientation (read this first if you're picking this up cold)

Rick's ask, verbatim intent: the "demo" client tenant IS meant to be the reference implementation of `_template.json` — the thing every future real client gets cloned from. Rather than patch `demo.json` with mock data on top of the current template architecture, he wants a genuine architecture review of the one real, proven-out tenant (Monti Trentini) — what's well-designed vs. what were mistakes — and a **superior** template design before we rebuild demo as that reference: better scaling, real security hardening, and clean integration extensibility. This is scoped as a multi-week initiative, not a single session. A visual/design refresh is also planned (Rick is sourcing a reference site) — tracked here as Phase 5, deliberately last, because a new look should sit on top of a settled architecture, not get redone twice.

This doc is both the audit and the ADR. One document, not two, on purpose — the audit itself found "two edit boxes for the same fact is how data drifts" (`docs/DATA_OWNERSHIP_MAP.md` line 8) as a standing project principle; splitting the audit and the decision into separate files would violate the same principle it's built on.

---

## Context

CheeseShop TECH (CST) is a multi-tenant B2B SaaS platform: React + Vite frontend, Netlify Functions backend, Netlify Blobs storage, HubSpot as the (read-only) CRM of record. One real tenant exists today — `montitrentini` — fully live and the proof of the whole pattern. A second tenant, `demo` (meant to mirror `config/clients/_template.json`, the literal clone-from-this-file for onboarding), exists but is a non-functional empty shell: no CRM mock data, empty catalog, empty signals/market-news/attention feeds, and missing entire product surfaces (Greet to Meet, calendar, deals) that the real tenant depends on.

A full codebase audit (file system/config architecture, the mock-vs-live "seam" pattern, security/tenant-isolation, integration extensibility, scaling, and self-documented past mistakes) was run before writing this decision. Findings below are cited by file and line where possible — this was a real audit, not a guess.

### Audit finding 1 — No single manifest connects a tenant config to its data

`config/clients/<id>.json` (brand, tools, calendar, deals) and `src/data/<id>/*.json` (catalog, signals, attention, market-news, brand-kit, etc.) are two **independent, uncoupled** systems. The connection between them is re-established independently in **six different seam library files**, each with its own hardcoded map:

```js
// repeated near-verbatim in attention.js, signals.js, market-news.js, pricing.js, images.js, brandKit.js
const BUNDLES = { montitrentini: mtData, demo: tplData };
```

`docs/CLIENT_ONBOARDING_GUIDE.md` confirms this is the **documented, sanctioned** onboarding step, not incidental debt: *"Register `<id>` in the six seam maps (one import + one BUNDLES line each)."* Onboarding a new client today means a minimum of 6 manual, 2-line code edits across 6 files, on top of the config JSON and the `src/data/<id>/` directory copy — and **nothing fails at build or runtime if one is missed**. That tenant's card for that one feature just silently renders empty. This is exactly how `demo` ended up an empty shell: the manual step was never fully exercised with a second real tenant.

### Audit finding 2 — The mock/live "seam" pattern is excellent where it's consistent, and has drifted where it isn't

`attention.js`, `signals.js`, `market-news.js` share one genuinely well-designed contract: `{items, isSample, updatedAt}`, with `isSample` decided **per-fetch at runtime**, not from a build-time flag — this correctly distinguishes "empty but provisioned," "unprovisioned," "network failure," and "stale build" instead of collapsing them into one boolean. This is the single best-designed pattern in the codebase.

It has not been applied uniformly:
- `pricing.js` / `use-pricing-data.js` solves the same problem a **second**, structurally different way: two parallel hook-state strings (`stockSource`, `priceListSource`) instead of the envelope object.
- `crm.js`'s `crmIsSample` is a **module-level constant** derived from the build flag only — exactly the "false live over sample" failure mode the other three seams were fixed to avoid. CRM is the one seam still exposed to it.
- Four "identical" publish functions (`attention-publish.js`, `signals-publish.js`, `market-news-publish.js`, and by pattern `inventory`) actually have a real, deliberate semantic split baked in as copy-paste: `attention-publish.js` allows an empty array (a clear inbox is good news); `signals-publish.js`/`market-news-publish.js` refuse one (422 — a bad research run must never blank a good live list). Correct as designed, but a fifth feed built by copying the wrong sibling has a 50/50 chance of inheriting the wrong rule, because there's no shared abstraction encoding *why* each one is right — only a comment.

### Audit finding 3 — Security is mostly sound; two real gaps, not many

- Tenant-string sanitization (`.replace(/[^a-z0-9-]/gi, "")`) is **universal** across every Netlify function checked — genuinely disciplined, not drifted. Worth keeping as a hard rule, but it's currently consistent by *discipline* (retyped per file), not by *construction* (shared import).
- Real Netlify Identity sessions correctly bind a signed-in client-admin to their own `app_metadata.tenant` server-side — a Monti Trentini client-admin cannot read/write another tenant's data by editing `?tenant=` in the URL. This is correctly implemented.
- **Gap A:** the generic (non-tenant-suffixed) `PORTAL_ADMIN_PASSCODE` env var, if set, is a skeleton key across **every** tenant's client-admin-tier data — it isn't bound to one tenant the way `PORTAL_ADMIN_PASSCODE_<TENANT>` and real JWT sessions are. Whether this is a live risk depends on whether that generic var is actually set in production — needs a direct check, and arguably shouldn't exist as a concept once real Identity sessions cover the same need.
- **Gap B:** passcode comparisons are plain `===`, not constant-time. Low real-world severity (server-side secrets, not per-request nonces) but cheap to fix.
- Storage isolation itself is sound: every Blobs read/write keys by the sanitized tenant string, in a named store per data type — structurally, tenant A's request cannot return tenant B's blob once auth passes. The risk lives entirely in the auth layer (Gap A), not the storage layer.
- Every `config/clients/*.json` ships in the JS bundle served to **every** tenant's subdomain (`import.meta.glob(..., { eager: true })`, build-time). Nothing in there is secret today, but it's a precedent worth closing off explicitly before a client config ever needs to hold something sensitive.

### Audit finding 4 — HubSpot is deeply coupled, not abstracted; a second CRM would be a real rewrite

`crm-hubspot.js` hardcodes HubSpot's REST URLs, its 4 req/s rate limit, an unconfirmed internal property-name guess (`CHANNEL_PROPERTY`, flagged in its own comment as unconfirmed), and HubSpot-specific 403/scope-diagnosis shapes. `crm.js`'s `CRM_BACKEND` is a two-value switch (`mock` or implicitly-HubSpot) with no second live branch. `config/clients/client.schema.json` only allows `"crm": "hubspot" | "none"` at the schema level — adding a second CRM isn't even data-driven yet.

What **is** genuinely good and generalizes: HubSpot stays read-only by explicit architectural decision; everything the platform needs to write (outreach status, temperature, notes) lives in the platform's own Blobs overlay (`crm-outreach.js`), keyed by the CRM's own id. That "CRM of record stays read-only; platform owns its own overlay" split is CRM-agnostic in spirit even though today's implementation isn't. It should survive the redesign; the HubSpot-specific plumbing around it shouldn't be the pattern a second CRM has to copy.

### Audit finding 5 — Scaling ceiling is real but was chosen deliberately, not accidentally

Every Blobs-backed write (`crm-outreach.js`, `campaign-state.js`, `items-save.js`) is a full-document last-writer-wins overwrite, explicitly commented "fine at this team size" in three separate files. `history.js` is the one exception that merges rather than overwrites. No pagination exists anywhere in the Blobs layer — every store is capped by a hardcoded byte/item constant (400KB–1.8MB, 24–5000 items depending on store) rather than paginated, and `crm-hubspot.js` caps HubSpot company fetches at 10 pages (1000 companies) with a comment to "raise if the tenant grows past that." None of this is wrong for one team-sized tenant. It is exactly the kind of implicit assumption that needs to become explicit before a template is meant to support many concurrently-active client tenants.

### Audit finding 6 — The team (Claude + Rick) already has a strong self-audit culture worth formalizing, not just praising

CRM-05 (the "failed read masked as fake-empty success" bug) was root-caused, then **grepped for across the whole codebase** and fixed in ~9 other places the same session — that's the right instinct. `docs/WIRING_AUDIT_2026-07-15.md` is a real, dated, honest audit that already found the demo-tenant gap this redesign is responding to, over two months before this conversation. The redesign below leans on that instinct rather than replacing it.

---

## Decision

Rebuild the tenant-onboarding architecture around **three structural changes**, then rebuild `demo` as the first tenant born from the new pattern (not patched under the old one). Ship in phases over the "few weeks" timeframe Rick set, each phase independently shippable and independently useful even if a later phase slips.

1. **Registry-driven tenant data, replacing the 6-file manual BUNDLES pattern.** Extend the `import.meta.glob` pattern already used for `config/clients/*.json` to `src/data/*/*.json`, so a new tenant's data is discovered automatically by directory presence — no code edit required in any seam file. A missing data file for a given tenant falls back to `_template`'s shell **loudly** (a visible "no data yet" state, not a silent empty render) rather than requiring a registration step that can be forgotten.

2. **One shared seam contract, not four.** A single `createSeam()`/`useSeamData()` implementation providing the `{items, isSample, updatedAt}` envelope (attention/signals/market-news' pattern — the best of the four found) that every current and future data type is built on, including CRM and pricing. This turns "isSample decided per-fetch" from a convention three files happen to follow into a guarantee the fourth and fifth can't opt out of by accident.

3. **A real tenant scaffold, not copy-paste-and-hope.** `npm run new-client <id>` generates the config, the data directory (seeded from `_template`), and confirms via the new registry (change 1) that nothing needs hand-registering elsewhere. `_template.json` becomes the literal, buildable, always-in-sync source `demo` renders from — not a sibling that quietly drifts from it (audit finding: `_template.json` and `demo.json` had already diverged on real fields, not just naming, despite being "the same empty shell").

Security and integration-extensibility work (below) are threaded through these phases rather than bolted on afterward, because retrofitting an abstraction after the fact is exactly the kind of rework this redesign is meant to avoid repeating.

## Options Considered

### Option A: Patch `demo.json` with mock data now, defer architecture work

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Cheapest short-term |
| Scalability | Doesn't move the needle — the 6-file manual registration problem remains for client #3 |
| Team familiarity | High — it's the pattern already in use |

**Pros:** demo looks functional within a day; matches the plan already queued (tasks #19–24).
**Cons:** locks in the exact pattern the audit flags as the root cause of demo's current emptiness — the next real client hits the same 6-file trap. Doesn't touch security gaps or the HubSpot coupling. Rick explicitly asked to not do this ("lets take the opportunity to improve on the prototype... and correct the mistakes").

### Option B: Full rebuild — new data layer, real database, generalized CRM adapter interface, all at once

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | Weeks of rework before anything ships |
| Scalability | Best long-term outcome |
| Team familiarity | Low — Blobs-to-database is a genuine platform migration, not a refactor |

**Pros:** solves every audit finding in one pass; no half-migrated state.
**Cons:** montitrentini is a live, revenue-relevant tenant — a full rewrite risks it for weeks to benefit a template with zero other tenants on it yet. Violates the platform's own stated principle (`cst-build-strategy.md`, referenced in memory: "the platform/template build never waits on a client's approval" — cuts the other way too: montitrentini's stability shouldn't wait on the template rebuild either). Over-builds for a scaling problem that doesn't exist yet (one real tenant).

### Option C (chosen): Phased structural redesign — registry + shared seam contract + real scaffold, security hardening threaded through, database/CRM-adapter work deferred to a named future phase gated on actual need

| Dimension | Assessment |
|---|---|
| Complexity | Medium, but spread across independently-shippable phases |
| Cost | A few weeks, matching Rick's own stated timeframe |
| Scalability | Removes the actual bottleneck (manual per-tenant code edits) now; defers the Blobs-to-database question to when a second real client makes it a real question, not a hypothetical one |
| Team familiarity | Builds on patterns already proven in this codebase (`import.meta.glob`, the isSample-per-fetch envelope) rather than introducing new infrastructure |

**Pros:** montitrentini is never put at risk — every phase is additive or isolated to the template/demo path until proven. Each phase ships independently, so slippage on Phase 4 doesn't block Phases 1–3 from already being live. Directly answers all three things Rick asked for (scaling, security, integrations) without over-building for a scale that doesn't exist yet.
**Cons:** slower to a demoable "looks functional" state than Option A — demo won't have real mock content until Phase 3.

## Trade-off Analysis

The real trade-off is Option A's speed vs. Option C's durability. Option A would have demo looking presentable by end of day; Option C means demo stays an empty shell for roughly the first two phases. Rick's own framing — "let's take the opportunity to improve on the prototype... and correct the mistakes that were made," explicitly scoped as "over a few weeks" — states a preference for durability over speed here, so Option C matches the actual ask rather than optimizing for a deadline nobody set. Option B was rejected primarily on risk: montitrentini is the one thing paying for this build right now, and a full-rewrite posture threatens it for a benefit (supporting many tenants) that doesn't have a second customer yet to justify the risk.

## Consequences

**Gets easier:**
- Onboarding client #3 (and beyond): config + data directory, no code edits, no silent-empty-if-forgotten risk.
- Adding a new data type/seam (the next "signals"-shaped feature): one shared implementation to extend, not a fourth pattern to invent.
- Auditing security: tenant-sanitization and passcode-scoping become one shared, reviewable implementation instead of "check that every file did it right."

**Gets harder, at least temporarily:**
- Demo tenant stays non-functional for longer than a single-session patch would take — worth saying plainly to anyone expecting a quick before/after.
- Every current seam file (6 of them) needs touching once, during Phase 1/2, even though montitrentini's *behavior* shouldn't change — this is real migration work, not zero-risk, and needs the same build/lint/manual-verify discipline every change this session has used.

**Will need revisiting:**
- The Blobs-to-real-database question, explicitly deferred here, should be reopened the moment a second real paying tenant is onboarded or montitrentini's data volume approaches any of the hardcoded caps found in the audit (400KB outreach doc, 1000-company HubSpot page cap, etc.) — not before.
- The generalized CRM-adapter interface (Phase 4) is scoped now at "design the interface, implement HubSpot against it" — a second real CRM implementation should wait for an actual second client that needs one, so the interface isn't designed against a guess.

## Action Items — phased roadmap

**Phase 0 — Security quick wins (small, low-risk, can start immediately, doesn't block anything else)**
1. [ ] Confirm whether the generic `PORTAL_ADMIN_PASSCODE` env var is actually set in production; if so, scope or retire it in favor of per-tenant passcodes + real Identity sessions only.
2. [ ] Switch passcode comparisons in `_write-guard.js` to constant-time (`crypto.timingSafeEqual` or equivalent).
3. [ ] Centralize the tenant-string sanitizer into one exported helper, imported everywhere it's currently retyped.
4. [ ] Add an explicit rule (schema comment + `CLIENT_ONBOARDING_GUIDE.md` note) that `config/clients/*.json` must never carry secrets, given it ships in every tenant's bundle.

**Phase 1 — Registry-driven tenant data (removes the 6-file manual-registration trap)**
5. [ ] Extend `import.meta.glob` from `config/clients/*.json` to `src/data/*/*.json`; build a tenant→data-file registry at module load.
6. [ ] Migrate `attention.js`, `signals.js`, `market-news.js`, `pricing.js`, `images.js`, `brandKit.js` off hand-written `BUNDLES` maps onto the registry, one file at a time, verifying montitrentini's live behavior is unchanged after each.
7. [ ] Define the loud "no data yet for this tenant" state (visible, not silently empty) for a tenant with a config but no data directory yet.

**Phase 2 — One shared seam contract**
8. [ ] Extract `createSeam()`/`useSeamData()` from the attention/signals/market-news pattern into one shared implementation.
9. [ ] Migrate `pricing.js`/`use-pricing-data.js` and `crm.js` onto it, closing the CRM `isSample`-as-build-flag gap identified in the audit.

**Phase 3 — Real tenant scaffold + demo rebuild (this is where "Alpine Rind Co." finally gets built)**
10. [ ] `npm run new-client <id>` scaffold script: config + data directory from `_template`, validated against the registry from Phase 1.
11. [ ] Rebuild `demo` through the new scaffold — this absorbs everything scoped in tasks #19–24 (Alpine Rind Co. brand/CRM mock/catalog/signals/booth seed captures/Greet to Meet tile), now built on the corrected architecture instead of patched onto the old one.
12. [ ] Add the Greet to Meet tile to the house tenant (task #18) — small, independent, can actually happen any time before or during this phase.

**Phase 4 — Integration extensibility**
13. [ ] Design a generic CRM adapter interface (list/get companies, upsert contact, read-only-by-default posture preserved) against HubSpot as the reference implementation.
14. [ ] Move `crm.js`'s two-value `CRM_BACKEND` switch to an adapter registry; update `client.schema.json`'s `crm` enum to be adapter-driven rather than hardcoded.

**Phase 5 — Visual/design refresh (deliberately last)**
15. [ ] Pending Rick's reference site example — apply new look to the now-settled template architecture, once, rather than twice.

### How this changes the open task list

Tasks #18–24 (created earlier this session) are not discarded — #18 (house tile) can proceed any time, and #19–24 (Alpine Rind Co. build-out) become the concrete content of Phase 3, step 11 above, done on the new architecture instead of the old one. Nothing already shipped (readiness score, Greet to Meet rename, signals live-data pipeline) is touched by this redesign — all of that lives in montitrentini's real tenant path, which this plan explicitly protects.

### A note on "create the project"

This session can't write to your persistent memory system (the cross-session notes under `/projects/...` that this conversation itself read from earlier) — that's a hard limitation of this particular session, not a choice. This document is the durable artifact instead: it lives in the repo at `docs/HANDOFF_2026-09-19_template-architecture-redesign.md`, so any future session (or you) can pick it up cold. If you want this initiative tracked in your own memory/project system the way your other CST work is, that needs to happen from a session that can write there — worth asking for explicitly next time you're in a surface that supports it.
