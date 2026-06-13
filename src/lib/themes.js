// Theme Engine (BRAND_KIT_AND_PROPOSAL_SPEC §3 / Scope §7). Each theme is a composed LAYOUT
// system — a different register of the same brand kit, not a departure from it. The brand kit
// is fixed; a theme decides which colors lead, the spacing density, the type register, and the
// fixed image-placement zones for each proposal page (cover, story, product). Q2 (Rick): a
// "placement zone" is a fixed area on the page where imagery goes, so text / header / logo are
// always well-composed around it.
//
// Q1 (Rick): both — a CheeseShop TECH capability demo AND a live per-tenant selector.
// Phase: one theme end-to-end now (proof of concept); the full five are designed in a dedicated
// session. These two are working registers to build and validate the engine against.

export const THEMES = [
  {
    id: "heritage-editorial",
    name: "Heritage Editorial",
    register: "Warm, rooted, story-first",
    description: "The brand's default register — editorial serif display, generous space, the story leads. Best for heritage and provenance pitches.",
    tokens: {
      lead: "primary",        // brand color that leads surfaces
      density: "airy",
      typeRegister: "display", // editorial serif for headings
      cover: "hero-overlay",   // full-bleed hero image zone, logo top, title overlaid lower
      product: "image-left",   // image zone left, details right (one per row)
    },
  },
  {
    id: "fresh-market",
    name: "Fresh Market",
    register: "Bright, retail-ready, product-first",
    description: "Lighter and product-forward — accent leads, tighter grid, packshots up front. Best for retail and grocery buyers.",
    tokens: {
      lead: "accent",
      density: "compact",
      typeRegister: "ui",
      cover: "split",          // logo + title left, hero image zone right
      product: "grid-two-up",  // two product cards per row, image zone on top
    },
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(themeId) {
  return THEMES.find((t) => t.id === themeId) || THEMES[0];
}

/** Resolve a theme's lead/secondary colors from the tenant's brand kit (single source). */
export function themeColors(theme, kit) {
  const c = kit?.identity?.colors;
  const primary = c?.primary?.hex || "#064E22";
  const accent = c?.accent?.hex || "#009640";
  const cream = (c?.neutrals || []).find((n) => /cream|paper/i.test(n.name))?.hex || "#FFFBDC";
  const ink = (c?.neutrals || []).find((n) => /ink|charcoal/i.test(n.name))?.hex || "#141413";
  const lead = theme.tokens.lead === "accent" ? accent : primary;
  return { primary, accent, cream, ink, lead };
}
