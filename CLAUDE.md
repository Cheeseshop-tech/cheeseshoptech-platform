# CheeseShop TECH — working memory

Persistent context for this project. Read this first; follow the pointers into `docs/` for detail.

## What CST is
A platform-powered, sales-led brand & growth partner for specialty/perishable food brands.
The multi-tenant portal platform is the moat; the service (sales + social + content) is the product.
First tenant: **Monti Trentini**. Canonical detail: `docs/POSITIONING.md`, `docs/CST_POSITIONING_BRIEF.md`.

## Remember

> **TRAP (2026-09-26) — "the commit button doesn't work" is almost always a stale
> `.git/index.lock`.** Symptom: a `COMMIT <FEATURE>.command` appears to run and nothing changes.
> HEAD doesn't move, the same files stay modified, and re-running does nothing. The real cause is
> a zero-byte `.git/index.lock` left behind by an earlier git process; every `git add` and
> `git commit` then dies instantly with `fatal: Unable to create '.git/index.lock': File exists.`
>
> **Claude's sandbox creates these and cannot clean them up.** A plain `git status` from
> `mcp__workspace__bash` takes the index lock, and the FUSE mount refuses the unlink
> (`Operation not permitted` — same limitation already noted in `.gitignore` for `_to_delete/`).
> So Claude leaves a lock it is unable to remove, and Rick's buttons silently fail from then on.
>
> **Fix:** Rick runs `rm "<repo>/.git/index.lock"` in Terminal, then re-runs the button.
> **Prevention:** Claude uses `git --no-optional-locks status` (and `log`, which never takes the
> lock) for every read-only check against the mounted repo. Never a bare `git status`.
>
> This cost an hour on 2026-09-25 and was invisible because `DEPLOY TO STAGING.command` reported
> success the whole time — see the next note.

> **TRAP (2026-09-26) — a commit button captures files when it RUNS, not when it is written.**
> The Netlify build of `63fe915` failed: `Could not load src/lib/lifecycles.js`. Claude wrote
> `COMMIT REP CARD.command`, then kept building in two files on its list; those files picked up an
> import of a new file that was NOT on the list. Rick ran the button, it shipped the two files
> without their dependency, and every local check passed — tests, lint, all of them read the
> working tree, and the working tree was not what shipped.
>
> **Rules, for every future COMMIT button:**
> 1. **Never edit a file named in a commit button Rick has not run yet.** If more work is needed in
>    those files, rewrite the button first, or wait until it has run.
> 2. **Every button runs `node scripts/check-imports.mjs --index` between `git add` and
>    `git commit`**, and stops on failure. It reads the STAGED tree from git, so a file that exists
>    on disk but was never added cannot satisfy an import. `DEPLOY TO STAGING` runs `--head`.
> 3. **Every button sets `set -o pipefail`.** `git commit ... | cat || stop` checks `cat`'s exit
>    status (always 0), so without pipefail a failed commit never stops the script. Every button
>    written before `COMMIT LIFECYCLES.command` had this bug.

**2026-09-26 — A script's exit code is not evidence the work shipped.**
`git push` with nothing to send prints "Everything up-to-date" and **exits 0**.
`DEPLOY TO STAGING.command` treated that as success and printed "Pushed. Netlify is building" —
a message identical to a real fifteen-commit deploy. On 2026-09-25 that masked a commit step that
had never run (stale index.lock, above): deploy was run four times, reported success four times,
and the work sat uncommitted throughout. Fixed 2026-09-26 (`6dad22f`): the script now counts
commits with `git rev-list --count`, lists uncommitted files before acting, and states plainly
when a dirty tree plus zero commits ahead means the commit step did not run. **Generalize this:
every button that reports success must assert the state it claims to have produced, not merely
that its last command exited 0.** The same class of bug as the inventory sync writing a canonical
file without validating it — a green exit 0 over a wrong result.

