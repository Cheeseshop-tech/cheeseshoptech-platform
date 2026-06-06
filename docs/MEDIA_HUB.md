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

## Going live — code is DONE; remaining steps are Cloudinary/Netlify config

Read path (`media-list` function, paginated) and upload path (unsigned-preset, browser→Cloudinary,
no secret) are both built. To switch the Media Hub from mock to real:

1. **[Rick] Cloudinary → Settings → Upload → Add folder:** create `clients/montitrentini/products`,
   `/brand`, `/raw` (and upload a few images so the grid isn't empty).
2. **[Rick] Cloudinary → Settings → Upload → Upload presets → Add:** an **Unsigned** preset.
   Note its name. (Optionally restrict allowed folders to `clients/`.)
3. **[Rick] Cloudinary → Settings → API Keys:** copy the **Cloud name**, **API Key**, **API Secret**.
4. **[Rick] Netlify → cheeseshoptech-platform → Project configuration → Environment variables**, add:
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server-side, for the function)
   - `VITE_CLOUDINARY_CLOUD` = the cloud name (build-time, for delivery URLs)
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = the unsigned preset name
   - `VITE_MEDIA_BACKEND` = `cloudinary`  ← flips read from mock to the live function
5. **Redeploy** (any push, or Netlify "Trigger deploy" — VITE_* vars bake in at build).
6. Verify: Media Hub lists real assets; Upload adds a file (tagged `draft`); approval badges reflect tags.

**Secrets reminder:** Rick enters the API key/secret in Netlify (never committed; Claude does not enter secrets).

## Dev preview

With no env set, the hub uses Cloudinary's public **demo** cloud + food sample images, so the gallery
renders real pictures locally. Upload shows "not configured" until a preset env var is set.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
