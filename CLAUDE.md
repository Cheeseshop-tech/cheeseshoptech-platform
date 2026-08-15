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

## Key docs index
- Status / definition of done: `docs/PROJECT_STATUS.md` · backlog: `docs/BACKLOG.md`
- Open client data to retrieve: `docs/CLIENT_DATA_REQUESTS_2026-07-09.md`
- Marketing photo request: `docs/MARKETING_IMAGE_REQUEST_2026-07-13.md` (+ `.csv`)
- Luxury DTC design research, external/not-a-tenant: `docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md`
- Campaign pill-nav + campaign lifecycle dashboard (built 2026-08-03): `docs/HANDOFF_2026-08-03_campaign-pill-nav-and-email-lifecycle.md`