**2026-09-26 — The people spine exists. HubSpot is the organizer; CST owns the mirror.**
Five properties built by hand in the HubSpot UI and verified by API: Company `relationship` (4) ·
`outreach_stage` (7) · `territory` (10); Contact `contact_role` (5) · `territory` (10). Both
Territory lists are identical string-for-string — the rep→account join is a plain string match, so
a mismatch returns nothing rather than erroring. **Schema cannot be created by script:**
`crm.schemas.companies.write` / `crm.schemas.contacts.write` are not offered in this portal's
private-app scope picker, so `scripts/create-crm-properties.mjs` 403s and survives only as the
machine-readable definition; `CREATE CRM PROPERTIES.command` is retired and now explains why.
Two UI traps, both of which cost a rebuild: **an option's internal value is write-once** (renaming
the label never moves the stored value), and **the options table lives on the "Field type" tab
inside the editor** — clicking a property's name opens a read-only preview that looks broken.
The fields exist but are **unpopulated** — next step is marking `relationship` on the ~20 accounts
with real email traffic, before any screen reads them (guardrail 4). As-built spec:
`docs/HUBSPOT_PROPERTY_SPEC.md`. Contract: `docs/PEOPLE_DATA_OWNERSHIP.md`.

**2026-09-20 — Campaigns' Make webhook seam retired (never built, made redundant).**
`netlify/functions/campaigns.js` (`MAKE_CAMPAIGNS_WEBHOOK_URL`, `VITE_CAMPAIGNS_BACKEND=make`) is
gone. It was designed pre-`campaign-defs.js` (2026-06 era) to fetch campaign *definitions* from an
external Make.com scenario. That scenario was never built — Rick's Make account had zero
scenarios/connections/hooks when checked live — and the need it served (a write path for new
campaign definitions) has since been met more directly by the native in-app "+ New campaign" form
-> `campaign-defs.js` (Netlify Blobs, shipped 2026-08-21). Keeping both was a redundant,
unconfigurable second source of truth. Campaign definitions are now always: seeded in code
(`src/lib/campaigns.js`) + custom ones from the native write path — nothing else. If campaign
automation via Make (or another tool) is worth building later, treat it as a fresh seam, not a
revival of this one. Detail: `docs/INTEGRATION_WIRING_BRIEF.md`.

**2026-07-13 — Media Hub is the central media layer.**
We are building the Media Hub as the single home for all media, used for content creation and email
campaigns, and eventually social posts. The goal: **every asset is stored and organized once in
Cloudinary**, surfaced through the **Media Hub UI**, with "nerve endings" feeding the rest of the
platform — the **Content Engine**, the **Price List Creator**, and the **Product Catalog**, and
eventually the **ecommerce site**. Assets live once and are reused everywhere; nothing is duplicated
per surface. Detail: `docs/MEDIA_HUB.md`, `docs/CONTENT_ENGINE_WIRING_SPEC.md`,
`docs/INTEGRATION_WIRING_BRIEF.md`.

**2026-07-13 — Media Hub holds two asset classes.**
1. **Packshots** — must reflect **portion reality**: the image form matches the SKU description
   (whole wheel / 1/2 / 1/4 / 1/8 wheel / pre-cut / wedge / cylinder, etc.). For **processed
   formats — grated, flakes, shredded, diced — the packshot is the PACKAGE** (bag / tray / label),
   not a cheese form, because that is the portion reality the buyer receives.
   A **whole wheel shown with a cut wedge is acceptable for the whole-wheel SKU** — the slice is
   intentional, revealing the interior paste/texture of the cheese. Fill a gap from
   an existing hub image **only when the same cheese AND the same portion** already exists in
   hi-res; otherwise it must be shot. Tagged by SKU code + format.
2. **Story / social shots** — lifestyle, production, family, and brand-storytelling images used for
   content creation, email campaigns, and social posts. Not portion-bound; tagged by theme/brand,
   not required to match a SKU. The hub already holds ~198 such images (89 hi-res, 78 approved).

