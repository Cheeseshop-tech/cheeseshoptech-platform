# Slot Manifest — Canonical Schema (the Content Engine contract)

**Status:** canonical (locked v1) · **Owner:** Rick Posada · **Date:** 2026-06-17
**The contract** that every renderer **and** the Slot Composer build against. Read with
`TEMPLATE_ENGINE_SPEC.md` (engine), `SLOT_KIT_GUIDE.md` (the drawing language), `SLOT_COMPOSER_SPEC.md`
(the authoring tool), `brand-tokens.js` (paint resolution). Verified against the v2 POC
`prototypes/template-engine-prototype.html`.

> **One line.** A template is a layout of typed **slots** + brand-kit **paint** (`$tokens`) + slot
> **bindings**. **One slot vocabulary, two layout modes:** `fixed` (absolute canvas — slides, social)
> and `flow` (stacked sections — landing, email). Author once → render many. **Decision: Option A.**

---

## 1. Template object

```js
{
  id: "product-feature/v1",      // unique, versioned
  label: "Product Feature",
  tag: "flagship",               // optional grouping label
  mode: "fixed" | "flow",        // ← which layout mode (the only structural fork)
  // mode:"fixed" →
  canvas: { w: 960, h: 540 },
  slots: [ /* slots with absolute x/y/w/h/z */ ],
  // mode:"flow" →
  sections: [ /* ordered section frames, each with slots */ ],
  sample: { <slotId>: value },   // sample fill for thumbnails
}
```

A template declares **exactly one** mode. The **slot vocabulary (§2) is identical** in both —
only placement differs (`x/y/w/h` in fixed vs. section-relative in flow).

---

## 2. The shared slot vocabulary (identical in both modes — this is the locked core)

```js
{
  id: "hero_image",            // slot key
  role: "var" | "brand" | "lock",
  kind: "image" | "text" | "shape" | "code",
  as: "title" | "story" | null,   // optional semantic (validation + special render)
  label: "Product photo",         // inspector label
  required: true,                 // optional
  anim: "none" | "fade-up" | "stagger" | "count-up" | "parallax",  // NEW (flow/animated)
  // — binding (where it draws from) —
  tag: "product",                 // image: Media Hub tag filter
  asset: "$seal" | "$sprig",      // brand image: Brand-Kit asset token
  // — paint (tokens, never literal brand values) —
  font: { font:"$display"|"$ui", size, bold, italic, uppercase, color:"$accent", align },  // text
  fill: "$primary",  gradient: "linear-gradient(…)",  // shape
  // — story kind (role var, kind text, as:"story") —
  parts: [ { id:"headline", font:{…} }, { id:"narrative", font:{…} } ],
  // — placement (mode-specific, see §3 / §4) —
}
```

### Roles (= Slot Kit colors)
| Role | Meaning | Authored / filled by |
|---|---|---|
| `var` (blue) | Filled per use | Client/user at use time (text, Media Hub pick) |
| `brand` (amber) | Swappable brand asset | Brand Kit asset token (`$seal`, `$sprig`) |
| `lock` (gray) | Painted automatically from the Brand Kit | nobody — `$token` paint only |

### Kinds & bindings
| Kind | Holds | Binds from |
|---|---|---|
| `image` | photo / mark | **Media Hub** (tag-filtered) → Cloudinary `public_id`; or brand `asset` token |
| `text` | a line of copy | free text **or** brand voice (`voiceOptions`: motto/mantra/phrases/lines) |
| `text` + `as:"story"` | headline + narrative (`parts`) | a Brand-Kit **story block** |
| `shape` | fill / panel / scrim | `$token` color or literal `gradient` |
| `code` ✦ NEW | sanitized HTML / embed (form, video, map) | free code (var) or kit snippet (lock) |

### Paint tokens (`brand-tokens.js`)
Colors `$primary $accent $sage $mint $cream $paper $charcoal $ink $on-primary` · fonts `$display $ui`
· assets `$logo $seal $sprig`. **Manifests stay brand-agnostic** — one template paints any tenant;
in-app, `$tokens` resolve to the live `--cs-*` theme vars, so Brand-Management edits propagate live.

---

## 3. Mode `fixed` — absolute canvas (slides, social) — LOCKED (from POC)

`canvas:{w,h}` + `slots[]` with absolute placement:
`x, y, w, h, z, fit:"cover"|"contain"|"shrink"`. Reusable lock slots (`ACCENT_BAR`, `LOGO_TC/TL/TR`).
Renderer: the generic manifest renderer stamps slots by `z`, paints lock/brand from kit, fills var
from payload, auto-fits text. (Port of the POC → `manifest-renderer.jsx`.)

```js
{ id:"hero_image", role:"var", kind:"image", fit:"cover", x:385,y:0,w:575,h:540,z:3, required:true, tag:"product" }
{ id:"slide_title", role:"var", as:"title", kind:"text", x:35,y:41,w:353,h:90,z:8, fit:"shrink",
  font:{ font:"$display", size:24, italic:true, color:"$accent", align:"left" } }
```

Outputs: **slides** (play in-app) · **social** (size-aware canvas → PNG export).

---

## 4. Mode `flow` — stacked sections (landing, email) ✦ NEW

`sections[]`, each a vertical band; slots placed **relatively** (responsive), not by pixel:

```js
{
  id:"hero", label:"Hero", bg:"$primary"|null, anim:"fade-up", cols:1,   // 1 | 2 | 3
  slots:[
    { id:"eyebrow",  role:"var", kind:"text", as:null, font:{…}, anim:"none" },
    { id:"headline", role:"var", kind:"text", as:"title", font:{…}, anim:"fade-up" },
    { id:"hero_img", role:"var", kind:"image", tag:"hero", anim:"parallax" },
    { id:"cta",      role:"lock", kind:"shape", fill:"$accent" /* brand-painted button */ }
  ]
}
```

**Flow placement vocabulary (v1, minimal + extensible):**
- `section.cols` 1–3 (responsive grid); slot `col:{span}` + `align` assign within it; vertical order = array order.
- `section.bg` paints from a `$token`; `section.pad` optional.
- Stacks + scrolls; `anim` drives entrance/scroll reveals.

Renderer: a **flow renderer** (new) — emits responsive HTML; the **landing** output is a scrollable
page, the **email** output is the email-safe (tables + inline CSS + hosted images) variant. Same slot
vocab + `brand-tokens` paint.

---

## 5. Storage & compat
Link-based in the Content Library (no file moved): image slots store Cloudinary `public_id`s, copy
slots store strings or a story-block key. A deck/page = `{ kind, category, cover, t/template, slots|sections }`.
**Back-compat:** a legacy plain-string slide = a full-bleed image URL.

## 6. Validation (locked)
- Exactly one `mode`. · A `required:true` / `as:"title"` slot must be filled (UI asterisk + validator).
- `role:"lock"` slots take **no** user control. · `code` slots are **sanitized** before render.
- Every `$token` must resolve in `brand-tokens.js` (fallback to the in-built default, never break).

## 7. Who consumes it
- **Renderers:** `fixed` → manifest-renderer (POC port) · `flow` → flow renderer (to build).
- **Slot Composer:** authors either mode (format switch), one slot inspector, **emits this exact shape**.

## 8. Build order (off this contract)
1. Port the **fixed** manifest engine (`template-manifests.js` + `manifest-renderer.jsx`) — already specced.
2. Build the **flow** renderer (landing first) against this schema.
3. Add **`code`** kind (+ sanitizer) and wire **`anim`** in the flow renderer.
4. Then the **Slot Composer** GUI emits both modes.
