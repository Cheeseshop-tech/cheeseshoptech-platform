// Template Engine v2 — manifest library (TEMPLATE_ENGINE_SPEC.md §10).
// A template = a manifest of coordinate SLOTS on a fixed canvas. Each slot has:
//   role : var (you fill) | brand (swappable asset) | lock (painted from kit; logo is toggleable)
//   kind : text | image | shape
//   x,y,w,h : absolute px on canvas (960×540) · z : paint order
//   font/fill/asset : Brand-Kit TOKENS ($accent, $display, $logo) — resolved per tenant at render.
//   tag  : Media-Hub filter for image slots · fills : auto-fill a linked text slot from image metadata
//   pick : pin an image field to one catalog position · toggle : per-slide show/hide (logo)
// Image slot values are Cloudinary public_ids (link-based). Backward-compatible: a plain string slide
// is a legacy full-bleed image URL.

const ACCENT_BAR = { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 2, fill: "$accent" };
const LOGO_TC = { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 360, y: 28, w: 240, h: 96, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" };
const LOGO_TR = { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 806, y: 16, w: 130, h: 54, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" };
const LOGO_TL = { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 48, y: 34, w: 180, h: 72, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" };

export const SLIDE_TEMPLATES = [
  { id: "product-feature/v1", label: "Product Feature", tag: "flagship", family: "product-feature",
    canvas: { w: 960, h: 540 },
    slots: [
      ACCENT_BAR,
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 385, y: 0, w: 575, h: 540, z: 3, required: true, tag: "product", label: "Product photo" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 35, y: 41, w: 353, h: 90, z: 8, fit: "shrink",
        font: { font: "$display", size: 24, bold: true, italic: true, color: "$accent", align: "left" }, label: "Title" },
      { id: "topic_label", role: "var", kind: "text", x: 35, y: 138, w: 330, h: 54, z: 8, fit: "shrink",
        font: { font: "$display", size: 18, bold: true, italic: true, color: "$primary", align: "left" }, label: "Topic" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 33, y: 200, w: 330, h: 200, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 13, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 15, italic: true, color: "$primary", align: "left" } },
        ], label: "Story" },
      { id: "emblem_overlay", role: "brand", kind: "image", fit: "contain", x: 392, y: 330, w: 172, h: 172, z: 4, asset: "$seal", tag: "seal", label: "Cert emblem" },
      { id: "brand_sprig", role: "brand", kind: "image", fit: "contain", x: 40, y: 415, w: 226, h: 97, z: 7, asset: "$sprig", tag: "sprig", label: "Sprig accent" },
    ],
    sample: { slide_title: "Italian Certified Excellence", topic_label: "Special squared format cheese",
      story_block: { headline: "PRODUCED EXCLUSIVELY WITH ITALIAN COW'S MILK FROM A SHORT SUPPLY CHAIN.",
        narrative: "A compact, elastic texture, perfect for slicing — equally at home on panini, sandwiches or a burger." } } },

  // 2026-07-19 — "Product on Cream": inverted composition (image in a card, left; copy right) so a
  // product beat doesn't always read the same as v1. Same slot ids as v1 (hero_image, slide_title,
  // topic_label, story_block, emblem_overlay, brand_sprig) — Stage 0/1 and Stage 2 both already
  // know how to fill this without any code change, only the geometry differs.
  { id: "product-feature/v2", label: "Product Feature — Cream Card", tag: "product on cream", family: "product-feature",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$cream" },
      { id: "image_card", role: "lock", kind: "shape", x: 40, y: 60, w: 400, h: 420, z: 2, fill: "$paper", radius: 18 },
      { id: "hero_image", role: "var", kind: "image", fit: "contain", x: 70, y: 90, w: 340, h: 340, z: 4, required: true, tag: "product", label: "Product photo" },
      { id: "emblem_overlay", role: "brand", kind: "image", fit: "contain", x: 350, y: 380, w: 90, h: 90, z: 6, asset: "$seal", tag: "seal", label: "Cert emblem" },
      { id: "brand_sprig", role: "brand", kind: "image", fit: "contain", x: 60, y: 445, w: 150, h: 64, z: 5, asset: "$sprig", tag: "sprig", label: "Sprig accent" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "topic_label", role: "var", kind: "text", x: 480, y: 70, w: 430, h: 44, z: 8, fit: "shrink",
        font: { font: "$display", size: 18, bold: true, italic: true, color: "$primary", align: "left" }, label: "Topic" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 480, y: 118, w: 430, h: 100, z: 8, fit: "shrink",
        font: { font: "$display", size: 26, bold: true, italic: true, color: "$accent", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 480, y: 228, w: 430, h: 230, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 13, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 15, italic: true, color: "$primary", align: "left" } },
        ], label: "Story" },
    ],
    sample: { slide_title: "Italian Certified Excellence", topic_label: "Special squared format cheese",
      story_block: { headline: "PRODUCED EXCLUSIVELY WITH ITALIAN COW'S MILK FROM A SHORT SUPPLY CHAIN.",
        narrative: "A compact, elastic texture, perfect for slicing — equally at home on panini, sandwiches or a burger." } } },

  // 2026-07-19 — "Stacked Product Story": full-width photo band on top, copy band below — a third
  // real option distinct from both the left/right splits above, for when a product shot reads best
  // as a wide banner rather than a portrait crop.
  { id: "product-feature/v3", label: "Product Feature — Stacked", tag: "stacked product", family: "product-feature",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 300, z: 1, required: true, tag: "product", label: "Product photo" },
      { id: "bg_lower", role: "lock", kind: "shape", x: 0, y: 300, w: 960, h: 240, z: 1, fill: "$cream" },
      { id: "scrim", role: "lock", kind: "shape", x: 0, y: 220, w: 960, h: 80, z: 2, gradient: "linear-gradient(180deg, rgba(250,249,245,0), rgba(250,249,245,.95))" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 806, y: 16, w: 130, h: 54, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
      { id: "topic_label", role: "var", kind: "text", x: 60, y: 330, w: 400, h: 40, z: 5, fit: "shrink",
        font: { font: "$display", size: 16, bold: true, italic: true, color: "$accent", align: "left" }, label: "Topic" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 60, y: 368, w: 840, h: 60, z: 5, fit: "shrink",
        font: { font: "$display", size: 28, bold: true, italic: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 60, y: 432, w: 840, h: 96, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$ink", align: "left" } },
        ], label: "Story" },
    ],
    sample: { slide_title: "Italian Certified Excellence", topic_label: "Special squared format cheese",
      story_block: { headline: "PRODUCED EXCLUSIVELY WITH ITALIAN COW'S MILK FROM A SHORT SUPPLY CHAIN.",
        narrative: "A compact, elastic texture, perfect for slicing — equally at home on panini, sandwiches or a burger." } } },

  { id: "cover/v1", label: "Cover", tag: "opener", family: "cover",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "hero", label: "Background photo" },
      { id: "scrim", role: "lock", kind: "shape", x: 0, y: 230, w: 960, h: 310, z: 2, gradient: "linear-gradient(180deg,rgba(6,78,34,0),rgba(6,78,34,.82))" },
      ACCENT_BAR, LOGO_TC,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 70, y: 360, w: 820, h: 104, z: 5, fit: "shrink",
        font: { font: "$display", size: 42, italic: true, color: "$cream", align: "left" }, label: "Title" },
      { id: "topic_label", role: "var", kind: "text", x: 70, y: 466, w: 820, h: 48, z: 5, fit: "shrink",
        font: { font: "$display", size: 20, italic: true, color: "$mint", align: "left" }, label: "Subtitle" },
    ],
    sample: { slide_title: "Crafted for the Modern Table", topic_label: "Squared-format table cheese" } },

  // 2026-07-19 — "Split Cover": color panel + logo/title on the left, full-bleed hero photo on the
  // right. No scrim needed (text never sits on the photo), so it reads cleanly even with a busy or
  // high-contrast photo that would fight a bottom-scrim treatment like v1.
  { id: "cover/v2", label: "Cover — Split", tag: "split opener", family: "cover",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg_panel", role: "lock", kind: "shape", x: 0, y: 0, w: 400, h: 540, z: 1, fill: "$primary" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 400, y: 0, w: 560, h: 540, z: 2, required: true, tag: "hero", label: "Background photo" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 48, y: 34, w: 180, h: 72, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 44, y: 220, w: 320, h: 130, z: 5, fit: "shrink",
        font: { font: "$display", size: 30, italic: true, color: "$cream", align: "left" }, label: "Title" },
      { id: "topic_label", role: "var", kind: "text", x: 44, y: 368, w: 320, h: 60, z: 5, fit: "shrink",
        font: { font: "$display", size: 16, italic: true, color: "$mint", align: "left" }, label: "Subtitle" },
    ],
    sample: { slide_title: "Crafted for the Modern Table", topic_label: "Squared-format table cheese" } },

  // 2026-07-19 — "Editorial Cover": top-down scrim (not bottom) with a centered upper-third title
  // and a small cert-emblem badge, for photos where the bottom of the frame is the interesting part
  // (can't be covered by v1's bottom scrim) — e.g. a table spread or a landscape shot.
  { id: "cover/v3", label: "Cover — Editorial", tag: "editorial opener", family: "cover",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "hero", label: "Background photo" },
      { id: "scrim", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 260, z: 2, gradient: "linear-gradient(180deg,rgba(6,78,34,.85),rgba(6,78,34,0))" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 360, y: 28, w: 240, h: 96, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 70, y: 150, w: 820, h: 80, z: 5, fit: "shrink",
        font: { font: "$display", size: 36, italic: true, color: "$cream", align: "center" }, label: "Title" },
      { id: "topic_label", role: "var", kind: "text", x: 70, y: 220, w: 820, h: 44, z: 5, fit: "shrink",
        font: { font: "$display", size: 18, italic: true, color: "$mint", align: "center" }, label: "Subtitle" },
      { id: "emblem_overlay", role: "brand", kind: "image", fit: "contain", x: 790, y: 400, w: 130, h: 130, z: 4, asset: "$seal", tag: "seal", label: "Cert emblem" },
    ],
    sample: { slide_title: "Crafted for the Modern Table", topic_label: "Squared-format table cheese" } },

  { id: "statement/v1", label: "Statement", tag: "big idea", family: "statement",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$primary" },
      ACCENT_BAR, LOGO_TC,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 110, y: 175, w: 740, h: 200, z: 5, fit: "shrink",
        font: { font: "$display", size: 46, italic: true, color: "$cream", align: "center" }, label: "Statement" },
      { id: "topic_label", role: "var", kind: "text", x: 160, y: 400, w: 640, h: 56, z: 5, fit: "shrink",
        font: { font: "$display", size: 22, italic: true, color: "$mint", align: "center" }, label: "Attribution" },
    ],
    sample: { slide_title: "Made at altitude in the Trentino mountains.", topic_label: "Casa Finco — casari dal 1925." } },

  { id: "story/v1", label: "Story", tag: "image + copy", family: "story",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg_panel", role: "lock", kind: "shape", x: 0, y: 0, w: 480, h: 540, z: 1, fill: "$cream" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 480, y: 0, w: 480, h: 540, z: 2, required: true, tag: "lifestyle", label: "Photo" },
      ACCENT_BAR, LOGO_TL,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 52, y: 140, w: 376, h: 110, z: 5, fit: "shrink",
        font: { font: "$display", size: 34, italic: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 52, y: 268, w: 376, h: 212, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 13, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 15, italic: true, color: "$ink", align: "left" } },
        ], label: "Story" },
    ],
    sample: { slide_title: "A hundred-year story",
      story_block: { headline: "FOUR GENERATIONS · ONE HUNDRED YEARS",
        narrative: "Milk from our neighborhood — within 90 km of our dairy in Grigno — processed, aged and packaged entirely in our own plants." } } },

  // 2026-07-19 — "Mirrored Story": photo left / cream copy right — the flip of v1, so two story
  // beats back-to-back in one deck don't read as the exact same slide with different words.
  { id: "story/v2", label: "Story — Mirrored", tag: "mirrored image + copy", family: "story",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 480, h: 540, z: 2, required: true, tag: "lifestyle", label: "Photo" },
      { id: "bg_panel", role: "lock", kind: "shape", x: 480, y: 0, w: 480, h: 540, z: 1, fill: "$cream" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 806, y: 16, w: 130, h: 54, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 532, y: 140, w: 376, h: 110, z: 5, fit: "shrink",
        font: { font: "$display", size: 34, italic: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 532, y: 268, w: 376, h: 212, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 13, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 15, italic: true, color: "$ink", align: "left" } },
        ], label: "Story" },
    ],
    sample: { slide_title: "A hundred-year story",
      story_block: { headline: "FOUR GENERATIONS · ONE HUNDRED YEARS",
        narrative: "Milk from our neighborhood — within 90 km of our dairy in Grigno — processed, aged and packaged entirely in our own plants." } } },

  // 2026-07-19 — "Story Card": full-bleed photo with a floating cream card holding the copy —
  // a more premium/editorial feel than the hard vertical split of v1/v2, for a standout photo that
  // deserves the whole frame.
  { id: "story/v3", label: "Story — Card", tag: "story card", family: "story",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "lifestyle", label: "Photo" },
      { id: "card_panel", role: "lock", kind: "shape", x: 560, y: 70, w: 340, h: 400, z: 2, fill: "$cream", radius: 20 },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 48, y: 34, w: 180, h: 72, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 592, y: 110, w: 280, h: 100, z: 5, fit: "shrink",
        font: { font: "$display", size: 26, italic: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 592, y: 224, w: 280, h: 210, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$ink", align: "left" } },
        ], label: "Story" },
    ],
    sample: { slide_title: "A hundred-year story",
      story_block: { headline: "FOUR GENERATIONS · ONE HUNDRED YEARS",
        narrative: "Milk from our neighborhood — within 90 km of our dairy in Grigno — processed, aged and packaged entirely in our own plants." } } },

  { id: "three-up/v1", label: "Three-up (pillars)", tag: "3 columns", family: "three-up",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$cream" },
      ACCENT_BAR, LOGO_TR,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 60, y: 52, w: 720, h: 60, z: 5, fit: "shrink",
        font: { font: "$display", size: 30, italic: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "img1", role: "var", kind: "image", fit: "cover", x: 60, y: 150, w: 260, h: 250, z: 4, tag: "lifestyle", label: "Image 1" },
      { id: "cap1", role: "var", kind: "text", x: 60, y: 410, w: 260, h: 80, z: 5, fit: "shrink", font: { font: "$ui", size: 14, color: "$ink", align: "center" }, label: "Caption 1" },
      { id: "img2", role: "var", kind: "image", fit: "cover", x: 350, y: 150, w: 260, h: 250, z: 4, tag: "lifestyle", label: "Image 2" },
      { id: "cap2", role: "var", kind: "text", x: 350, y: 410, w: 260, h: 80, z: 5, fit: "shrink", font: { font: "$ui", size: 14, color: "$ink", align: "center" }, label: "Caption 2" },
      { id: "img3", role: "var", kind: "image", fit: "cover", x: 640, y: 150, w: 260, h: 250, z: 4, tag: "lifestyle", label: "Image 3" },
      { id: "cap3", role: "var", kind: "text", x: 640, y: 410, w: 260, h: 80, z: 5, fit: "shrink", font: { font: "$ui", size: 14, color: "$ink", align: "center" }, label: "Caption 3" },
    ],
    sample: { slide_title: "Why Monti Trentini", cap1: "Alpine milk, within 90 km", cap2: "Family dairy since 1925", cap3: "Certified mountain origin" } },

  { id: "big-stat/v1", label: "Big stat", tag: "one number", family: "big-stat",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$primary" },
      ACCENT_BAR, LOGO_TC,
      { id: "stat_value", role: "var", kind: "text", x: 80, y: 150, w: 800, h: 210, z: 5, fit: "shrink",
        font: { font: "$display", size: 130, bold: true, color: "$cream", align: "center" }, label: "Stat (e.g. 100)" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 120, y: 372, w: 720, h: 80, z: 5, fit: "shrink",
        font: { font: "$display", size: 24, italic: true, color: "$mint", align: "center" }, label: "Label" },
    ],
    sample: { stat_value: "100", slide_title: "years of family cheesemaking" } },

  { id: "quote/v1", label: "Quote", tag: "testimonial", family: "quote",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 2, tag: "lifestyle", label: "Hero photo (optional)" },
      { id: "scrim", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 3, gradient: "linear-gradient(90deg, rgba(250,249,245,0.97) 34%, rgba(250,249,245,0.72) 56%, rgba(250,249,245,0) 100%)" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      LOGO_TR,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 110, y: 84, w: 740, h: 40, z: 5, fit: "shrink",
        font: { font: "$ui", size: 14, uppercase: true, bold: true, color: "$accent", align: "left" }, label: "Eyebrow / Title" },
      { id: "quote_block", role: "var", kind: "text", x: 110, y: 150, w: 740, h: 230, z: 5, fit: "shrink",
        font: { font: "$display", size: 40, italic: true, color: "$primary", align: "left" }, label: "Quote" },
      { id: "attribution", role: "var", kind: "text", x: 110, y: 410, w: 740, h: 50, z: 5, fit: "shrink",
        font: { font: "$ui", size: 18, color: "$charcoal", align: "left" }, label: "Attribution" },
    ],
    sample: { slide_title: "From our buyers", quote_block: "The mountain origin you can actually taste.", attribution: "— Specialty buyer, New York" } },

  { id: "product-range/v1", label: "Product range", tag: "catalog cards", family: "product-range",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$cream" },
      ACCENT_BAR, LOGO_TR,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 60, y: 52, w: 840, h: 60, z: 5, fit: "shrink",
        font: { font: "$display", size: 30, italic: true, color: "$primary", align: "center" }, label: "Title" },
      { id: "card1", role: "lock", kind: "shape", x: 60, y: 150, w: 260, h: 330, z: 2, fill: "$paper", radius: 14 },
      { id: "img1", role: "var", kind: "image", fit: "contain", x: 80, y: 170, w: 220, h: 220, z: 4, tag: "product", pick: 0, fills: "name1", label: "Product 1 image" },
      { id: "name1", role: "var", kind: "text", x: 60, y: 400, w: 260, h: 64, z: 5, fit: "shrink", font: { font: "$ui", size: 16, bold: true, color: "$primary", align: "center" }, label: "Product 1 name" },
      { id: "card2", role: "lock", kind: "shape", x: 350, y: 150, w: 260, h: 330, z: 2, fill: "$paper", radius: 14 },
      { id: "img2", role: "var", kind: "image", fit: "contain", x: 370, y: 170, w: 220, h: 220, z: 4, tag: "product", pick: 1, fills: "name2", label: "Product 2 image" },
      { id: "name2", role: "var", kind: "text", x: 350, y: 400, w: 260, h: 64, z: 5, fit: "shrink", font: { font: "$ui", size: 16, bold: true, color: "$primary", align: "center" }, label: "Product 2 name" },
      { id: "card3", role: "lock", kind: "shape", x: 640, y: 150, w: 260, h: 330, z: 2, fill: "$paper", radius: 14 },
      { id: "img3", role: "var", kind: "image", fit: "contain", x: 660, y: 170, w: 220, h: 220, z: 4, tag: "product", pick: 2, fills: "name3", label: "Product 3 image" },
      { id: "name3", role: "var", kind: "text", x: 640, y: 400, w: 260, h: 64, z: 5, fit: "shrink", font: { font: "$ui", size: 16, bold: true, color: "$primary", align: "center" }, label: "Product 3 name" },
    ],
    sample: { slide_title: "The Range", name1: "Asiago DOP", name2: "Squared Table", name3: "Alpine Classic" } },

  { id: "closing/v1", label: "Closing / CTA", tag: "ender", family: "closing",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$primary" },
      ACCENT_BAR,
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 360, y: 78, w: 240, h: 96, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 120, y: 228, w: 720, h: 120, z: 5, fit: "shrink",
        font: { font: "$display", size: 44, italic: true, color: "$cream", align: "center" }, label: "Headline" },
      { id: "cta_pill", role: "lock", kind: "shape", x: 360, y: 380, w: 240, h: 64, z: 4, fill: "$cream", radius: 999 },
      { id: "cta", role: "var", kind: "text", x: 360, y: 380, w: 240, h: 64, z: 6, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 20, bold: true, color: "$primary", align: "center" }, label: "Button text" },
      { id: "contact", role: "var", kind: "text", x: 120, y: 472, w: 720, h: 40, z: 6, fit: "shrink",
        font: { font: "$ui", size: 16, color: "$mint", align: "center" }, label: "Contact" },
    ],
    sample: { slide_title: "Let's bring the mountains to your table.", cta: "Request samples", contact: "hello@montitrentini.us" } },

  { id: "image/v1", label: "Image (full-bleed)", tag: "photo + caption", family: "image",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "hero", label: "Photo" },
      { id: "scrim", role: "lock", kind: "shape", x: 0, y: 400, w: 960, h: 140, z: 2, gradient: "linear-gradient(180deg,rgba(6,78,34,0),rgba(6,78,34,.78))" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 470, w: 880, h: 52, z: 3, fit: "shrink",
        font: { font: "$display", size: 22, italic: true, color: "$cream", align: "left" }, label: "Caption / Title" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 4, fill: "$accent" },
    ],
    sample: { slide_title: "Where cows graze in the Dolomites' shades." } },


  // 2026-09-07 — structural reference: docs/design-references/awesome-design-md/design-md/apple/DESIGN.md
  // ("edge-to-edge product tiles... UI chrome recedes so the product can speak — no decorative
  // gradients, no shadows on chrome"). Same hero_image/slide_title slot ids as image/v1 — Stage
  // 0/1 and Stage 2 (ai-compose.js) both already know how to fill this, only the geometry and
  // restraint differ. Departs from every other template in this file on purpose: no gradient
  // scrim, no rounded card, no bold/uppercase/italic caption. A single solid, opaque caption
  // plate replaces the usual scrim (Apple's "no decorative gradients" rule taken literally), and
  // the caption itself sits at a quieter weight than the house default — this is the one template
  // in the library built for a photo strong enough to need nothing else on the slide.
  { id: "image/v2", label: "Image — Editorial", tag: "gallery caption", family: "image",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "hero", label: "Photo" },
      { id: "caption_plate", role: "lock", kind: "shape", x: 0, y: 452, w: 460, h: 88, z: 4, fill: "$ink" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 468, w: 380, h: 56, z: 5, fit: "shrink",
        font: { font: "$display", size: 19, color: "$cream", align: "left" }, label: "Caption" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      { id: "brand_logo", role: "lock", kind: "image", fit: "contain", x: 806, y: 16, w: 130, h: 54, z: 9, asset: "$logo", toggle: true, tag: "logo", label: "Logo" },
    ],
    sample: { slide_title: "Aged twelve months, cut to order." } },

  // 2026-09-07 — ported from the Asiago hand-authored HTML pilot deck (3 compositions: Alta
  // Quota / Casa Finco Table / Vetta) into the real Content Engine template system per Rick's
  // request, so the moods live in the app itself and can be tweaked from Slide Studio rather than
  // staying a one-off standalone deck. Same slot-id vocabulary as the existing family members —
  // Stage 0/1 and Stage 2 need zero code changes. Colors/fonts still resolve through Brand Kit
  // tokens for every tenant; nothing here hardcodes Monti's actual hex values except the existing
  // file convention of literal rgba() overlays in `gradient` strings (see cover/v1's scrim, which
  // already does this) — kept neutral (black/white alpha) wherever the mood allows it.

  { id: "cover/v4", label: "Cover — Alta Quota", tag: "restrained editorial", family: "cover",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "hero", label: "Background photo" },
      { id: "caption_plate", role: "lock", kind: "shape", x: 0, y: 392, w: 560, h: 148, z: 4, fill: "$ink" },
      ACCENT_BAR, LOGO_TL,
      { id: "topic_label", role: "var", kind: "text", x: 40, y: 410, w: 480, h: 30, z: 5, fit: "shrink",
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$mint", align: "left" }, label: "Kicker" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 444, w: 480, h: 80, z: 5, fit: "shrink",
        font: { font: "$display", size: 30, italic: true, color: "$cream", align: "left" }, label: "Title" },
    ],
    sample: { topic_label: "Casa Finco · Casari dal 1925", slide_title: "Crafted for the Modern Table" } },

  { id: "cover/v5", label: "Cover — Casa Finco", tag: "warm card", family: "cover",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "img_shadow", role: "lock", kind: "shape", x: 492, y: 52, w: 436, h: 436, z: 2, fill: "rgba(20,20,19,.10)", radius: 24 },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 500, y: 60, w: 420, h: 420, z: 3, required: true, radius: 20, tag: "hero", label: "Photo" },
      { id: "kicker_pill", role: "lock", kind: "shape", x: 60, y: 130, w: 240, h: 44, z: 4, fill: "$primary", radius: 999 },
      { id: "topic_label", role: "var", kind: "text", x: 60, y: 130, w: 240, h: 44, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$cream", align: "center" }, label: "Kicker" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 60, y: 196, w: 400, h: 180, z: 5, fit: "shrink",
        font: { font: "$display", size: 36, italic: true, bold: true, color: "$primary", align: "left" }, label: "Title" },
      LOGO_TL,
    ],
    sample: { topic_label: "A Partner For Your Shelves", slide_title: "Happiness Has Plenty of Shapes" } },

  { id: "cover/v6", label: "Cover — Vetta", tag: "bold graphic", family: "cover",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$ink" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 480, y: 0, w: 480, h: 540, z: 2, required: true, tag: "hero", label: "Background photo", clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0% 100%)" },
      { id: "ribbon", role: "lock", kind: "shape", x: 0, y: 126, w: 300, h: 44, z: 4, fill: "$accent" },
      { id: "topic_label", role: "var", kind: "text", x: 24, y: 126, w: 260, h: 44, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$cream", align: "left" }, label: "Kicker" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 194, w: 420, h: 260, z: 5, fit: "shrink",
        font: { font: "$display", size: 56, italic: true, bold: true, color: "$cream", align: "left" }, label: "Title" },
      ACCENT_BAR, LOGO_TL,
    ],
    sample: { topic_label: "Casa Finco · Casari dal 1925", slide_title: "Asiago, Grown at Altitude" } },

  { id: "story/v4", label: "Story — Alta Quota", tag: "restrained editorial", family: "story",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "lifestyle", label: "Photo" },
      { id: "caption_plate", role: "lock", kind: "shape", x: 0, y: 360, w: 460, h: 180, z: 4, fill: "$ink" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 380, w: 400, h: 56, z: 5, fit: "shrink",
        font: { font: "$display", size: 24, italic: true, color: "$cream", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 40, y: 440, w: 400, h: 96, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$sage", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$cream", align: "left" } },
        ], label: "Story" },
      ACCENT_BAR, LOGO_TL,
    ],
    sample: { slide_title: "Why the Mountains Matter",
      story_block: { headline: "THE TERROIR", narrative: "The mountain is the difference your customers can taste." } } },

  { id: "story/v5", label: "Story — Casa Finco", tag: "warm card", family: "story",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "img_shadow", role: "lock", kind: "shape", x: 40, y: 52, w: 436, h: 436, z: 2, fill: "rgba(20,20,19,.08)", radius: 24 },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 48, y: 60, w: 420, h: 420, z: 3, required: true, radius: 20, tag: "lifestyle", label: "Photo" },
      { id: "card_panel", role: "lock", kind: "shape", x: 500, y: 100, w: 400, h: 340, z: 2, fill: "$cream", radius: 20 },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 532, y: 130, w: 336, h: 90, z: 5, fit: "shrink",
        font: { font: "$display", size: 28, italic: true, bold: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 532, y: 226, w: 336, h: 190, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$ink", align: "left" } },
        ], label: "Story" },
      LOGO_TR,
    ],
    sample: { slide_title: "A Hundred-Year Story",
      story_block: { headline: "ORIGIN", narrative: "The mountain origin isn't a marketing line; it's the product." } } },

  { id: "story/v6", label: "Story — Vetta", tag: "bold graphic", family: "story",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$ink" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 460, h: 540, z: 2, required: true, tag: "lifestyle", label: "Photo", clipPath: "polygon(0 0, 100% 0, 82% 100%, 0% 100%)" },
      { id: "ribbon", role: "lock", kind: "shape", x: 500, y: 70, w: 280, h: 40, z: 4, fill: "$accent" },
      { id: "topic_label", role: "var", kind: "text", x: 516, y: 70, w: 248, h: 40, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$cream", align: "left" }, label: "Kicker" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 500, y: 130, w: 420, h: 140, z: 5, fit: "shrink",
        font: { font: "$display", size: 40, italic: true, bold: true, color: "$cream", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 500, y: 280, w: 420, h: 200, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$sage", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 15, italic: true, color: "$mint", align: "left" } },
        ], label: "Story" },
      LOGO_TR,
    ],
    sample: { topic_label: "02 · Terroir", slide_title: "Why the Mountains Matter",
      story_block: { headline: "THE TERROIR", narrative: "The mountain is the difference your customers can taste." } } },

  { id: "product-feature/v4", label: "Product Feature — Alta Quota", tag: "restrained editorial", family: "product-feature",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg_panel", role: "lock", kind: "shape", x: 0, y: 0, w: 420, h: 540, z: 1, fill: "$paper" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 420, y: 0, w: 540, h: 540, z: 2, required: true, tag: "product", label: "Product photo" },
      { id: "rule_line", role: "lock", kind: "shape", x: 40, y: 116, w: 40, h: 2, z: 5, fill: "$primary" },
      ACCENT_BAR,
      { id: "topic_label", role: "var", kind: "text", x: 40, y: 128, w: 340, h: 32, z: 5, fit: "shrink",
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$primary", align: "left" }, label: "Topic" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 166, w: 340, h: 90, z: 5, fit: "shrink",
        font: { font: "$display", size: 26, italic: true, color: "$ink", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 40, y: 266, w: 340, h: 230, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$charcoal", align: "left" } },
        ], label: "Story" },
      LOGO_TL,
    ],
    sample: { slide_title: "Italian Certified Excellence", topic_label: "Special squared format cheese",
      story_block: { headline: "PRODUCED EXCLUSIVELY WITH ITALIAN COW'S MILK.", narrative: "A compact, elastic texture, perfect for slicing." } } },

  { id: "product-feature/v5", label: "Product Feature — Casa Finco", tag: "warm card", family: "product-feature",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "image_card", role: "lock", kind: "shape", x: 40, y: 60, w: 380, h: 420, z: 2, fill: "$cream", radius: 24 },
      { id: "hero_image", role: "var", kind: "image", fit: "contain", x: 60, y: 80, w: 340, h: 340, z: 4, required: true, radius: 16, tag: "product", label: "Product photo" },
      { id: "kicker_pill", role: "lock", kind: "shape", x: 460, y: 70, w: 220, h: 40, z: 4, fill: "$primary", radius: 999 },
      { id: "topic_label", role: "var", kind: "text", x: 460, y: 70, w: 220, h: 40, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$cream", align: "center" }, label: "Topic" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 460, y: 128, w: 440, h: 100, z: 5, fit: "shrink",
        font: { font: "$display", size: 28, italic: true, bold: true, color: "$primary", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 460, y: 238, w: 440, h: 220, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$accent", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$ink", align: "left" } },
        ], label: "Story" },
      { id: "emblem_overlay", role: "brand", kind: "image", fit: "contain", x: 340, y: 400, w: 80, h: 80, z: 6, asset: "$seal", tag: "seal", label: "Cert emblem" },
      LOGO_TR,
    ],
    sample: { slide_title: "Italian Certified Excellence", topic_label: "Special squared format cheese",
      story_block: { headline: "PRODUCED EXCLUSIVELY WITH ITALIAN COW'S MILK.", narrative: "A compact, elastic texture, perfect for slicing." } } },

  { id: "product-feature/v6", label: "Product Feature — Vetta", tag: "bold graphic", family: "product-feature",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$ink" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 480, h: 540, z: 2, required: true, tag: "product", label: "Product photo", clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0% 100%)" },
      { id: "ribbon", role: "lock", kind: "shape", x: 520, y: 60, w: 300, h: 44, z: 4, fill: "$accent" },
      { id: "topic_label", role: "var", kind: "text", x: 536, y: 60, w: 268, h: 44, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$cream", align: "left" }, label: "Topic" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 520, y: 130, w: 400, h: 130, z: 5, fit: "shrink",
        font: { font: "$display", size: 34, italic: true, bold: true, color: "$cream", align: "left" }, label: "Title" },
      { id: "story_block", role: "var", as: "story", kind: "text", x: 520, y: 270, w: 400, h: 200, z: 5, fit: "shrink",
        parts: [
          { id: "headline", font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$sage", align: "left" } },
          { id: "narrative", font: { font: "$display", size: 14, italic: true, color: "$mint", align: "left" } },
        ], label: "Story" },
      LOGO_TR,
    ],
    sample: { slide_title: "Italian Certified Excellence", topic_label: "Special squared format cheese",
      story_block: { headline: "PRODUCED EXCLUSIVELY WITH ITALIAN COW'S MILK.", narrative: "A compact, elastic texture, perfect for slicing." } } },

  { id: "big-stat/v2", label: "Big stat — Alta Quota", tag: "restrained editorial", family: "big-stat",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 600, y: 0, w: 360, h: 540, z: 2, tag: "product", label: "Photo (optional)" },
      { id: "rule_line", role: "lock", kind: "shape", x: 40, y: 140, w: 40, h: 2, z: 5, fill: "$primary" },
      { id: "stat_value", role: "var", kind: "text", x: 40, y: 150, w: 520, h: 240, z: 5, fit: "shrink",
        font: { font: "$display", size: 150, italic: true, color: "$primary", align: "left" }, label: "Stat (e.g. 9)" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 400, w: 520, h: 80, z: 5, fit: "shrink",
        font: { font: "$display", size: 20, italic: true, color: "$charcoal", align: "left" }, label: "Label" },
      ACCENT_BAR, LOGO_TL,
    ],
    sample: { stat_value: "9", slide_title: "months aged" } },

  { id: "big-stat/v3", label: "Big stat — Casa Finco", tag: "warm card", family: "big-stat",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "statcard", role: "lock", kind: "shape", x: 60, y: 70, w: 380, h: 400, z: 2, fill: "$primary", radius: 28 },
      { id: "stat_value", role: "var", kind: "text", x: 60, y: 100, w: 380, h: 260, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$display", size: 120, italic: true, bold: true, color: "$cream", align: "center" }, label: "Stat (e.g. 9)" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 60, y: 380, w: 380, h: 70, z: 6, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 14, uppercase: true, bold: true, color: "$mint", align: "center" }, label: "Label" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 500, y: 70, w: 400, h: 400, z: 3, radius: 24, tag: "product", label: "Photo (optional)" },
      LOGO_TR,
    ],
    sample: { stat_value: "9", slide_title: "months aged" } },

  { id: "big-stat/v4", label: "Big stat — Vetta", tag: "bold graphic", family: "big-stat",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$ink" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 600, y: 0, w: 360, h: 540, z: 2, tag: "product", label: "Photo (optional)" },
      { id: "ribbon", role: "lock", kind: "shape", x: 60, y: 70, w: 220, h: 34, z: 4, fill: "$accent" },
      { id: "topic_label", role: "var", kind: "text", x: 76, y: 70, w: 190, h: 34, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 11, uppercase: true, bold: true, color: "$ink", align: "left" }, label: "Kicker" },
      { id: "stat_value", role: "var", kind: "text", x: 60, y: 120, w: 480, h: 280, z: 5, fit: "shrink",
        font: { font: "$display", size: 200, italic: true, bold: true, gradient: "linear-gradient(120deg, $sage, $accent)", align: "left" }, label: "Stat (e.g. 9)" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 60, y: 410, w: 480, h: 90, z: 5, fit: "shrink",
        font: { font: "$display", size: 24, italic: true, color: "$cream", align: "left" }, label: "Label" },
      LOGO_TR,
    ],
    sample: { stat_value: "9", slide_title: "months aged" } },

  { id: "closing/v2", label: "Closing — Alta Quota", tag: "restrained editorial", family: "closing",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 260, z: 1, tag: "hero", label: "Photo (optional)" },
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 260, w: 960, h: 280, z: 2, fill: "$paper" },
      ACCENT_BAR,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 80, y: 300, w: 800, h: 90, z: 5, fit: "shrink",
        font: { font: "$display", size: 32, italic: true, color: "$ink", align: "center" }, label: "Headline" },
      { id: "cta_pill", role: "lock", kind: "shape", x: 360, y: 410, w: 240, h: 60, z: 4, fill: "$primary", radius: 999 },
      { id: "cta", role: "var", kind: "text", x: 360, y: 410, w: 240, h: 60, z: 6, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 18, bold: true, color: "$cream", align: "center" }, label: "Button text" },
      { id: "contact", role: "var", kind: "text", x: 80, y: 482, w: 800, h: 30, z: 6, fit: "shrink",
        font: { font: "$ui", size: 14, color: "$charcoal", align: "center" }, label: "Contact" },
      LOGO_TL,
    ],
    sample: { slide_title: "Let's bring the mountains to your table.", cta: "Request samples", contact: "hello@montitrentini.us" } },

  { id: "closing/v3", label: "Closing — Casa Finco", tag: "warm card", family: "closing",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$mint" },
      { id: "card", role: "lock", kind: "shape", x: 140, y: 70, w: 680, h: 400, z: 2, fill: "$cream", radius: 28 },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 180, y: 120, w: 600, h: 110, z: 5, fit: "shrink",
        font: { font: "$display", size: 32, italic: true, bold: true, color: "$primary", align: "center" }, label: "Headline" },
      { id: "cta_pill", role: "lock", kind: "shape", x: 360, y: 320, w: 240, h: 60, z: 4, fill: "$primary", radius: 999 },
      { id: "cta", role: "var", kind: "text", x: 360, y: 320, w: 240, h: 60, z: 6, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 18, bold: true, color: "$cream", align: "center" }, label: "Button text" },
      { id: "contact", role: "var", kind: "text", x: 180, y: 400, w: 600, h: 40, z: 6, fit: "shrink",
        font: { font: "$ui", size: 14, color: "$charcoal", align: "center" }, label: "Contact" },
      LOGO_TC,
    ],
    sample: { slide_title: "Let's bring the mountains to your table.", cta: "Request samples", contact: "hello@montitrentini.us" } },

  { id: "closing/v4", label: "Closing — Vetta", tag: "bold graphic", family: "closing",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$ink" },
      { id: "ribbon", role: "lock", kind: "shape", x: 330, y: 140, w: 300, h: 40, z: 4, fill: "$accent" },
      { id: "topic_label", role: "var", kind: "text", x: 330, y: 140, w: 300, h: 40, z: 5, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 12, uppercase: true, bold: true, color: "$ink", align: "center" }, label: "Kicker" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 80, y: 196, w: 800, h: 140, z: 5, fit: "shrink",
        font: { font: "$display", size: 46, italic: true, bold: true, color: "$cream", align: "center" }, label: "Headline" },
      { id: "cta_pill", role: "lock", kind: "shape", x: 360, y: 400, w: 240, h: 60, z: 4, fill: "$accent", radius: 999 },
      { id: "cta", role: "var", kind: "text", x: 360, y: 400, w: 240, h: 60, z: 6, fit: "shrink", vcenter: true,
        font: { font: "$ui", size: 18, bold: true, color: "$ink", align: "center" }, label: "Button text" },
      { id: "contact", role: "var", kind: "text", x: 80, y: 480, w: 800, h: 30, z: 6, fit: "shrink",
        font: { font: "$ui", size: 14, color: "$mint", align: "center" }, label: "Contact" },
      LOGO_TC,
    ],
    sample: { topic_label: "A Partner For Your Shelves", slide_title: "Happiness Has Plenty of Shapes", cta: "Request samples", contact: "hello@montitrentini.us" } },
];

