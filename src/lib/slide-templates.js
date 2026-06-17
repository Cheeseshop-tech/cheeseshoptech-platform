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
];

export const getSlideTemplate = (id) => SLIDE_TEMPLATES.find((t) => t.id === id) || SLIDE_TEMPLATES[0];

/** The first image slot's public_id in a structured slide (used for deck cover thumbnails). */
export function firstImageId(slide) {
  if (!slide || typeof slide === "string") return null;
  const tpl = getSlideTemplate(slide.t);
  const imgSlot = tpl.slots.find((s) => s.type === "image");
  return imgSlot ? slide.slots?.[imgSlot.key] || null : null;
}
