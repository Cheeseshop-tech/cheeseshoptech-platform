# Admin Dashboards, Roles & Proposal Engine — Spec

**Written:** 2026-06-12 · **Status:** approved concept, awaiting build prioritization · **Feeds:** `DEVELOPMENT_PLAN.md` Phase F
**Decisions captured from Rick:** proposal engine serves **both tiers from day one** · house dashboard v1 = **tenant management + integration health + data pipelines** · roles **built now on the existing role system** (don't wait for Clerk) · content engine = **HubSpot plugin** · media storage strategy required (§6).

## 1. Concept (locked, 2026-06-12)

CheeseShop TECH is the platform. It hosts clients' main e-commerce sites and extends its
infrastructure and data-management systems to clients through password-gated access and
per-client customized UIs (tokens + content only — never per-client code). CheeseShop TECH
manages the data, the connectivity, and the functional software — connected apps both
third-party and proprietary. A proposal engine turns platform data into branded sales
documents for both tiers.

## 2. Roles & permissions

Built now on the existing role system (`rolesOf()` / `RoleGate`); Clerk later maps these
same roles to real per-user accounts — the spec doesn't change, only the authenticator.

| Capability | CST admin (house) | Client admin | Client user | Collaborator (pr/influencer/creator) |
|---|---|---|---|---|
| Cross-tenant switcher + house Command Center | ✓ | — | — | — |
| Tenant config (brand, modules, tools, decks) | ✓ | request only | — | — |
| Integration wiring (secrets, webhooks, backends) | ✓ | — | — | — |
| Storefront admin (products, orders back-office) | ✓ | ✓ | view | — |
| Media: upload / organize / approve | ✓ | ✓ | view + download | upload to inbox only |
| Catalog: edit titles, codes, descriptions | ✓ | ✓ | view | — |
| Presentations: manage decks | ✓ | ✓ | present | — |
| Proposal engine: create/send | ✓ (house brand) | ✓ (tenant brand) | — | — |
| CRM / campaigns | ✓ | ✓ | view | — |
| Pricing tool (quotes, commitments) | ✓ | ✓ | ✓ | — |

**Passcode-era mechanics (pilot):** tenant passcode → `client` role (today's behavior); a
second per-tenant **admin passcode** (`PORTAL_ADMIN_PASSCODE_<id>`) → `client-admin` role;
`?app=1` house passcode → `admin`. One function (`gate.js`) handles all three. Clerk
replaces the gate at client #2; roles persist unchanged.

## 3. CST admin dashboard (house Command Center v2)

Priority order per Rick. Today's command-center rollup stays as the landing view.

**P0 — Tenant management.** Tenant list with status (live/onboarding/paused); per-tenant
detail: brand tokens preview, enabled modules/tools, deck list, URLs (portal, storefront,
share links); "new tenant" flow = guided config creation (validates against
`client.schema.json`) — config-only onboarding proves the agency model.

**P0 — Integration health.** Per tenant × per seam (CRM/Make, Shopify, Campaigns,
Cloudinary): mode (mock vs live), last successful call, env-var presence (named, never
values), one-click test ping per connector. Surfaces "what's wired vs what's mocked" —
today that answer lives only in HANDOFF.md.

**P0 — Data pipelines.** Per tenant: canonical data sources (price list → catalog/
inventory/commitments), last-updated dates, row/SKU counts, staleness warnings (e.g.
inventory > 14 days old), link to re-run adapter instructions. Sample-tracking surfaced
here when CRM is live (sample-sent date / feedback / follow-up — sacred, never guessed).

**P1.** Storage & media panel (per-tenant Cloudinary usage, credit burn, last archive
backup — see §6) · proposal-engine entry point · cross-tenant activity feed.

**P2.** Billing/engagement tracking (needs `PRICING_AND_ENGAGEMENT_MODEL.md` filled in) ·
deploy status (Netlify API).

## 4. Client admin dashboard

The client admin is the customer-side operator (e.g. the client's team). Their dashboard =
today's Operations Portal hub plus a **Manage** layer:

- **Content manager:** media upload + organize (Media hub, exists), approve collaborator
  uploads (inbox → library), catalog metadata editing — port the parked edit/export
  feature from the standalone catalog app; edits flow back to the canonical data layer.
- **Storefront back-office:** products on/off, price display rules, order list (admin
  seam exists behind the `admin` tool flag).
- **Presentations manager:** reorder/replace deck slides (config-driven; v1 = request to
  CST, v2 = self-serve upload).
- **Proposal engine** (§5): build buyer proposals from their own live data.
- **CRM + campaigns:** pipeline view (HubSpot), campaign status. Content engine runs as a
  **HubSpot plugin** — campaigns/content authored and sent in HubSpot; the portal shows
  status/results via the existing `campaigns` seam (Make scenario). No proprietary
  content-authoring tool.
- Client **users** see the same portal minus the Manage layer (use-only: quote, present,
  browse, download).

## 5. Proposal engine (both tiers, one engine)

One generic engine; the tier only changes whose brand tokens and whose data feed it.

| | House tier | Client tier |
|---|---|---|
| Author | CST admin | Client admin |
| Audience | Prospective clients | Their buyers (distributors, chains — e.g. HEB) |
| Brand | CheeseShop TECH | Tenant (e.g. Monti) |
| Data | Platform capabilities, pricing/engagement model | Canonical catalog + pricing + media + decks |
| Example | "Your brand on this platform" pitch | HEB-style proposal deck + custom price list |

**V1 scope:** template-driven proposal = cover + story slides (reuses the Presentations
viewer) + product/price section generated from the canonical data layer (reuses
pricing-core; Custom Price List Creator stays the source of truth) + media pulled from the
tenant's Cloudinary folder. Output: shareable passcode-gated portal link
(`?page=proposal&key=<id>`) + print/PDF. The HEB v7 deck is the reference template.
**Not in v1:** e-signature, proposal analytics, CPQ-style approval chains.

## 6. Media storage & backup strategy (Rick's question)

Video + full-res photography will be extensive; Cloudinary alone gets expensive and is
not an archive. **Three-layer strategy — each layer does the one job it's cheap at:**

| Layer | Job | Tool | Cost shape |
|---|---|---|---|
| **Delivery** | Web-ready images, on-the-fly transforms (f_auto/q_auto), CDN | **Cloudinary** (stays) | Credits — keep only web derivatives here |
| **Archive / source of truth** | Original masters: RAW photos, full-res video, PSDs | **Cloudflare R2** or **Backblaze B2** (S3-compatible object storage) | ~$6–15/TB/month, no/low egress — TBs cost dollars |
| **Video delivery** | Streaming marketing/product video | **Cloudflare Stream** or unlisted **Vimeo** (pilot) — not Cloudinary video | Flat/cheap; Cloudinary video credits burn fastest |

**Rules.** Originals land in the archive bucket first (`<tenant>/<category>/...` — same
folder convention as Cloudinary); only web-ready derivatives go to Cloudinary; video
files never live in Cloudinary. Backup discipline = 3-2-1: archive bucket + Rick's local
drive + Cloudinary derivatives. Per-tenant prefixes keep client data separable
(deliverable to the client if they ever leave — an agency selling point).
**Automation later:** upload script pushes to both layers in one step (extends the
existing `upload_to_cloudinary.py`); house dashboard's Storage panel (§3 P1) shows usage
+ last-backup per tenant. **Pilot action:** create one R2/B2 bucket now, before the Monti
photography lands — moving masters later is the expensive part.

## 7. Acceptance criteria (v1, condensed)

- [ ] House admin sees every tenant's mode (mock/live) per integration without opening code or docs
- [ ] A new tenant can be onboarded by config alone from the tenant manager (validated, no code)
- [ ] Data staleness (price list / inventory age) is visible per tenant with a warning state
- [ ] Client admin can edit catalog metadata and it persists to the canonical data layer
- [ ] Client admin passcode unlocks Manage features; client user passcode does not
- [ ] A proposal can be assembled from templates + live tenant data and shared as a gated link in under 30 minutes
- [ ] Monti photography masters exist in the archive bucket and web derivatives in Cloudinary, with the folder conventions documented

## 8. Open questions

- **(Rick)** R2 vs B2 — R2 wins if we ever serve straight from the archive (no egress fees, same Cloudflare account as DNS/SSL); B2 is slightly cheaper at rest. Recommend **R2** for one-vendor simplicity.
- **(Rick/client)** Who at Monti gets the client-admin passcode at pilot?
- **(Claude, build-time)** Proposal share links: reuse passcode gate or per-proposal keys? Leaning per-proposal keys (one URL per buyer, revocable).
- **(Rick)** HubSpot free-tier limits on marketing email — confirm the content engine's send volume fits, or budget for Marketing Hub Starter.

## 9. Phasing → DEVELOPMENT_PLAN.md

**F1** roles (admin passcode tier) + client-admin Manage gating · **F2** house dashboard
P0 panels (tenant mgmt, integration health, data pipelines) · **F3** client content
manager (catalog edits port) · **F4** proposal engine v1 · **F5** storage automation +
Storage panel. F1–F2 before client #2 conversations; F4 whenever the next real proposal
(buyer or prospect) is needed — it pays for itself on first use.