**2026-07-13 — Photo taxonomy + a series per product.** When the full product catalog is built out,
a product/SKU can carry a **series of photos**, classified by type: **pack shot** (portion-accurate
product or, for processed goods, the package) · **beauty shot** · **styled photo**. This means the
image model moves from today's *one image per SKU* (`imageForCode` takes the first match) to a
**type-tagged, ordered multi-image set per code** — a design item to fold into the catalog/media
build (see `docs/IMAGE_PIPELINE_SPEC.md`, `docs/ASSET_LIBRARY_SPEC.md`, `docs/MEDIA_HUB.md`).

> **TRIGGER (2026-08-15, corrected 2026-09-25) — read before touching `src/lib/images.js` or any
> SKU-image consumer.**
> `imageForCode`/`codeImageUrl` has **four** consumers, and they are NOT the four this note used
> to name. Verified 2026-09-25 by `grep -rn "imageForCode\|codeImageUrl" src/`:
> `proposal-builder.jsx:319` · `proposal-view.jsx:193,210,239,259` · `pricing-tool.jsx:247,248` ·
> `quote-builder.jsx:919`. Changing the return shape in place breaks all four in one deploy.
>
> **There are three SKU→photo resolution paths in production, not one.** The old claim that only
> `imageForCode()` resolves a SKU's photo is false; treat one-path as the TARGET, not the state:
> 1. `src/lib/images.js` — `imageForCode()` / `codeImageUrl()`, the intended choke point
> 2. `src/components/catalog/buyer-catalog.jsx:96` — builds its own code→images map inline
> 3. `src/lib/studio-director.js:18` — resolves via `pickAsset()` from `media.js` instead
> Consolidating 2 and 3 onto 1 is the real prerequisite for the typed-series migration below.
>
> That migration (expand → adapter → contract, `docs/IMAGE_PIPELINE_SPEC.md` § "Migration plan")
> is **planned, 0% executed** — that spec's own header still reads "(not started)" and no
> `imagesForCode` or typed-series API exists. Do not read it as in-flight. Rick's Cloudinary
> type-tagging pass can still run now, ahead of any code change.

**Ownership (Rick is driving the manual pass):**
- Rick will **put item numbers on all product-catalog shots** — this tags existing hub images to
  their codes and is the starting point for the catalog.
- Rick will **request the missing images and replacements for the poor-quality photos.**

**2026-08-03 — Campaign pill-nav + campaign lifecycle dashboard, BUILT.**
The Campaigns tab is now a pill sub-nav by campaign type, driven by `CAMPAIGN_TYPES` in
`src/lib/campaigns.js` (add an entry there and the nav grows). Each campaign opens a lifecycle
dashboard: launch-readiness checklist, strategy, content, target prospects, results.
**The checklist is a real gate** — `canAdvanceTo()` blocks every status at or past `ready` until
all required tasks are done, so status is a fact rather than a label.
**The architectural split to preserve:** campaign *definitions* are seeded in `src/lib/campaigns.js`
and versioned with the code; campaign *state* (status, checklist ticks, custom/hidden tasks,
results) lives in Netlify Blobs via `netlify/functions/campaign-state.js`. That mirrors the CRM
tab's accounts-from-HubSpot vs outreach-state-from-Blobs split, for the same reason: these ticks
are the real send gate, so they must be shared and survive any browser. Never localStorage.
Rick's four decisions: Enrichment is **its own pill with its own lifecycle** (the Fall Tasting
runbook scopes the 94-contact phone pass out of that campaign as "a separate initiative"; email
campaigns reference it via `dependsOn`) · checklist **template seeds, then editable per campaign** ·
writes take the **same admin passcode gate** as CRM writes · strategy docs are **linked, not pasted**
(one source of truth in the client project folder).
Detail, seeded campaigns, and known limits: `docs/HANDOFF_2026-08-03_campaign-pill-nav-and-email-lifecycle.md`.

