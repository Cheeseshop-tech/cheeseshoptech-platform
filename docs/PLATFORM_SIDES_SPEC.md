# Platform sides — CST Agency side vs Client side

**Status:** Spec (2026-07-02, Rick). The dividing line for every app, page, and data store.
**Correction on record:** onboarding tools live on the **CST side** (not client side).
**Reads with:** `HOUSE_CONSOLE_SPEC.md` · `DATA_OWNERSHIP_MAP.md` · `CONTENT_ENGINE_WIRING_SPEC.md` ·
`ADMIN_DASHBOARDS_SPEC.md`.

---

## 1. The line, in one breath

**CST side = the factory.** Template client-build apps + onboarding tools — how a new client gets
stood up and how the house operates all of them. House IP; never transferred at buyout.

**Client side = the product.** Functional apps loaded with THAT client's proprietary data and
brand system. What a tenant sees, uses, and (at buyout) can take as a single-tenant fork.

The conveyor between the two: **the CST side FILLS what the client side READS.** Onboarding is
the act of loading a client's data/brand into the template apps until they're functional.

## 2. CST Agency side (house view, terracotta, admin roles)

**Template client-build apps** (build once, clone per client):
- **Template builder / Slot Composer** — house-only visual template authoring (SLOT_COMPOSER_SPEC);
  emits the shared tokenized manifests every tenant's Studio renders. Templates = house IP.
- **Brand Kits** — per-client kit worksheets; the paint every renderer reads.
- **Brand Systems Engine** — Guide · Voice · Design disciplines; kit JSON out (the conveyor).
- **Theme Engine registers** (5) — platform-shared, painted per kit.
- **`_template.json` client config** — the clone: tools, modules, home block per tenant, zero code.
- **House Console / Agency Console** — client selector, integration health (SEAMS), pipelines,
  cross-tenant CRM snapshot; flip client + tool with no re-login.

**Onboarding tools (CST side — the new-client-in-X-steps flow):**
1. **Brand kit upload/import** — BSE kit JSON or worksheet → tenant `brand-kit.json`. (Page exists;
   import button = gap #1 in CONTENT_ENGINE_WIRING_SPEC §4.)
2. **Product item-code importer** — price-list spreadsheet → tenant catalog/items (Item numbers,
   case packs). (Spec'd: House Console build order #2.)
3. **Bulk image upload + tagging** — Cloudinary folder per tenant, 12-tag usage taxonomy,
   SKU-linking. (Spec'd: BULK_TAG_TOOL_SPEC; fixes the 104-untagged backlog pattern per client.)
4. **Branded blank templates into the Content Engine** — apply the kit to the shared manifests so
   the client's Studio opens with on-brand blanks on day one (tokens make this automatic; the
   onboarding step is just verification + picking which template families the client gets).
5. **Config clone** — copy `_template.json`, set subdomain/colors/tools/quota, validate, deploy.

Checklist UI tying 1–5 together = House Console build order #4.

## 3. Client side (tenant view, their brand, client/client-admin roles)

Functional apps + THEIR data + THEIR brand system:

| App | Proprietary data inside |
|---|---|
| Dashboard (Priority window · Operations · At a glance) | their attention items, CRM, campaigns, news |
| Pricing & Inventory | their catalog, price list, lots, commitments |
| CRM | their HubSpot (contacts/companies/channels) |
| Trade Portal | their buyer deck |
| Campaigns | their campaign data |
| Orders | their storefront orders |
| Content Engine (Studio · Library · Media Hub) | their photography, their voice, their kit paint, their finished pieces |
| Image Catalog | their buyer-facing product images |
| Storefront | their shop |

Rule of thumb: a client-side app never contains house logic it can't take in a fork; a CST-side
app never contains client data it can't swap by switching tenants.

## 4. "All apps live and communicating" — wiring board

The SEAMS panel (agency-console) is the live version of this table. Priority order to go
live/communicating (each is independently shippable):

| # | Wire | Status | Next action |
|---|---|---|---|
| 1 | Media Hub ↔ Cloudinary | **LIVE** | — |
| 2 | CRM ← HubSpot (companies/contacts) | **LIVE** (read-only; deals empty on purpose) | verify `VITE_CRM_BACKEND=hubspot` deploy landed |
| 3 | Opportunities ← signals × CRM × kit | LIVE on mixed (real accounts, sample signals) | Slice 4: one real signal feed |
| 4 | Market News | mock | overnight research task → `market-news.json` |
| 5 | Priority window ← mailbox | mock (`VITE_ATTENTION_BACKEND`) | **gated on sending-address decision**, then `attention-list` function |
| 6 | Brand Kit ← BSE kit JSON | manual | import button on Brand Kits page (gap #1) |
| 7 | Content Studio ← Studio Director | not built | Stage 0 deterministic auto-fill (CONTENT_ENGINE_WIRING_SPEC §3) |
| 8 | Campaigns ← HubSpot | mock | needs data source + strategy |
| 9 | Storefront ← Shopify | mock | needs real store + tokens |
| 10 | Pipeline/deals ← HubSpot | deliberately off | when deal-stage tracking is real in HubSpot |

Intelligence layer on top (already spec'd): Opportunity Engine fuses 2+3+4; Studio Director (7)
consumes its output and the kit — that's "sharing info" done as architecture, not integrations
for their own sake.

## 5. One address

`cheeseshoptech.com` = the single point of reference (DOMAIN_CONSOLIDATION_RUNBOOK): apex
coming-soon + Sign in → house Command Center (CST side); `<client>.cheeseshoptech.com` → that
client's portal (client side). Same site, same codebase, two faces — tokens + role + subdomain
decide which one you're on.
