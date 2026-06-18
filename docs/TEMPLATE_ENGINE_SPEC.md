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

---

## 10. v2 — tokenized manifest engine (POC approved 2026-06-17)
Validated in `prototypes/template-engine-prototype.html`. A template = a **manifest of coordinate slots**
(role `var/brand/lock`, kind `text/image/shape`, absolute `x/y/w/h` on a fixed canvas, `z`, per-slot font/color
as **Brand-Kit tokens**). One generic renderer paints any manifest from any tenant's kit. Refinements over the
PPTX handoff: tokenized paint (not literal hexes), platform-shared (not tenant-namespaced) templates, text
auto-fit, fixed-canvas scope (slides/social; blog/email separate), HTML render is source / PPTX·PDF·PNG derived.

### 10.1 New files (React port)
- `src/lib/template-manifests.js` — the `TEMPLATES` array (tokenized), `getTemplate(id)`, `firstImageSlotId()`.
- `src/lib/brand-tokens.js` — `resolveToken("$accent"|"$display"|"$logo", resolved)` → maps to the existing
  `--cs-color-*` / `--cs-font-*` CSS vars and `getBrandKit(resolved)` assets. (In-app, tokens resolve to the
  **live theme vars**, so Brand-Management edits propagate automatically — better than the POC's literals.)
- `src/components/presentations/manifest-renderer.jsx` — generic `<SlideRenderer slide resolved>` that stamps
  slots by `z`, paints lock/brand from kit, fills var from payload. Supersedes `slide-renderer.jsx`; keeps the
  string-slide legacy fallback.

### 10.2 Content Studio = template-first
Replace the composer flow in `proposal-builder.jsx` / `presentations-page.jsx`:
1. **Template browser** (grid of painted thumbnails via the renderer) → pick.
2. **Painted preview** + **slot-fill panel**, bindings declared in the manifest:
   - `image` slot → live **`MediaPicker`** (`defaultTag = slot.tag`, `onChange` stores the `public_id`).
   - `text` / `story` slot → **brand-voice dropdown** from `getBrandKit(resolved)` (storyBlocks / readyPhrases /
     lines) + free text.
   - `brand` slot → MediaPicker over brand-tagged assets; `lock` → painted from kit, no control.
3. **Required Title** per template (validator + UI asterisk).
4. Save → Content Library entry `{ kind:"deck", category:"slide-deck", cover, slides:[{t, slots}] }`. Image slot
   values are **public_ids** (link-based — no file moved); copy values are strings. `cover = cldUrl(firstImageId, "card")`.

### 10.3 Media Hub / Cloudinary combo
- **Read (compose/render):** image slots store Cloudinary `public_id`s; the renderer delivers them with
  `cldUrl(id, "hero"|"preview")`. Link-based references — Media Hub stays the single source of truth.
- **Write (new asset):** Content Studio uploads via `uploadFileAuto({file, tenantFolder, subfolder:"presentations"})`
  → returns a `public_id` → dispatched to the **Media Hub** for tagging (per `CONTENT_ORCHESTRATION_SPEC.md`).
- **Lock/brand assets** (logo, seal, sprig) are brand-kit `public_id`s in Cloudinary, delivered via `cldUrl`.
  TODO: `brand-kit.assets.sprig` is empty — upload + tag the sprig PNG, then set it in the kit.
- **Export (later):** HTML render → html-to-image (or Cloudinary) → PNG/PDF; PPTX is the deferred `render.ts` path.

### 10.4 Port order
POC ✅ → build a 10-slide Monti deck in the POC (stress-test the 9) → port `template-manifests.js` +
`brand-tokens.js` + `manifest-renderer.jsx` → make the composer template-first with live MediaPicker + brand
voice → wire `uploadFileAuto` dispatch → validator → build/deploy.
