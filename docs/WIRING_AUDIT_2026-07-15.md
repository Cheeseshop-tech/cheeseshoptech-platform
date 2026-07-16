# Wiring Audit — 2026-07-15

Code-verified state of every cross-app data seam, checked against the docs that describe intended
wiring (`DATA_OWNERSHIP_MAP.md`, `CONTENT_ENGINE_WIRING_SPEC.md`, `INTEGRATION_WIRING_BRIEF.md`).
Method: read the actual source (imports, function calls, env-flag branches), not the docs, then
diffed against what the docs claim. Four domains audited: CRM, Pricing/Inventory/Forecast, Brand
Kit/BSE, Media Hub/Content Engine — plus a fast check on Storefront/Campaigns.

## Executive summary

The platform is wired better than its own docs say. Three domains (CRM, Brand Kit/BSE, Media Hub)
have real, working end-to-end connections that the docs still describe as gaps or "mock." The
fourth (Pricing/Inventory/Forecast) has a real, sound seam design — but the thing feeding it is a
**manual per-quote button**, not an automated capture, so the forecasting engine has effectively
never run on real volume. Storefront and Campaigns are correctly still mock — no drift there.

**Biggest finding, found mid-audit:** the "open decision" flagged in today's earlier HANDOFF entry
— how to merge the new ERP monthly data into forecasting — turned out to already have an answer.
A seam (`sales-monthly.js` + `scripts/build-sales-monthly.mjs`) already existed for exactly this,
gated on a coverage threshold. Between this audit's start and finish, that pipeline picked up
today's new ERP files and ran (commits `b28aa64`, `7e18ce5`) — including catching and fixing a
units bug (2024 seed mislabeled USD instead of pounds). The gate is still closed (2.69% of broker
volume) because the underlying data still doesn't cover enough of 2024, not because of an
architecture gap. This is worth knowing on its own: the "should we build a merge mechanism" question
this session raised was already answered by code that existed before the session started.

## 1. CRM (HubSpot) — live, wired end-to-end. Docs badly stale.

**Real state:** `VITE_CRM_BACKEND=hubspot` is set in Netlify, `netlify/functions/crm-hubspot.js`
makes real read-only HubSpot calls (companies, contacts, sales-email activity), and the data reaches
the Opportunity Engine (`src/lib/opportunities.js` `accountsFromCrm()`) → `rankOpportunities()` →
`command-center.jsx` → `studio-director.js`'s Stage-0 draft. Wire #5 in
`CONTENT_ENGINE_WIRING_SPEC.md` ("market intelligence seeds the draft") is genuinely connected, not
aspirational.

**Docs that are wrong today:**
- `INTEGRATION_WIRING_BRIEF.md` still lists CRM as "🔸 mock," describes a build plan (new
  `netlify/functions/crm.js`) that shipped differently — the real function is `crm-hubspot.js`;
  `crm.js` is a dead Make-webhook path nothing calls.
- `CRM_CONNECTOR.md` describes the Make-webhook architecture as the live path. It isn't; HubSpot is
  called directly, no Make.
- `.env.example` doesn't list `hubspot` as a valid `VITE_CRM_BACKEND` value — anyone resetting env
  from this file would silently regress prod to the dead Make path.

**Real gaps, not doc problems:**
- **Two independent HubSpot read paths**: `crm-hubspot.js` (dashboard + Opportunity Engine) and
  `crm-summary.js` (CRM nav page + integration-health check) hit HubSpot separately, unconditionally
  — not gated by the same flag. Same data, two implementations to keep in sync if HubSpot property
  names change.
- **Silent degrade on permission errors.** A missing HubSpot scope (e.g. `sales-email-read`) fails
  into an empty/generic UI state with no surfaced error — a real permissions regression would look
  identical to "no recent activity."
- **No write-back exists anywhere** (confirmed: every HubSpot call is read-only). `INTEGRATION_
  WIRING_BRIEF.md`'s "step 2: write activities back" is accurately not-started, this part isn't stale.

## 2. Pricing / Inventory / Forecast — real engine, thin data feed

**Real state:** `forecast-core.js` is not dead code — it has exactly one consumer,
`pricing-tool.jsx`'s "Movement" tab, which calls `FC.report()` and renders reorder/container-pull
recommendations. `history.js`'s ledger is real (Netlify Blobs-backed, not a stub).

**But the only way a real sale becomes a forecast input is a rep manually clicking "Record sale"**
in the Proforma tab — a separate, opt-in action from printing/sending the quote. There is no
automated path from an actual completed sale, order, or invoice into `history.js`. If a rep forgets
the click, that revenue never reaches forecasting. In practice this means the engine has likely run
on close to zero real captured volume so far — the historical seed (`sales-monthly.js`, quality-
gated, see above) is the only substantial data it's ever seen, and that gate is closed.

**Data-integrity gap:** `catalog.json` (99 SKUs) and `inventory.json` (112 SKUs) are only
cross-referenced implicitly at render time (a `Set` union so nothing silently disappears from the
Movement table) — there's no validation script that surfaces the mismatch. Confirmed 26 inventory
codes with no catalog match and 13 catalog codes with no inventory row, sitting quietly.

## 3. Brand Kit / BSE — mostly resolved since the spec was written, one real gap remains

