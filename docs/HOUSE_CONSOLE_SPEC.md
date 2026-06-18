# House Console — spec (the agency control plane)

**Written:** 2026-06-13 · From Rick's onboarding/management vision. **Status:** spec / not built.
**Companion docs:** `DATA_OWNERSHIP_MAP.md` (who owns what), `ASSET_LIBRARY_SPEC.md`, `BULK_TAG_TOOL_SPEC.md`.

## What this is

One **House Console** for CheeseShop TECH (house admin) to onboard clients, push data into their
apps, monitor everything, and move freely between clients and tools **without logging in and out**.
It is the *control plane*; each client's portal is the *tenant app*. The console operates ON tenant
data; it doesn't store its own.

## Decisions (locked 2026-06-13)

- **One app, not a generic twin.** The console is the *same components* rendered in the neutral house
  theme, with a **client selector**. "Generic app pointed at a client" = house mode + client picker.
  One codebase, two contexts (house vs tenant). No parallel unbranded app to keep in sync.
- **Terminology: SKU → "Item number"** everywhere (UI labels, docs). Item numbers come from the
  price list.
- **Data backbone = the price list.** Item data (item numbers, descriptions, pack, price) is
  *imported from a spreadsheet*, not hand-typed. The price list is the canonical product source.
- **Brand-first onboarding.** A new client gets the brand treatment first (brand kit), then data fills
  the themed frame, then apps connect. Order: brand → data → connect.
- **Role:** the console is house-admin. Product/items + media editing remain client-admin-capable on
  the tenant side (per DATA_OWNERSHIP_MAP); the house admin can do everything.

## The model

### 1. Console shell (signed in once as house admin)
- **Client selector** (top): "All clients" or pick one tenant.
- **Tool side-nav** (left): the selected client's tools — Dashboard · Brand Kit · Items & Pricing ·
  Media Hub · Campaigns · Proposals. Pick a client → every tool operates on their data. Flip between
  clients and tools freely; no re-login. (Generalizes the per-client dropdown the Brand Management
  page already has, to all tools.)
- Neutral **house theme** (terracotta/olive) so it's visually distinct from any tenant brand.

### 2. Master dashboard (when "All clients" is selected)
- Grid of **client cards** with health: brand-kit completeness, # items, # images (tagged/untagged),
  last price update, integration status. This is the monitoring view + the "impressive interface."
- Click a card → drills into that client's tools.

### 3. Ingestion gateways
- **Items importer** — upload a spreadsheet (.xlsx/.csv) → column-map → writes the selected client's
  item data (item number, descriptions, pack, price). Re-import = price-list updates. The backbone.
- **Bulk image upload / migration** — multi-file upload into the selected client's Cloudinary folder,
  with the usage-tagging step; plus the bulk-tag tool to backfill existing images
  (`BULK_TAG_TOOL_SPEC.md`).

### 4. Onboarding flow (brand-first checklist)
1. Create tenant + apply **brand kit** (brand treatment).
2. **Import price list** (items).
3. **Upload + tag images** (bulk).
4. **Flip live** (passcodes / domain).
A checklist tracks completeness per client; the dashboard surfaces what's missing.

## What exists vs. what's new

| Already built | New work |
|---|---|
| House hub + Agency console (tenants, integration health, data pipelines) | Client-selector + unified tool side-nav across ALL tools |
| Tenant switcher (`switchTenant`); Brand Management per-client dropdown | Spreadsheet → Items importer (column-map → tenant item data) |
| Per-tenant data (`brand-kit.json`, price list, `images.json`) | All-clients master dashboard with health cards |
| Media Hub (live), Pricing tool, Campaigns (mock) | Onboarding checklist/wizard |
| Role model (admin/client-admin/client) | SKU→Item-number rename pass |

## Build order (each piece independently shippable — avoids big-bang risk)

1. **Console shell** — client selector + unified tool side-nav (flip clients/tools, no re-login).
   Mostly wiring existing pieces; highest payoff, lowest new code.
2. **Items importer** — spreadsheet upload → tenant item data. Gives Item numbers.
3. **Bulk image upload + tagging** — folds in the bulk-tag tool.
4. **Onboarding checklist** — ties steps 1–3 into a repeatable client-onboarding flow.
5. **Campaigns** — deepens later with the HubSpot integration.

## Open questions (decide at build time)

- Items importer: fixed column template vs. flexible column-mapping UI? (Start fixed template matching
  the current price-list format; add mapping later.)
- Where item data is stored per tenant (the canonical price-list file/shape) — confirm against the
  existing Pricing tool's data source before the importer writes to it.
- Master dashboard health metrics: which 4–5 matter most for "is this client ready / healthy?"

## Guardrail

The console never becomes a second source of truth. It's a *lens + editor* over per-tenant data that
already has one home each (DATA_OWNERSHIP_MAP). Import writes to the canonical price list; edits write
to the canonical brand kit / Cloudinary. One home per fact, always.
