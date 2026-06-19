# Slot Composer — House-Admin Visual Template Builder (spec)

**Status:** spec / direction (Phase 2 of the Content Engine) · **Owner:** Rick Posada · **Date:** 2026-06-17
**Read with:** `design/SLOT_KIT_GUIDE.md` (the language), `TEMPLATE_ENGINE_SPEC.md` (the engine),
`HOUSE_CONSOLE_SPEC.md` (where it lives), `DESIGN_SYSTEM.md` (tokens/components), `BRAND_KIT_AND_PROPOSAL_SPEC.md`.

> **One line.** A core **House-admin tool inside Content Studio** — a drag-and-drop canvas that
> composes templates in the Slot Kit language and **emits the same manifest** the renderers already
> consume. It replaces the "draw in Excalidraw → hand-compile" loop with a native authoring surface.
> Build it *after* the manifest + renderers are stable — it's "a nicer way to write the same JSON."

> **What it is NOT (scope guard).** It is a **tool, not a page.** It is *not* the portal's marketing
> landing page, and *not* a landing page for Content Studio. It builds reusable **templates**;
> landing pages — like slides, email, and social — are **outputs** the tool produces. The tool is the
> deliverable; any specific landing page is just a test output that exercises the manifest.

---

## 1. Purpose & access

- **Purpose:** let the house author/edit content templates visually — drag containers, cards, and
  shapes onto a canvas; tag each as a slot; bind its source; emit a template manifest.
- **Home:** **inside Content Studio** (`src/components/proposals/content-studio.jsx`) — the
  house-admin content-authoring environment, reached from the House Console (`agency-console.jsx`).
  It's a **main tool of Content Studio**, beside the slide/proposal authoring.
- **Access: CheeseShop TECH HOUSE ADMIN ONLY**, gated to `admin`. **Not client-facing.** Clients
  *consume* templates and fill `VAR` slots / pick Media Hub assets; they never author structure.
  (Consistent with DESIGN_SYSTEM B0/Part E + the canonical fact — templates are house IP, never
  transferred at buyout.)

## 2. What it emits (the contract)

The **slot manifest** — the exact shape `src/lib/slide-templates.js` defines and
`src/components/presentations/slide-renderer.jsx` renders. The Composer is a GUI over that JSON.
**One manifest → many outputs:** slides/PPTX (live) · animated landing page · email · social.

## 3. The slot model (authored per box)

Every placed box is one **role** × one **kind** × one **binding** (+ `anim` for landing/animated):

| Axis | Values |
|---|---|
| **Role** | `VAR` (filled per use) · `BRAND` (swappable asset) · `LOCK` (auto-painted from Brand Kit) |
| **Kind** | `image` · `text` · `story` (head+body) · `shape` · `code` (embed/HTML) · `container/card` |
| **Binding (where it draws from)** | *upload* · **Media Hub** (tag-filtered query) · **brand voice / story block** · **Brand Kit token** (color/type) · free text · pasted code |
| **anim** (landing/animated) | `none` · `fade-up` · `stagger` · `count-up` · `parallax` |

## 4. Formats & canvas

- **Slide** — fixed 960×540 frame (today's SlideStudio).
- **Landing** — vertical stack of **section-frames** + scroll + `anim` (per the Slot Kit landing extension).
- **Email / Social** — constrained format frames off the same manifest.
- A template targets one or more formats; format-aware renderers consume the shared manifest.

## 5. UI regions (the builder)

- **Top bar:** template name · format switch (Slide / Landing / Email / Social) · Save → template library · Publish.
- **Left — palette:** draggable slot kinds (Image · Text · Story · Shape · Code · Card/Container) +
  Sections (for landing) + the role legend (VAR blue / BRAND amber / LOCK gray).
- **Center — canvas:** drag-drop placement, snap/grid, the live frame (paints LOCK/BRAND from the
  active Brand Kit so it previews on-brand).
- **Right — inspector** (for the selected slot): Role · Kind · **Binding picker** (Media Hub browser,
  Brand Kit token picker, brand-voice/story picker, code box) · alt text · `anim` selector.

## 6. Workflow

Author on the canvas → **save to the template library** (house IP) → renderers paint it per client
from the **Brand Kit** → clients fill `VAR` slots (text, Media Hub pick) at use time. Author once,
reuse across clients + outputs.

## 7. Reuses (don't rebuild)

Component catalogue (cards/containers/inputs) · **Media Hub** (`media-list`, image bindings) ·
**Brand Kit** (`brand-kit.json`, LOCK/BRAND painting + `lib/themes.js`) · the **template engine**
(`slide-templates.js` + `slide-renderer.jsx`) · House Console (`agency-console.jsx`) for gating.

## 8. Build sequencing (critical)

1. **Manifest schema + renderers first** — slides (done) → landing → email/social. Author with
   **Excalidraw + hand-compile** as the bridge. ← current
2. **Then the Slot Composer** — the visual builder on top, once the manifest contract is stable.
   Building the GUI before the contract is locked = rebuilding it twice.

Designing toward the Composer now means **keeping the manifest clean and complete** so the GUI drops
in later with no schema churn.

## 9. Guardrails

- **House-admin only**; never exposed client-side.
- **Constrained to the slot vocabulary** — not a freeform HTML page builder. Output is always a
  manifest, never forked per-output code.
- **Templates are house IP** — part of the platform, not transferred at a client buyout.
- New slot kinds / bindings enter the **shared** language first (update `SLOT_KIT_GUIDE.md` +
  TEMPLATE_ENGINE_SPEC), then the Composer exposes them.

## 10. Open decisions (resolve before build)

- **Format model:** one template authored multi-format, or one template per format off a shared block library?
- **How `anim` is authored** — per-slot dropdown (this spec) vs. a timeline.
- **Relation to SlideStudio/Content Studio:** does the Composer *absorb* the existing slide studio
  into one canvas, or sit beside it as the "template authoring" mode? (Lean: one canvas, format-switched.)
