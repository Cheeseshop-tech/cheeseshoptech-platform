# Data Ownership Map — one authoring home per fact

**Written:** 2026-06-13 · From Rick's "things are backwards" observation (Catalog has data-entry,
Media Hub doesn't). **Amended 2026-07-15** to match the 2026-07-03 decision recorded in
`src/lib/items.js`'s own header: item identity + copy moved into Media Hub. The section below was
never updated when that shipped — this pass corrects it. The rule that keeps the platform coherent
as it scales still holds: **every fact has exactly one authoring home; every other surface
references it by a stable key.** Two edit boxes for the same fact is how data drifts.

## The three data domains

| Domain | What it holds | Authoring home | Who edits | Consumed by (read-only) |
|---|---|---|---|---|
| **Product identity + copy** | SKU: item number, name, pack, weight, UPC, milk type, min age, short + long description, certification — **no pricing** | **Media Hub** (`items.js` / `items.json`, per-tenant, Cloudinary-backed) | admin + client-admin | Product Catalog, Content Studio (Studio Director), Media Hub itself |
| **Pricing** | SKU price, case pack, freight/fee tiers, inventory lots, commitments | Price List Creator (`catalog.json` / `pricing.js`, canonical per-tenant) | **client-admin + house admin** | Pricing tool, Proposals, Content Studio (price/specs only) |
| **Brand** | voice, story blocks, identity, colors, type | Brand Kit (`brand-kit.json`, Brand Management page) | **house admin only** (CST orchestration = the monthly-fee value) | Portal theming, Proposals, Content Studio |
| **Asset** | the image/video file + name, usage tags, alt/description, the SKU it depicts, approval state | **Media Hub** (live Cloudinary backend, `media.js`/`images.js`) | admin + client | Catalog, Proposals, Pricing, Content Studio pull images by reference |

**Known open duplication (tracked, not fixed by this amendment):** `catalog.json` and the
generated `items-seed.json` each still carry their own `name`/marketing-blurb fields for the same
SKU — a leftover from before the items.js split. `pickProducts()` in `studio-director.js` now
prefers the `items.js` name and only falls back to catalog.json's for SKUs not yet entered in the
items doc (2026-07-15). The catalog.json/items-seed.json fields themselves are still there and
still editable — removing them is a larger follow-on (touches the Price List Creator's schema),
logged in `AGENT_A1_BUILD_SPEC.md` §6, not resolved here.

**Role rationale (Rick, 2026-06-13):** product data is the *client's own product knowledge*, so the
Product admin is **client-admin** access (house admin can do everything). Brand stays **house-only** —
that's the CST orchestration clients pay for. This mirrors the business model: clients own
manufacturing + sales; CST owns the brand. Consistent with F3 (catalog editing already client-admin)
and Proposals (`["admin","client-admin"]`).

A product has **one** description and **many** photos — so product copy can never live on an image.
It lives with the SKU. Photos live in the Media Hub. They meet at the SKU.

## The join key: SKU

```
Asset (Media Hub, images.js/media.js)      Item data (Media Hub, items.js)      Pricing (price list)
  publicId, usage, approval                  sku ── name, pack, weight, UPC,      catalog.json
  sku: <code>  ─────────► matches ◄───────── short/long desc, cert                  price, specs
                                    ▲                                    ▲
                                    └──────────────── matches ───────────┘
                        Product Catalog / Content Studio render DATA + IMAGE + PRICE together
```

Item identity + copy and the asset record now live in the *same system* (Media Hub) — the join
that used to cross from Media Hub to the price list for copy now only crosses for price. Nothing
is stored twice **by design**; see the known duplication note above for what hasn't caught up yet.
Add a tenant → new brand kit + item doc + asset folder, same surfaces. Add 5,000 photos or 500
SKUs → same model, no restructuring. That is the scale property.

## What this means for the current surfaces

- **Media Hub = the asset control plane AND the item-copy authoring home.** It must let you edit
  an existing asset (rename, re-tag usage, set alt text, link a SKU, set approval) and edit an
  item's identity/copy record — both true today.
- **Product short/long descriptions are Media Hub data, authored in the items panel — not the
  price list.** The Catalog and Content Studio both read them read-only, by SKU, from `items.js`.
  The price list only holds price, case pack, and inventory.
- **Brand stays in the Brand Kit** (already true).

## Build sequence

1. **READ** — `media-list` Netlify function (DONE, commit a969560): lists real Cloudinary assets,
   maps tags → usage + approval.
2. **WRITE** — `media-update` Netlify function (DONE): server-side Cloudinary Admin API update of
   an asset's tags (approval + usage) and context (caption/sku/alt). Media Hub asset dialog has an
   Edit mode.
3. **DONE (2026-07-03)** — item identity + copy authoring shipped as `items.js`/`items.json` inside
   Media Hub (items-get/items-save Netlify functions); Product Catalog reads it read-only
   (`buyer-catalog.jsx`). **Remaining:** Content Studio's `pickProducts()` was wired onto the same
   `items.js` source 2026-07-15 (previously read catalog.json's own `name` field — see duplication
   note above); `catalog.json`/`items-seed.json` still carry unused duplicate name/blurb fields,
   not yet removed.

## Guardrail

Before adding any new edit field anywhere, ask: *which domain owns this fact, and does it already have
a home?* If yes, reference it — don't add a second editor.
