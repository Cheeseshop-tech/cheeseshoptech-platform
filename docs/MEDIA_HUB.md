# CheeseShop TECH — Media Hub

**Status:** Phase 5 (UI + delivery layer built against a mock; real Cloudinary sync deferred to launch) · **Last updated:** 2026-06-05

The media hub is the distribution & collaboration layer for the content studio (`POSITIONING.md`):
the studio produces assets; the hub stores, permissions, and distributes them to the brand and to
external collaborators. It extends the per-client Cloudinary media layer (OM §6).

## Cloudinary model (OM §6)

- **One folder per client**, matching `cloudinaryFolder` in the client config: `clients/<client>/{products,brand,raw}`.
- Cloud name is **account-global** (one Cloudinary account); clients differ by folder, not cloud.
- Product **SKU stays in the `public_id`** for traceability.
- **Transforms are applied at delivery via URL — never by re-uploading.** Code references named presets only.

**Named transform presets** (`src/lib/cloudinary.js`):

| Preset | Params | Use |
|---|---|---|
| `thumb` | 160×160 fill, auto fmt/qual | grid thumbnail (1:1) |
| `card` | 600×750 fill | product card (4:5) |
| `hero` | 1600×900 fill | hero (16:9) |
| `original` | auto fmt/qual | full-size delivery link |

## Roles & approval states

Approval flow (lightweight, per positioning): `draft → approved-for-press → approved-for-influencers`.
Role visibility (least privilege, `src/lib/media.js`):

| Role | Sees | Can do |
|---|---|---|
| `admin` / `client` | all states | upload, change approval |
| `creator` | drafts | upload (collaborate) |
| `pr` | approved-for-press | view / copy delivery links |
| `influencer` | approved-for-influencers | view / copy content kits |

## Architecture / seam

```
MediaHub UI → listAssets({folder, tenantFolder, user})  ← src/lib/media.js
                 ├─ mock backend (now)  : food sample assets on Cloudinary's demo cloud
                 └─ real backend (later): GET /.netlify/functions/media-list (Cloudinary Admin API)
delivery URLs → cldUrl(publicId, preset)                 ← src/lib/cloudinary.js
```

Switch backends with `VITE_MEDIA_BACKEND=cloudinary`. The Admin API call (which needs the secret)
runs **server-side in a Netlify function** — secrets never reach the browser.

## Going live (also in LAUNCH_AND_MAINTENANCE.md §4)

1. **[Rick]** Create `clients/montitrentini/{products,brand,raw}` in Cloudinary.
2. **[Rick]** Set `VITE_CLOUDINARY_CLOUD` (Netlify env) to the real cloud name.
3. **[Rick]** For uploads: create an unsigned upload preset → set `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. **[Rick]** Put the Cloudinary API key/secret in Netlify env.
5. **[Claude]** Build the `media-list` function; map `approvalState` from Cloudinary tags; set `VITE_MEDIA_BACKEND=cloudinary`.

## Dev preview

With no env set, the hub uses Cloudinary's public **demo** cloud + food sample images, so the gallery
renders real pictures locally. Upload shows "not configured" until a preset env var is set.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
