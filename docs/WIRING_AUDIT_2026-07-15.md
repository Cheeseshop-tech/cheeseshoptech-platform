# Wiring Audit — 2026-07-15

Code-verified state of every cross-app data seam, checked against the docs that describe intended
wiring (`DATA_OWNERSHIP_MAP.md`, `CONTENT_ENGINE_WIRING_SPEC.md`, `INTEGRATION_WIRING_BRIEF.md`).
Method: read the actual source (imports, function calls, env-flag branches), not the docs, then
diffed against what the docs claim. Four domains audited: CRM, Pricing/Inventory/Forecast, Brand
Kit/BSE, Media Hub/Content Engine — plus a fast check on Storefront/Campaigns.

## Executive summary

The platform is wired better than its own docs say. Three domains (CRM, Brand Kit/BSE, Media Hub)
have real, working end-to-end connections that the docs still describe as gaps or "mock." The
fourth (Pricing/Inventory/Forecast) has a real, sound seam design; the Proforma's "Record sale"
button was initially flagged here as a gap ("reps might forget to click it") — **corrected by Rick:
that button is a rep note-taking aid, not the forecast's data source. Forecasting is meant to run
off quarterly sales reports as a batch tool, by design, not live order entry.** See §2 for the
full correction. Storefront and Campaigns are correctly still mock — no drift there.

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

**Correction (Rick, 2026-07-15): this is by design, not a gap.** Forecasting is meant to run off
**quarterly sales reports** as a batch data tool — not off live order entry. The Proforma's "Record
sale" button is **strictly a rep note-taking aid** ("what did this customer order last time"), not
the forecasting input. So "reps might forget to click it" is a non-issue: the button was never
supposed to be the forecast's data source. The real forecast feed is (and should stay) the
`sales-monthly.js`-style quarterly-batch seam. Original wording of this section, and the "automate
sale capture" suggestion it produced, is struck below — kept for the record rather than deleted.

~~But the only way a real sale becomes a forecast input is a rep manually clicking "Record sale" in
the Proforma tab — a separate, opt-in action from printing/sending the quote. There is no automated
path from an actual completed sale, order, or invoice into `history.js`. If a rep forgets the click,
that revenue never reaches forecasting. In practice this means the engine has likely run on close to
zero real captured volume so far — the historical seed (`sales-monthly.js`, quality-gated, see
above) is the only substantial data it's ever seen, and that gate is closed.~~

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

## 7. Product Catalog / Proposal Engine / Pricing Tool — the name-source fix didn't reach two siblings

> **Fixed 2026-07-16** — both siblings now join `items.js` for names with a `catalog.json` fallback (P1 item 6 below).

Product Catalog (`buyer-catalog.jsx`) is wired correctly: driven by `items.js` for name/copy,
`images.js` for photos, matches the documented model exactly, no price shown (out of scope for that
surface by design).

**Proposals and the Pricing tool are not.** Both `proposal-builder.jsx`/`proposal-view.jsx`
(`src/lib/proposals.js` `flattenSkus()`) and `pricing-tool.jsx` build their product name straight off
`catalog.json`'s own `name` field — neither imports `items.js` at all. This is the identical bug
`studio-director.js` had until today's fix; it just hasn't been applied here yet. Practical effect:
if someone edits a product name in Media Hub's items panel but not in the price list, the Catalog
and a Proposal for the same SKU can legitimately show two different names, silently.

**Real correctness risk found, not previously flagged: proposal pricing is always-live, by
design, with no freeze.** `proposal-view.jsx` quotes price at render time against the tenant's
*current* `catalog.json`, every time the link is opened — confirmed deliberate (comments state
"prices always quote live," "the link can never go stale"). The tradeoff: a buyer who reopens a
proposal link days later can see a **different price than what they were originally quoted, with no
indication anything changed.** That's a live-pricing feature working exactly as designed, and also
a real trust/dispute risk the moment a price actually moves between send and reopen.

**Confirmed dead:** `catalog.json`'s per-SKU `image` field — zero references anywhere in `src/`,
same class of unused-but-still-editable field as the name/blurb duplication already flagged in §4.
`images.js`'s `codeImageUrl()` has a third-tier fallback (a legacy Cloudinary-convention URL, built
blind with no existence check) that's a deliberate stopgap for SKUs not yet in the manifest, not
dead — but worth knowing it's still live and unguarded.