**2026-09-17 — Cut & Wrap / 7 oz Pre-Cut: a whole wheel is never a compliant packshot.**
Sharpens the general portion-reality rule above into an explicit, checkable one for this category:
a Cut & Wrap 7 oz SKU's packshot must show a **wrapped, labeled cut piece** — the actual retail
unit — never a whole wheel, even with an unwrapped wedge propped next to it (that wedge isn't what
ships). Reference for "compliant": `monti/01101`. First audit against this rule (2026-09-17) found
8 of 19 compliant, 7 non-compliant (whole-wheel or unwrapped shots — 01190, 03044, 04165, 04182,
04211, 05091, 01174), 4 missing entirely (40086, 40184, 03073, 05600). **Shipped same day:** all 7
non-compliant SKUs' images unlinked from the Catalog (sku cleared, `product-catalog` tag dropped —
files untouched in Cloudinary). Real replacement photography for all 11 affected SKUs is still
open. Full findings: `docs/CUT_AND_WRAP_PORTION_RULE_2026-09-17.md`.

**2026-09-18 — Weekly improvement review publishes to the house Command Center on its own.**
The `weekly-improvement-review` scheduled task used to only ever produce a chat transcript —
useful once, gone a week later. It now also writes `src/data/cst/improvement-review.json` and
runs `scripts/publish-improvement-review.mjs`, which POSTs it (via `AGENT_GATE_PASSCODE`, same
credential as every other unattended write) to the new `improvement-review.js` function → Netlify
Blobs → the Agency Console's "Weekly improvement review" panel, same no-rebuild pattern as
market-news/inventory. Code shipped 2026-09-18; **LIVE since 2026-09-18 23:27**, when
`scripts/.improvement-review-publish.json` was created. It has run every Friday since and
committed a run on 2026-09-25 (`8adf706`) — this note previously said "inert until Rick creates
the sidecar," which was true for about six hours and wrong for a week. Full wiring:
`docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md` (its "open step" to create the sidecar is
likewise stale).

> **Caveat, 2026-09-25:** this task's shelf-life numbers assume `inventory.json` is kept current
> by the daily `monti-inventory-watch` task. Verify that assumption still holds before trusting
> its expired/urgent/at-risk counts — a stale inventory file produces a confident, wrong review
> with a green exit 0.

**2026-09-17 — `AGENT_GATE_PASSCODE`: a dedicated write/read credential for automation.** The old
shared `PORTAL_*` passcodes are retired (env vars deleted 2026-08-17; the live login screen is now
Identity email/password only) — but that left scripts/agents (no browser, no Identity session) with
zero way to authenticate to any function. `_write-guard.js`'s `requireWriteAuth()`/
`requireReadAuth()` now also accept `AGENT_GATE_PASSCODE` (own env var, tenant-agnostic "admin"
tier, works across every tenant since one shared guard covers the whole platform). Value lives only
in Netlify's env vars — never commit it.

**2026-07-19 — Luxury DTC design research ported in; this is where the template architecture
came from.** A separate, non-CST Claude Project has been doing competitive design research for
a luxury DTC cheese brand concept ("Posada & Co." / "the Super Site" — blog + test kitchen +
classroom + podcast + influencer feel). Rick's own framing (2026-07-19): *"it boils down to the
rotating brand ecom site working as a sales campaign engine for cheese brands... this is where
the template architecture came from."* i.e. the Content Studio's slot/token/paint template
engine (`TEMPLATE_ENGINE_SPEC.md`) traces back to this concept — one reskinnable storefront
template per brand, run as a sales campaign engine — which also matches CST's own positioning
(`POSITIONING.md`: sales-led growth via coordinated campaigns, storefront as deliverable not the
business). **Still a live architectural option to build toward, not a locked feature or a
committed tenant** — kept in play as CST builds. One confirmed decision so far: the **Fortnum &
Mason Cave Aged Cheddar Wedge PDP** is the goal reference for product-page layout (sticky hero
image, breathable info rail, accordion sections, no parallax). Detail:
`docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md`.

