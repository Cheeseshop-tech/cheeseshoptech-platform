# Media Hub Items — source of truth for item identity + copy (NO pricing)

**Decision (Rick, 2026-07-03, revised same day):** the Media Hub holds the item's IDENTITY + COPY
record and NOTHING commercial. Fields, in the price & inventory sheet's order:

1. Item number (SKU)
2. Pack size
3. Weight
4. UPC
5. Short description — social, email, catalog blurb
6. Long description — slides, blog, sell sheets
7. Certification (e.g. DOP · EU PDO)

**Pricing is strictly NOT held or edited in Media Hub.** It stays with the Custom Price List
Creator — one mind, one body. Media Hub is the organizational portal and distribution hub for
all images and item copy; other surfaces consume from it.

## Data model

One raw JSON document per tenant in Cloudinary:

```
{tenantFolder}/copy/items.json        (resource_type: raw)
```

```json
{
  "version": 2,
  "updatedAt": "…",
  "items": {
    "MT-ASIA-200": {
      "sku": "MT-ASIA-200",
      "packSize": "12 × 200 g",
      "weight": "200 g",
      "upc": "8 001234 567890",
      "shortDescription": "…",
      "longDescription": "…",
      "certification": "DOP",
      "updatedAt": "…"
    }
  }
}
```

v1 docs (same-day, short-lived: had `cards[]` + `pricing{}`) are migrated on load — card bodies
fold into short/long descriptions, pricing is dropped by decision.

## Files

| File | Role |
|---|---|
| `src/lib/items.js` | Data layer: load/save, `getItem`, `listItems`, `descriptionFor(doc, sku, "short"|"long")`, v1→v2 migration, mock mode (localStorage) |
| `netlify/functions/items-get.js` | Reads the doc (Admin API version lookup → versioned delivery URL, cache-proof) |
| `netlify/functions/items-save.js` | Writes the doc (signed raw upload, overwrite + invalidate; secret server-side) |
| `src/components/media/items-panel.jsx` | Items view + editor (sheet-order fields, copy buttons on both descriptions) |
| `src/components/media/media-hub.jsx` | Hosts the Items tab (first in the rail); hoists the items doc |

## Consuming copy from other surfaces

```js
import { loadItems, descriptionFor } from "@/lib/items.js";
const doc = await loadItems(resolved.cloudinaryFolder);
descriptionFor(doc, "MT-ASIA-200", "short"); // social / email
descriptionFor(doc, "MT-ASIA-200", "long");  // slides / blog / sell sheets
```

Images stay linked by SKU: assets tagged with a SKU in the asset editor appear as the item's
photos in the Items view.

## Env / config

Reuses the existing Cloudinary env (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`) — no new secrets.
Live vs mock follows the same `VITE_MEDIA_BACKEND` flag as the rest of the Media Hub.

## Follow-ups

- [ ] Wire slide-studio / content engine to `descriptionFor()` instead of freehand copy.
- [ ] Optional: Price List Creator reads item identity (pack size, weight, UPC, cert) from
      items.json so specs are typed once. Pricing itself never moves here.
- [ ] Roles: item editing is gated to admin + client (same tier as asset management).
