# Asset Library Spec — unified media ingestion ("one mind, one body," finished)

**Written:** 2026-06-13 · From Rick's architecture direction (single ingestion door for all assets).
**Status:** Spec / not built. Phase-sized. Gated behind the Cloudinary upload preset working.

## Principle

Extends "one mind, one body" to its conclusion: there is **one canonical asset source per
tenant** and **one front door** to put assets into it. Every surface (Product Catalog, Pricing,
Proposals, Brand Kit, Campaigns) *references* assets by role — none uploads its own copy.

Today there are three upload doors (brand-kit slots, Media Hub, the catalog/manifest pipeline) —
that quietly violates the rule. This collapses them to one.

## Decisions (locked, 2026-06-13)

- **Rename:** "Image Catalog" → **Product Catalog** (buyer-facing product view). The Media Hub is
  the *management* library; the Product Catalog is one *view* over the product subset.
- **Media Hub = the single front door.** All uploads land here, get tagged, then are referenced
  everywhere else. Brand-kit slots (hero / logo / seal) and story blocks **pick from the library**
  — they no longer upload directly. (Rick, 2026-06-13: "upload to Media Hub, then assign.")
- **Folders = saved views over the one manifest**, filtered by `kind` + `role`. Folders are not
  separate storage; the manifest stays the single source.
- **Video routing is deferred to the HubSpot / content phase.** The library is **images-only**
  for now (photos, logos, vectors, GIFs). Social videos + developed/created content get cataloged
  when HubSpot integration lands.

## Media Hub left-nav (folders)

| Folder | Holds | Feeds |
|---|---|---|
| All assets | everything | — |
| All Products | product packshots (`kind:photo, role:packshot:<sku>`) | Product Catalog, Pricing, Proposal range |
| Story Block Photos | `role:story:<block-key>` | Proposal/Brand story blocks |
| Brand Assets → Logos | `kind:logo` | Brand kit logo/seal, portal theming |
| Brand Assets → Vector graphics | `kind:vector` | Brand decoration, marks |
| Brand Assets → GIFs | `kind:gif` | Animations, campaigns |
| Event Photography | `role:event` | Lifestyle, decks, campaigns |
| *(Social Videos)* | *deferred — HubSpot phase* | — |
| *(Developed content)* | *deferred — HubSpot phase* | — |

## Manifest schema extension

`src/data/<tenant>/images.json` entries gain:

- `kind`: photo | logo | vector | gif  (drives the default delivery preset)
- `role`: packshot:<sku> | brand-hero | seal | story:<block-key> | lifestyle | event | pattern
- `description`: short human note (Rick's ask — powers search + reuse)
- `format`: source format (jpg/png/webp/svg/gif) — kept for correct handling

One asset may carry multiple roles (a hero photo can also serve a story block) — asset is
decoupled from placement.

## The payoff: delivery preset chosen by ROLE, not guessed per call site

This is also the fix for the recent upload/render pain. `lib/cloudinary.js` `cldImage()` already
centralizes URLs; here the **preset is selected by `kind`/`role`** instead of each screen deciding:

- logo / vector → contain, transparent background (never pad-on-white or crop)
- brand-hero / event / story → `cover`
- packshot → pad-on-white

## Assign flow (the single front door)

1. Upload in Media Hub → choose folder (sets `kind`/`role`) + type a short description.
2. Brand Kit slots and story blocks show a **"Pick from library"** chooser (filtered to the
   relevant role) instead of a file input. Selecting sets a *reference*, not a copy.
3. `scripts/sync-images.mjs` continues to reconcile the manifest from Cloudinary.

## Migration

- Existing brand-kit `imagery.*` publicIds → fold into the manifest as `kind`/`role` entries.
- Existing product manifest entries → tag `kind:photo, role:packshot:<sku>` (no move).
- Brand-kit ImageSlot upload UI → replace with the library picker.

## Open / still undefined

- Exact "Pick from library" UI (modal grid vs inline) — design at build time.
- Whether GIFs/vectors need their own delivery rules beyond logo handling.

## Dependency (do first)

Nothing here removes the **Cloudinary unsigned upload preset** requirement
(`VITE_CLOUDINARY_UPLOAD_PRESET` in Netlify). Get that working first so uploads actually save;
then build this as its own focused session.
