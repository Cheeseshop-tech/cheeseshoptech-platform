# Template Engine — architecture spec

**Status:** Draft 2026-06-17 · **Owner:** Rick Posada · Powers Content Studio output. Reuses the Brand Kit,
Theme Engine, MediaPicker, and story blocks. Read with `CONTENT_ORCHESTRATION_SPEC.md`, `BRAND_KIT_AND_PROPOSAL_SPEC.md`.

## 1. The model (one idea, every output)
**A template = a layout of typed SLOTS + brand-kit PAINT + slot BINDINGS.**
- **Slots** — named, pre-wired positions in a layout: `logo`, `title`, `tagline`, `copy`, `hero`, etc.
- **Paint** — the blank template renders in the tenant's **Brand Kit** automatically (colors, fonts, logo,
  spacing) via the Theme Engine tokens. An empty template already looks on-brand.
- **Bindings** — each slot is filled from a SOURCE (a "pre-wired dropdown"):
  | Slot type | Source | UI |
  |---|---|---|
  | `image` | Media Hub (tag-filtered) | **MediaPicker** dropdown (built) |
  | `brandCopy` | Brand Kit story blocks / story topics | story dropdown (built) |
  | `text` | free text | input |
  | `auto` | Brand Kit (logo, colors, fonts) | none — painted automatically |

One engine fills slides, social posts, blog, and email — only the **layouts + dimensions** differ per output.

## 2. Slide templates (starter set)
- **Image** — full-bleed `hero` (replicates today's image-only deck; the simplest template).
- **Cover** — `logo` (auto) + `title` (text) + `tagline` (text/brandCopy) over a `hero` image, brand-painted.
- **Statement** — big `headline` (text/brandCopy) on a brand-color field; optional `subtext`.
- **Story** — `hero` image + `heading` + `body` (from a story block), alternating layout.
- **Closing/CTA** — `headline` + `cta` + `contact` (auto from kit).

## 3. Data model
A deck = ordered slides; each slide = `{ t: <templateId>, slots: { <slotKey>: value } }` where image slots
hold a Cloudinary `public_id` and copy slots hold strings (or a story-block key). Stored **link-based** in the
Content Library catalog (a composition of references — no file upload), per the orchestration spec.
Backward-compatible: a slide that is a plain string is treated as a legacy full-bleed image URL.

## 4. Rendering
`SlideRenderer({ slide, resolved })` renders one slide for its template, painted by the Brand Kit (colors via
`--cs-color-*`, fonts via the global theme, images via `cldUrl`). Used in the composer preview AND the
`DeckViewer` (which renders structured slides through it; falls back to `<img>` for legacy string slides).

## 5. Content Studio layout
- **Left:** slide list (add → pick a template) + reorder/remove.
- **Center:** live, brand-painted **preview** (SlideRenderer).
- **Right:** **slot-fill panel** — the pre-wired dropdowns/inputs for the selected slide's slots.
- Save → Content Library as a link-based deck (category `slide-deck`).

## 6. Other output types (same model, phased; honest export realities)
- **Social posts** — same slots, but **size-aware** (IG 1080², story 1080×1920, FB, X) and must **export as an
  image file** to post (render-to-image step — heavier than slides, which play in-app).
- **Blog** — title/hero/body template → exports **HTML/Markdown** for a CMS.
- **Email** — the **email-safe** template (tables + inline CSS + hosted images) we already prototyped.

## 7. Reuse map (we already own ~80%)
- Brand Kit (`lib/brandKit.js`, `brand-kit.json`) — paint + story blocks/topics.
- Theme Engine (`lib/themes.js`) — composed layouts, zones, tokens.
- MediaPicker (`components/media/media-picker.jsx`) — image slot binding.
- Content Library + DeckViewer (`presentations-page.jsx`) — store, play, share.

## 8. Phasing
1. **Slide template engine v1** (this build): `slide-templates.js` + `SlideRenderer` + template-based composer
   + DeckViewer structured-slide support. Templates: Image, Cover, Statement, Story.
2. Closing/CTA + richer Story layouts; per-template theming options.
3. **Social** templates (size-aware + image export).
4. **Blog** + **Email** templates.

## 9. Clone fit
Templates are shared platform assets; the per-tenant Brand Kit paints them. A blank `_template` tenant + the
shared templates = an instant on-brand starter deck for any new client — zero code (the onboarding model).