**Resolved (docs are stale, not code):**
- BSE is gated — pulled into the app bundle, rendered behind the same passcode/auth gate as
  everything else. `CONTENT_ENGINE_WIRING_SPEC.md` §4 still lists "gate the BSE" as open; it isn't.
- "Import kit JSON" button exists and works on the Brand Kits page. Spec still lists it as "v1, not
  yet built"; it is built.

**Still genuinely open:** automated BSE → kit sync. The BSE downloads a kit JSON file; a human still
manually imports it via the Brand Kits page. No function writes the BSE's output straight into the
tenant's kit store. This is the one part of the spec's gap list that's still accurately a gap.

**Consumption has drifted into two implementations.** Content Studio/Presentations go through
`brandTokens()`/`resolveTok()` (a normalized layer with hardcoded fallback hexes). Proposals call
`getBrandKit()` directly and read the raw kit shape, bypassing the token layer entirely. Same source
of truth, two consumption paths — if the kit schema changes, only the Presentations path has a
fallback safety net.

**Multi-tenancy is architecturally real but commercially unproven.** The brand-kit code is
genuinely tenant-keyed (no hardcoded Monti-Trentini special-casing in the lib layer), but there is
exactly one populated tenant kit. The second "tenant" bundle is an explicitly-placeholder template,
not evidence a second client has actually gone through this path.

## 4. Media Hub / Content Engine — sound, one known duplication not yet cleaned up

Already corrected earlier today (`studio-director.js` now sources product names from `items.js`,
the canonical Media Hub record, falling back to `catalog.json` only for SKUs not yet entered there).
Two things still open, both already flagged in `HANDOFF.md`, repeating here so they're not lost in
the pile of updates today:
- `catalog.json`/`items-seed.json` still carry unused duplicate name/blurb fields from before the
  items.js split — dead data, not wrong data, but a second edit box that could drift.
- `images.json` (the asset manifest) only refreshes via a manual `npm run sync:images` + redeploy —
  no webhook, no cron. Media Hub shows a new photo immediately; Catalog/Proposals/Pricing show the
  old manifest until someone remembers to resync.

## 5. Storefront (Shopify) / Campaigns (Make) — correctly still mock

Both flags (`VITE_STORE_BACKEND`, `VITE_CAMPAIGNS_BACKEND`) are read and branch correctly; both are
mock in practice, matching `INTEGRATION_WIRING_BRIEF.md`'s status table exactly. No drift here —
these just haven't been built yet, which the docs say honestly.

## 6. Agents (A1–A5 per `ONBOARDING_AND_AGENTS_SDD.md`)

Only Agent A1 (Content Studio Stage-0/1 auto-compose) has shipped. No trace of A2–A5 in
`BUILD_LOG.md` — they remain pure spec, unstarted. Not a wiring problem, just worth naming so the
platform's "5 agents" framing isn't overstated in anything client-facing.

## Improvement suggestions, prioritized

**P0 — fix now, cheap, real risk:**
1. Correct `INTEGRATION_WIRING_BRIEF.md`, `CRM_CONNECTOR.md`, and `.env.example` to reflect the real
   HubSpot-direct architecture. The `.env.example` gap in particular could cause someone to
   regress prod CRM to a dead path by innocently "resetting to defaults."
2. Delete or clearly mark dead code: `netlify/functions/crm.js` (Make proxy) and its mock dataset —
   nothing calls it, and its presence makes the architecture look more undecided than it is.
3. Add a small validation script (or extend an existing one) that diffs `catalog.json` SKU codes
   against `inventory.json` SKU codes and prints the mismatch — same discipline already applied to
   sales-history matching today, just not yet automated as a repeatable check.

**P1 — real gaps worth scheduling:**
4. Automate sale capture into `history.js` — even a lightweight nudge ("this proforma wasn't
   recorded") beats silent opt-in loss. Full automation (order/invoice webhook) is the real fix but
   bigger; a UI nudge is a cheap interim step.
5. Unify the two HubSpot read paths (`crm-hubspot.js` / `crm-summary.js`) into one function with two
   call sites, or at minimum document why they're separate — right now a HubSpot schema change means
   remembering to update both.
6. Pick one brand-kit consumption pattern (token layer vs. raw `getBrandKit()`) and migrate the
   other surface onto it — Proposals is the one without a fallback safety net today.

**P2 — lower urgency, real but not urgent:**
7. `images.json` staleness — pick one of the two options already on the table in `HANDOFF.md`
   (Cloudinary webhook auto-resync, or a "manifest last synced" indicator) rather than letting it
   sit as an open decision indefinitely.
8. Remove the dead duplicate name/blurb fields from `catalog.json`/`items-seed.json` once the Price
   List Creator schema work that touches them is scheduled anyway — not worth a standalone pass.
9. Automate BSE → kit sync (download-then-import is fine at one tenant; won't scale past a handful).

## Docs that need a correction pass (lower priority than the code fixes above, but real)

`INTEGRATION_WIRING_BRIEF.md`, `CRM_CONNECTOR.md`, `CONTENT_ENGINE_WIRING_SPEC.md` §4 (BSE-gating
and Import-button lines), `.env.example`. None of these are wrong about intent — they're wrong about
current state, because they weren't updated when the work shipped. Same category of problem
`DATA_OWNERSHIP_MAP.md` had before this session's earlier correction pass.
