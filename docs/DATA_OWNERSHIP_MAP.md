# Data Ownership Map — one authoring home per fact

**Written:** 2026-06-13 · From Rick's "things are backwards" observation (Catalog has data-entry,
Media Hub doesn't). The rule that keeps the platform coherent as it scales: **every fact has exactly
one authoring home; every other surface references it by a stable key.** Two edit boxes for the same
fact is how data drifts.

## The three data domains

| Domain | What it holds | Authoring home | Who edits | Consumed by (read-only) |
|---|---|---|---|---|
| **Product** | SKU: code, name, short + long description, pack, specs, price | Product / price-list admin (canonical SKU source) | **client-admin + house admin** | Product Catalog, Proposals, Pricing |
| **Brand** | voice, story blocks, identity, colors, type | Brand Kit (`brand-kit.json`, Brand Management page) | **house admin only** (CST orchestration = the monthly-fee value) | Portal theming, Proposals |
| **Asset** | the image/video file + name, usage tags, alt/description, the SKU it depicts, approval state | **Media Hub** (live Cloudinary backend) | admin + client | Catalog, Proposals, Pricing pull images by reference |

**Role rationale (Rick, 2026-06-13):** product data is the *client's own product knowledge*, so the
Product admin is **client-admin** access (house admin can do everything). Brand stays **house-only** —
that's the CST orchestration clients pay for. This mirrors the business model: clients own
manufacturing + sales; CST owns the brand. Consistent with F3 (catalog editing already client-admin)
and Proposals (`["admin","client-admin"]`).

A product has **one** description and **many** photos — so product copy can never live on an image.
It lives with the SKU. Photos live in the Media Hub. They meet at the SKU.

## The join key: SKU

```
Asset (Media Hub)            Product data (price list)
  publicId                     code (SKU) ── name, short/long desc, pack, specs, price
  usage: [product-catalog]
  sku: <code>  ───────────────► matches ──► Product Catalog renders DATA + IMAGE together
  alt, approval                              (image resolved via the manifest, lib/images.js)
```

Nothing is stored twice. Add a tenant → new brand kit + product list + asset folder, same surfaces.
Add 5,000 photos or 500 SKUs → same model, no restructuring. That is the scale property.

## What this means for the current surfaces

- **Media Hub = the asset control plane** (entry + dispatch + EDIT). It must let you edit an existing
  asset, not just upload one: rename, re-tag usage, set alt text, link a SKU, set approval.
- **Product short/long descriptions are PRODUCT data — do NOT add them to the Media Hub.** They belong
  with the SKU. The Catalog editing them today is an interim; long-term, product-data authoring moves to
  the product/price-list admin and the **Catalog becomes a pure view**.
- **Brand stays in the Brand Kit** (already true).

## Build sequence

1. **READ** — `media-list` Netlify function (DONE, commit a969560): lists real Cloudinary assets,
   maps tags → usage + approval.
2. **WRITE** — `media-update` Netlify function (THIS build): server-side Cloudinary Admin API update of
   an asset's tags (approval + usage) and context (caption/sku/alt). Same secret-safe pattern, reuses
   the existing `CLOUDINARY_*` env (no new secrets). Media Hub asset dialog gains an Edit mode.
3. **Later** — product-data authoring graduates out of the buyer Catalog into a dedicated **Product
   admin at client-admin access** (house admin too); the Catalog becomes a read-only view. Optional:
   bulk-tag the 104 pre-existing (untagged) assets.

## Guardrail

Before adding any new edit field anywhere, ask: *which domain owns this fact, and does it already have
a home?* If yes, reference it — don't add a second editor.
