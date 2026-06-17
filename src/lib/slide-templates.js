// Slide template definitions for the Content Studio template engine (TEMPLATE_ENGINE_SPEC.md).
// A template = an id + a layout of typed SLOTS. Slot types:
//   image      → a Media Hub public_id (filled via MediaPicker)
//   brandCopy  → copy filled from a Brand Kit story block / topic, or free text
//   text       → free text
// Logo / colors / fonts are painted automatically from the Brand Kit in SlideRenderer.
export const SLIDE_TEMPLATES = [
  {
    id: "image",
    label: "Image (full-bleed)",
    slots: [{ key: "hero", label: "Image", type: "image" }],
  },
  {
    id: "cover",
    label: "Cover",
    slots: [
      { key: "hero", label: "Background image", type: "image" },
      { key: "title", label: "Title", type: "text" },
      { key: "tagline", label: "Tagline", type: "brandCopy" },
    ],
  },
  {
    id: "statement",
    label: "Statement",
    slots: [
      { key: "headline", label: "Headline", type: "brandCopy" },
      { key: "subtext", label: "Subtext", type: "text" },
    ],
  },
  {
    id: "story",
    label: "Story (image + copy)",
    slots: [
      { key: "image", label: "Image", type: "image" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body", type: "brandCopy" },
    ],
  },
  {
    id: "threeUp",
    label: "Three-up (pillars)",
    slots: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "img1", label: "Image 1", type: "image" },
      { key: "cap1", label: "Caption 1", type: "text" },
      { key: "img2", label: "Image 2", type: "image" },
      { key: "cap2", label: "Caption 2", type: "text" },
      { key: "img3", label: "Image 3", type: "image" },
      { key: "cap3", label: "Caption 3", type: "text" },
    ],
  },
  {
    id: "stat",
    label: "Big stat",
    slots: [
      { key: "value", label: "Stat (e.g. 300%)", type: "text" },
      { key: "label", label: "Label", type: "text" },
    ],
  },
  {
    id: "quote",
    label: "Quote",
    slots: [
      { key: "quote", label: "Quote", type: "brandCopy" },
      { key: "attribution", label: "Attribution", type: "text" },
    ],
  },
  {
    id: "range",
    label: "Product range",
    slots: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "img1", label: "Product 1 image", type: "image" },
      { key: "name1", label: "Product 1 name", type: "text" },
      { key: "img2", label: "Product 2 image", type: "image" },
      { key: "name2", label: "Product 2 name", type: "text" },
      { key: "img3", label: "Product 3 image", type: "image" },
      { key: "name3", label: "Product 3 name", type: "text" },
    ],
  },
  {
    id: "closing",
    label: "Closing / CTA",
    slots: [
      { key: "headline", label: "Headline", type: "brandCopy" },
      { key: "cta", label: "Call to action", type: "text" },
      { key: "contact", label: "Contact", type: "text" },
    ],
  },
];

export const getSlideTemplate = (id) => SLIDE_TEMPLATES.find((t) => t.id === id) || SLIDE_TEMPLATES[0];

/** The first image slot's public_id in a structured slide (used for deck cover thumbnails). */
export function firstImageId(slide) {
  if (!slide || typeof slide === "string") return null;
  const tpl = getSlideTemplate(slide.t);
  const imgSlot = tpl.slots.find((s) => s.type === "image");
  return imgSlot ? slide.slots?.[imgSlot.key] || null : null;
}
