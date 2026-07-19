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
  { id: "product-feature/v1", label: "Product Feature", tag: "flagship",
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

  { id: "cover/v1", label: "Cover", tag: "opener",
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

  { id: "statement/v1", label: "Statement", tag: "big idea",
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

  { id: "story/v1", label: "Story", tag: "image + copy",
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

  { id: "three-up/v1", label: "Three-up (pillars)", tag: "3 columns",
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

  { id: "big-stat/v1", label: "Big stat", tag: "one number",
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

  { id: "quote/v1", label: "Quote", tag: "testimonial",
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

  // Affineur's Note — first-person expert tasting note, optionally SKU-linked. Pattern origin:
  // docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md (La Fromagerie reference — "the
  // affineur's note... a first-person expert tasting note voice"). Fires only when a kit's
  // (optional) tastingNotes carries content — see AGENT_A1_BUILD_SPEC.md Part F.
  { id: "affineurs-note/v1", label: "Affineur's Note", tag: "tasting note",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "bg", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 540, z: 1, fill: "$paper" },
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 384, h: 540, z: 2, tag: "product", label: "Product photo (optional)" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 6, fill: "$accent" },
      LOGO_TR,
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 424, y: 90, w: 480, h: 40, z: 5, fit: "shrink",
        font: { font: "$ui", size: 14, uppercase: true, bold: true, color: "$accent", align: "left" }, label: "Eyebrow (e.g. Tasting Note)" },
      { id: "note_block", role: "var", kind: "text", x: 424, y: 140, w: 480, h: 260, z: 5, fit: "shrink",
        font: { font: "$display", size: 22, italic: true, color: "$primary", align: "left" }, label: "Note (first person)" },
      { id: "attribution", role: "var", kind: "text", x: 424, y: 420, w: 480, h: 50, z: 5, fit: "shrink",
        font: { font: "$ui", size: 16, color: "$charcoal", align: "left" }, label: "Attribution (who's speaking)" },
    ],
    sample: { slide_title: "Tasting Note",
      note_block: "Nutty and lightly grassy at the rind, giving way to a firm, saline core — the alpine pasture is there if you slow down for it.",
      attribution: "— Casaro, Casa Finco" } },

  { id: "product-range/v1", label: "Product range", tag: "catalog cards",
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

  { id: "closing/v1", label: "Closing / CTA", tag: "ender",
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

  { id: "image/v1", label: "Image (full-bleed)", tag: "photo + caption",
    canvas: { w: 960, h: 540 },
    slots: [
      { id: "hero_image", role: "var", kind: "image", fit: "cover", x: 0, y: 0, w: 960, h: 540, z: 1, required: true, tag: "hero", label: "Photo" },
      { id: "scrim", role: "lock", kind: "shape", x: 0, y: 400, w: 960, h: 140, z: 2, gradient: "linear-gradient(180deg,rgba(6,78,34,0),rgba(6,78,34,.78))" },
      { id: "slide_title", role: "var", as: "title", kind: "text", x: 40, y: 470, w: 880, h: 52, z: 3, fit: "shrink",
        font: { font: "$display", size: 22, italic: true, color: "$cream", align: "left" }, label: "Caption / Title" },
      { id: "top_accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w: 960, h: 8, z: 4, fill: "$accent" },
    ],
    sample: { slide_title: "Where cows graze in the Dolomites' shades." } },
];

export const getSlideTemplate = (id) => SLIDE_TEMPLATES.find((t) => t.id === id) || SLIDE_TEMPLATES[0];

/** First filled var-image public_id in a structured slide (used for deck cover thumbnails). */
export function firstImageId(slide) {
  if (!slide || typeof slide === "string") return null;
  const tpl = getSlideTemplate(slide.t);
  const s = tpl.slots.find((x) => x.kind === "image" && x.role === "var" && slide.slots?.[x.id]);
  return s ? slide.slots[s.id] : null;
}
