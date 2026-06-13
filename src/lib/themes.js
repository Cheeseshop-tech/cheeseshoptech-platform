// Theme Engine (BRAND_KIT_AND_PROPOSAL_SPEC §3 / Scope §7). Each theme is a composed LAYOUT
// system — a different REGISTER of the same brand kit, not a departure from it. The brand kit is
// fixed (one mind, one body); a theme decides which colors lead, the spacing density, the type
// register, and the fixed image-placement zones for each proposal page (cover, story, product).
//
// Q1 (Rick): both — a CheeseShop TECH capability demo AND a live per-tenant selector.
// Q2 (Rick): a "placement zone" is a fixed area where imagery goes, so text / header / logo are
// always well-composed around it.
//
// 2026-06-13 design session: the full FIVE registers, mapped to Monti's four channels + a flagship.
// All five are built from the same brand kit colors/type — they are registers, not new brands.
//
// Token vocabulary the renderer (proposal-view.jsx) understands:
//   lead          which color leads surfaces: "primary" | "accent" | "ink" | "cream"
//   density       vertical rhythm + cover height + measure: "airy" | "regular" | "compact"
//   typeRegister  heading voice: "display" (serif italic) | "grand" (oversized serif) | "ui" (sans)
//   cover         cover composition: "hero-overlay" | "split" | "minimal"
//   product       range layout: "image-left" | "grid-two-up" | "grid-three-up" | "list-compact"

export const THEMES = [
  {
    id: "heritage-editorial",
    name: "Heritage Editorial",
    register: "Warm, rooted, story-first",
    channel: "Provenance & heritage pitches",
    description:
      "The brand's default register — editorial serif display, generous space, the story leads. Best for heritage and provenance pitches.",
    tokens: { lead: "primary", density: "airy", typeRegister: "display", cover: "hero-overlay", product: "image-left" },
  },
  {
    id: "fresh-market",
    name: "Fresh Market",
    register: "Bright, retail-ready, product-first",
    channel: "Specialty grocers & retail",
    description:
      "Lighter and product-forward — the Italia Green accent leads, a tighter grid, packshots up front. Best for retail and grocery buyers.",
    tokens: { lead: "accent", density: "compact", typeRegister: "ui", cover: "split", product: "grid-two-up" },
  },
  {
    id: "chefs-table",
    name: "Chef's Table",
    register: "Dark, intimate, ingredient-forward",
    channel: "Restaurants & chefs (foodservice)",
    description:
      "A moody, image-led register on Mountain Ink — large photography and an editorial serif voice. Built for chefs who buy with their eyes. Best for foodservice.",
    tokens: { lead: "ink", density: "regular", typeRegister: "display", cover: "hero-overlay", product: "image-left" },
  },
  {
    id: "trade-brief",
    name: "Trade Brief",
    register: "Dense, efficient, numbers-forward",
    channel: "Distributors & B2B",
    description:
      "A no-nonsense register for distributor buyers — Forest Green leads, a compact sans voice, and a tight range table that puts the full line and live pricing front and center. Minimal imagery, maximum signal.",
    tokens: { lead: "primary", density: "compact", typeRegister: "ui", cover: "split", product: "list-compact" },
  },
  {
    id: "alpine-gallery",
    name: "Alpine Gallery",
    register: "Premium, minimal, gallery-quiet",
    channel: "Retail chains & flagship",
    description:
      "The premium register — Heritage Cream canvas, oversized serif display, and a quiet gallery grid with abundant white space. For flagship and national-chain pitches where restraint signals quality.",
    tokens: { lead: "cream", density: "airy", typeRegister: "grand", cover: "minimal", product: "grid-three-up" },
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(themeId) {
  return THEMES.find((t) => t.id === themeId) || THEMES[0];
}

/**
 * Resolve a theme's working colors from the tenant's brand kit (the single source).
 * `lead` is the color that leads surfaces; `onLead` is the legible color to sit on it.
 * "cream"-led themes lead with a light canvas and use the primary brand color for type/accents.
 */
export function themeColors(theme, kit) {
  const c = kit?.identity?.colors;
  const primary = c?.primary?.hex || "#064E22";
  const accent = c?.accent?.hex || "#009640";
  const cream =
    (c?.neutrals || []).find((n) => /cream|paper/i.test(n.name))?.hex || "#FFFBDC";
  const ink =
    (c?.neutrals || []).find((n) => /ink|charcoal|mountain/i.test(n.name))?.hex || "#141413";

  const leadMap = { accent, ink, cream, primary };
  const lead = leadMap[theme.tokens.lead] || primary;
  // For a light (cream) lead, type/accents fall back to the primary brand color so headings read.
  const onCanvas = theme.tokens.lead === "cream" ? primary : lead;
  return { primary, accent, cream, ink, lead, onCanvas };
}

/**
 * Map a theme's density + typeRegister tokens to concrete Tailwind/utility classes, so the
 * renderer expresses them visually instead of ignoring them. One place to tune the whole system.
 */
export function themeSpec(theme) {
  const t = theme.tokens;

  const density = {
    airy: {
      measure: "max-w-5xl",
      section: "mt-16",
      storyGap: "space-y-14",
      coverH: "h-[440px]",
      coverPad: "p-10 md:p-12",
      intro: "mt-10 max-w-3xl text-xl",
    },
    regular: {
      measure: "max-w-5xl",
      section: "mt-12",
      storyGap: "space-y-10",
      coverH: "h-[380px]",
      coverPad: "p-8",
      intro: "mt-8 max-w-3xl text-xl",
    },
    compact: {
      measure: "max-w-4xl",
      section: "mt-9",
      storyGap: "space-y-7",
      coverH: "h-[300px]",
      coverPad: "p-6 md:p-8",
      intro: "mt-6 max-w-2xl text-lg",
    },
  }[t.density] || {};

  const type = {
    display: { heading: "cs-display", coverTitle: "cs-display text-4xl md:text-5xl", eyebrow: "cs-eyebrow" },
    grand: { heading: "cs-display", coverTitle: "cs-display text-5xl md:text-6xl", eyebrow: "cs-eyebrow tracking-[0.18em]" },
    ui: { heading: "font-heading font-semibold", coverTitle: "font-heading font-bold text-3xl md:text-4xl", eyebrow: "cs-eyebrow" },
  }[t.typeRegister] || {};

  return { ...density, ...type };
}
