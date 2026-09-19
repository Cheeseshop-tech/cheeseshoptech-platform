# CheeseShop TECH — working memory

Persistent context for this project. Read this first; follow the pointers into `docs/` for detail.

## What CST is
A platform-powered, sales-led brand & growth partner for specialty/perishable food brands.
The multi-tenant portal platform is the moat; the service (sales + social + content) is the product.
First tenant: **Monti Trentini**. Canonical detail: `docs/POSITIONING.md`, `docs/CST_POSITIONING_BRIEF.md`.

## Remember

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

> **TRIGGER (2026-08-15) — read before touching `src/lib/images.js` or any SKU-image consumer.**
> `imageForCode` has four consumers (Catalog, Proposals, Pricing, Studio Director). Changing its
> return shape in place breaks all four in one deploy. The migration is planned expand → adapter →
> contract in `docs/IMAGE_PIPELINE_SPEC.md` § "Migration plan — one image per code → typed, ordered
> series"; backlog item under **Next**. Rick's Cloudinary type-tagging pass can run now, ahead of
> any code change.

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
  tag, and only `imageForCode()`/`codeImageUrl()` (`src/lib/images.js`) should ever resolve "the
  photo for this SKU." Full rule + the 2026-09-18 spec-sheets-as-product-photos bug + fix:
  `docs/PRODUCT_ID_AND_IMAGE_TRUTH_2026-09-18.md`.

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