## Conventions
- **Client-side data requests are routed by function, not by personal name** —
  Marketing (images/email), Sales Management (pricing), Inventory Manager (item master +
  availability), Traffic (inbound/outbound shipments). Canonical: `docs/CLIENT_DATA_ROLES.md`.
- Image spec: 2000 px min short edge, white/transparent bg, one image per item number, tagged with
  the item code. Cloudinary hosts hi-res only. Detail: `docs/IMAGE_HEALTH_2026-07-09.md`.
- Product ID + image resolution: `catalog.json`'s active SKU list is the item-number source of
  truth today; a Cloudinary asset's `code`/`sku` context field is the join key for photos AND
  spec sheets; `kind` (`"image"` vs `"document"`) comes from Cloudinary's resource type, never a
  tag. `imageForCode()`/`codeImageUrl()` (`src/lib/images.js`) is the resolver you should USE and
  the one everything should eventually route through — but as of 2026-09-25 it is not the only one
  in production (buyer-catalog and studio-director each resolve their own way; see the TRIGGER
  block above). Add no fourth path. Full rule + the 2026-09-18 spec-sheets-as-product-photos bug +
  fix: `docs/PRODUCT_ID_AND_IMAGE_TRUTH_2026-09-18.md`.

## Task routing

However you got here — a fresh session, a different one of Rick's parallel sessions, or a cold
read of this file — match the task to a row, then read its docs *before* touching code. Replaces
the old flat "Key docs index"; nothing below was dropped, it's just triaged now.

| Task type | Trigger | Start here |
|---|---|---|
| **Incident / crash response** | crash, down, "something went wrong", error boundary | Newest `docs/POSTMORTEM_*.md` / `docs/INCIDENT_*.md` · `eslint.config.js` is the `prebuild` lint gate (added 2026-09-18, catches the free-variable class of bug that caused the last one) · Sentry: browser confirmed live 2026-09-18, functions `SENTRY_DSN` — re-verify, it drifted once already |
| **Product identity / catalog integrity** | SKU, item number, catalog, naming, "is this a real code" | `docs/PRODUCT_ID_AND_IMAGE_TRUTH_2026-09-18.md`, `docs/PRODUCT_NAMING_STANDARD_2026-09-18.md`, `docs/GAP_LISTS_2026-09-18.md` — run `npm run validate:items` before creating any code, tag, or item record anywhere |
| **Media Hub / packshot & spec-sheet work** | photo, image, packshot, spec sheet, Cloudinary | `docs/MEDIA_HUB.md`, `docs/ASSET_LIBRARY_SPEC.md`, `docs/IMAGE_PIPELINE_SPEC.md`, `docs/CUT_AND_WRAP_PORTION_RULE_2026-09-17.md` — write path is the Media Hub UI only, never a direct Cloudinary API/MCP call |
| **Client data request (Monti / Stefano)** | ask Monti, need from client, spec sheets | Newest `docs/CLIENT_DATA_REQUEST_*.md` · roles: `docs/CLIENT_DATA_ROLES.md` · open asks: `docs/CLIENT_DATA_REQUESTS_2026-07-09.md`, `docs/MARKETING_IMAGE_REQUEST_2026-07-13.md` |
| **Campaigns** | campaign, pill-nav, email lifecycle, enrichment | `docs/HANDOFF_2026-08-03_campaign-pill-nav-and-email-lifecycle.md`, `src/lib/campaigns.js` |
| **Picking up prior work** | continue, pick up, resume, "where did we leave off" | Newest `docs/HANDOFF_*.md` by date, then `docs/PROJECT_STATUS.md` + `docs/BACKLOG.md` |
| **Shipping a change** | ship, deploy, commit | Root `COMMIT <FEATURE>.command` — every change gets one · `npm run build` is now lint-gated |

Reference, not a routing target — external and not a committed tenant:
`docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md`.
