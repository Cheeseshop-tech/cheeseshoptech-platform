# Slot Kit — draw layouts that map straight to the engine

A sketch becomes a template when every box on it is a **slot**. Draw on a **960 × 540** canvas, label each box, and send it to me — I turn it into a manifest with zero guesswork.

## The vocabulary (3 roles, a few kinds)
Every box is one **role** (who controls it) and one **kind** (what it holds).

| Role (color) | Meaning | You draw it when… |
|---|---|---|
| **VAR — blue** | You fill it per use (from Media Hub or brand voice) | the content changes slide to slide: hero photo, title, body |
| **BRAND — amber** | A swappable brand asset | emblem/seal, sprig, secondary marks |
| **LOCK — gray** | Painted automatically from the Brand Kit | logo, accent bar, background panels, cards, scrim |

| Kind | Holds | Bound to |
|---|---|---|
| `image` | a photo / mark | Media Hub (tag-filtered) |
| `text` | a line of copy | brand voice or free text |
| `story` | headline + narrative (one box, two parts) | a brand story block |
| `shape` | a fill / panel / gradient | a Brand-Kit color token |

## Label every box like this
`KIND: name` + role by color. Examples:
- `IMG: hero` (blue) — the product/scene photo
- `TXT: title *` (blue) — the slide title — **every slide needs one**
- `TXT: topic` (blue) — the supporting line
- `STORY: headline+body` (blue) — the two-part story
- `EMBLEM` / `SPRIG` (amber) — brand assets
- `LOGO (toggle)` (gray) — appears per-slide, on/off
- `ACCENT BAR`, `PANEL`, `SCRIM` (gray) — painted from the kit

## Strategic reasoning — how to compose, not just place
1. **Start from the message, pick the template type.** Statement = one idea. Story = provenance. Three-up = pillars. Product range = the lineup. Quote = proof. Cover/Closing = open/close. Big stat = one number.
2. **Panels first, then content.** Decide the split — full-bleed photo, left-copy/right-photo, or solid color field — *then* drop the var slots into the readable zone. (Engine rule: left panel = text, right panel = hero; don't reflow text over the photo.)
3. **One focal point per slide.** Either the photo carries it or the headline does — not both. If the photo is the star, shrink the copy; if the words are the star, mute the image (scrim/fade).
4. **Z-order matters.** Background panel → photo → scrim/fade → text → logo on top. If text sits over a photo, add a `SCRIM` box so it stays readable.
5. **Lock = free.** Don't spend design energy on logo/accent/cards — they paint themselves from the kit. Spend it on the var slots: which photo, which line, which story.
6. **Title is mandatory.** Every template carries a `TXT: title *`. It's the spine of the slide and the deck's name.
7. **Leave breathing room.** Keep var slots off the canvas edges (~3–6%); the engine clips overflow, and tight margins read cheap.

## The loop
Excalidraw on the Wacom → rough the boxes on a 960×540 frame → label by `KIND: name` + color → export **PNG or SVG** (or just send the `.excalidraw`) → I wire it into `slide-templates.js` as a manifest, painted by the Brand Kit.

Open `design/slot-kit.excalidraw` for the draggable, color-coded blocks to build from.