**Degrades gracefully where it matters:** missing images show an explicit empty state everywhere
checked (Catalog, Proposals, Pricing tool) rather than a broken `<img>`. SKU-only-in-catalog.json
still renders in the Catalog via a frozen items-seed backfill (can go stale if the seed script hasn't
rerun since a catalog.json name change — minor). SKU-only-in-items.js (entered in Media Hub, not yet
priced) is simply invisible in Proposals/Pricing tool, by construction, not broken.

## 8. Auth/Roles, House Admin Console, tenant routing — the audit's most serious finding

**Tenant routing (apex / `admin.` / `<client>.` doors) works exactly as documented** —
`clientConfig.js`'s subdomain resolver correctly implements the door model, no drift.

**Auth is further along than its own doc says, but has a real hole the doc doesn't mention
either.** `AUTH_AND_ROLES.md` (dated 2026-06-05, "single shared passcode, everyone sees the same
portal") is stale — the code has a real 3-tier server-side passcode system
(`client`/`client-admin`/`admin`, per-tenant `PORTAL_ADMIN_PASSCODE_<TENANT>`), and it's genuinely
enforced on the three Cloudinary write endpoints (`items-save.js`, `media-update.js`,
`media-delete.js` all 401 without the right passcode header — this was a real fix shipped
2026-07-06 after a direct-curl exploit was found).

**That write-side fix was never extended to reads. This is the audit's most serious finding.**
Every Netlify function that returns sensitive data — `crm.js`/`crm-hubspot.js`/`crm-summary.js`
(full HubSpot company/contact/deal data), `items-get.js` (pricing/item docs), `media-list.js`
(full asset list including unapproved/draft), `inventory.js` — has **zero auth check**. Anyone who
knows or guesses a function URL (`https://<site>/.netlify/functions/crm-hubspot`, no passcode
header needed) gets the tenant's CRM data directly. `history.js`'s POST (writes movement/sales
records) has the same gap — its own code comment assumes "the app is passcode-gated," but that's a
client-side assumption the function itself never verifies. The House Console's role walls
(`agency-console.jsx`'s admin-only routes) are the same story: client-side route-hiding with no
matching server-side check on the data those routes pull.

**Multi-tenancy at the config level is real but thin, consistent with earlier findings.** Only two
configs exist — `montitrentini.json` (fully live) and `demo.json` (empty scaffold). The resolver
genuinely drives UI/theme/tools from config with no code changes required, so "add a client =
config only" is plausible — just never exercised with a second real client yet.

**House Console is a partial build**, not a stale-doc situation — `HOUSE_CONSOLE_SPEC.md` itself
already says the client-selector shell, items importer, and bulk upload/tagging aren't built; the
audit confirms the doc is accurate here, unlike most other docs in this audit.

## Improvement suggestions, prioritized

**P0 — fix now, cheap, real risk:**
1. **Unauthenticated read endpoints — the most serious finding in this audit.** `crm.js`,
   `crm-hubspot.js`, `crm-summary.js`, `items-get.js`, `media-list.js`, `inventory.js`, and
   `history.js`'s POST all have zero server-side auth check — anyone who knows or guesses the
   function URL gets the tenant's CRM data, pricing, inventory, or can write movement records
   directly, no passcode needed. The write-side fix that closed this exact hole for
   `items-save.js`/`media-update.js`/`media-delete.js` (2026-07-06, after a direct-curl exploit)
   was never extended to reads. Same `requireWriteAuth()` pattern already exists in
   `_write-guard.js` — this is applying an existing, proven fix to more endpoints, not new design.
   **Fixed 2026-07-16** — new `requireReadAuth()` in `_write-guard.js` (same model; reads also
   accept the base `PORTAL_PASSCODE` tier) now guards `crm-hubspot`, `crm-summary`, `items-get`,
   `media-list`, `inventory`, and `history` (GET + POST; POST also logs via `logWrite()` per the
   BUILD_LOG standing rule). All frontend reads replay the unlock passcode via
   `writeAuthHeader()`. Buyer-facing proposal links are unaffected (items fetch degrades to
   catalog names on failure). Operator note: browsers unlocked before this deploy must sign out
   and re-enter the passcode. See BUILD_LOG 2026-07-16.
2. Correct `INTEGRATION_WIRING_BRIEF.md`, `CRM_CONNECTOR.md`, `.env.example`, and
   `AUTH_AND_ROLES.md` to reflect the real HubSpot-direct and 3-tier-passcode architecture. The
   `.env.example` gap in particular could cause someone to regress prod CRM to a dead path by
   innocently "resetting to defaults."
3. Delete or clearly mark dead code: `netlify/functions/crm.js` (Make proxy) and its mock dataset —
   nothing calls it, and its presence makes the architecture look more undecided than it is.
   **Fixed 2026-07-16** — `netlify/functions/crm.js` deleted. Its one remaining reference was the
   dead fallback branch in `src/lib/crm.js` (`CRM_BACKEND` values other than mock/hubspot routed
   to it); that branch was removed in the same pass, so non-mock now always means the direct
   HubSpot function. See BUILD_LOG 2026-07-16.
4. Add a small validation script (or extend an existing one) that diffs `catalog.json` SKU codes
   against `inventory.json` SKU codes and prints the mismatch — same discipline already applied to
   sales-history matching today, just not yet automated as a repeatable check.
5. **Proposal price-drift.** A sent proposal link reprices silently if `catalog.json` changes before
   the buyer reopens it — no freeze, no "price changed since you last viewed this" indicator. Cheapest
   fix: snapshot the quoted price at generation time and show a badge if the live price has since
   moved ("this price has changed since it was sent — showing current pricing"), rather than silently
   swapping the number. Doesn't require giving up live pricing, just surfacing when it moved.

**P1 — real gaps worth scheduling:**
6. **Fix name-source drift in Proposals and the Pricing tool.** Both still read `catalog.json`'s
   name field instead of `items.js` — the same bug `studio-director.js` had until today's fix,
   just not applied to these two siblings yet. Same pattern, same fix: join `items.js` for
   name/copy, `catalog.json` for price/specs.
   **Fixed 2026-07-16** — `proposals.js` (`flattenSkus`/`resolveSkus` + new `skuDisplayName`),
   `pricing-tool.jsx` (all four tabs), and a shared `lib/use-items-doc.js` hook; items.js name
   wins, catalog.json name is the fallback. See BUILD_LOG.
7. ~~Automate sale capture into history.js~~ — **struck, wrong premise.** Rick: forecasting is meant
   to run off quarterly sales reports as a batch tool, not live order entry. "Record sale" is a rep
   note-taking aid only ("what did this customer order last time"), not the forecast's data source.
   No fix needed here — this is working as intended, see §2 correction above.
8. Unify the two HubSpot read paths (`crm-hubspot.js` / `crm-summary.js`) into one function with two
   call sites, or at minimum document why they're separate — right now a HubSpot schema change means
   remembering to update both.
9. Pick one brand-kit consumption pattern (token layer vs. raw `getBrandKit()`) and migrate the
   other surface onto it — Proposals is the one without a fallback safety net today.

**P2 — lower urgency, real but not urgent:**
10. `images.json` staleness — pick one of the two options already on the table in `HANDOFF.md`
    (Cloudinary webhook auto-resync, or a "manifest last synced" indicator) rather than letting it
    sit as an open decision indefinitely.
11. Remove the dead duplicate `name`/blurb/`image` fields from `catalog.json`/`items-seed.json` once
    the Price List Creator schema work that touches them is scheduled anyway — not worth a
    standalone pass. Now three confirmed-dead fields, not one.
12. Automate BSE → kit sync (download-then-import is fine at one tenant; won't scale past a handful).

## Docs that need a correction pass (lower priority than the code fixes above, but real)

`INTEGRATION_WIRING_BRIEF.md`, `CRM_CONNECTOR.md`, `CONTENT_ENGINE_WIRING_SPEC.md` §4 (BSE-gating
and Import-button lines), `.env.example`, `AUTH_AND_ROLES.md` (still describes a single shared
passcode; the real system is a 3-tier server-side passcode with per-tenant admin credentials).
None of these are wrong about intent — they're wrong about current state, because they weren't
updated when the work shipped. Same category of problem `DATA_OWNERSHIP_MAP.md` had before this
session's earlier correction pass. `HOUSE_CONSOLE_SPEC.md` is the one exception found across the
whole audit — it accurately describes itself as partially built.

## Audit scope — closed out

All originally-named domains covered: CRM/HubSpot, Pricing/Inventory/Forecast, Brand Kit/BSE,
Media Hub/Content Engine, Product Catalog/Proposal Engine/Pricing Tool, Storefront/Campaigns
(confirmed correctly mock, no findings), Auth/Roles/House Console/tenant routing. 12 prioritized
fixes filed (P0: 5, P1: 4, P2: 3). Highest-priority item is the unauthenticated read-endpoint
finding in §8 — everything else in this audit is either a doc-drift correction or a UX/consistency
improvement; that one is an actual exposure.
