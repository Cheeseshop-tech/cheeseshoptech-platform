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

**Ownership (Rick is driving the manual pass):**
- Rick will **put item numbers on all product-catalog shots** — this tags existing hub images to
  their codes and is the starting point for the catalog.
- Rick will **request the missing images and replacements for the poor-quality photos.**

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