export const getSlideTemplate = (id) => SLIDE_TEMPLATES.find((t) => t.id === id) || SLIDE_TEMPLATES[0];

// 2026-07-19 — layout variety (Rick: "auto-compose creates one deck the same every time"). A
// `family` groups templates that are real, hand-designed alternates for the same slide "type"
// (same core slot-id vocabulary — hero_image/slide_title/topic_label/story_block, etc. — so any
// value already resolved for one variant drops straight into another with zero data loss). Used
// by (a) Slide Studio's "change layout" picker to group variants together, and (b) ai-compose.js
// to let AI Polish reassign a slide's layout ONLY to one of its own real, already-designed
// alternates — never an invented id, never a cross-family jump. `familyOf`/`templateAlternates`
// return null/[] for an unknown or legacy (plain-string) slide rather than falling back to
// SLIDE_TEMPLATES[0]'s family, since a legacy slide has no real alternates to offer.
export const familyOf = (id) => {
  if (!id) return null;
  const t = SLIDE_TEMPLATES.find((t) => t.id === id);
  return t?.family || null;
};

export const templateAlternates = (id) => {
  const fam = familyOf(id);
  if (!fam) return [];
  return SLIDE_TEMPLATES.filter((t) => t.family === fam && t.id !== id).map((t) => ({ id: t.id, label: t.label }));
};

/** First filled var-image public_id in a structured slide (used for deck cover thumbnails). */
export function firstImageId(slide) {
  if (!slide || typeof slide === "string") return null;
  const tpl = getSlideTemplate(slide.t);
  const s = tpl.slots.find((x) => x.kind === "image" && x.role === "var" && slide.slots?.[x.id]);
  return s ? slide.slots[s.id] : null;
}
