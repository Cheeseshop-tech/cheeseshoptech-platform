// House default tokens (warm artisanal: Terracotta + Cellar Olive — see DESIGN_SYSTEM A2).
// Tenants override primary/accent with their own brand. Single source of truth for fallbacks.
// Locked tokens are baked into src/index.css; these are the values the resolver
// falls back to when a client config omits an overridable field.

export const HOUSE = {
  brand: {
    name: "CheeseShop TECH",
    logo: "/brand/cstech-wordmark.svg",
    colors: { primary: "#9A3B1B", accent: "#5F6B2E" }, // Terracotta + Cellar Olive (house brand)
    fonts: { heading: "Fraunces", body: "Inter" },
    radius: "md",
  },
  // Landing-hub content for the agency house view (tenants supply their own in config).
  // Stats here are computed (cross-tenant rollup) — see lib/hub-stats.js.
  home: {
    eyebrow: "Multi-tenant platform · Posada & Co.",
    title: "Command Center",
    tagline:
      "Every client portal, tool, and campaign on one canonical platform — themed per tenant, owned by CheeseShop TECH.",
    footer: "One platform. Every client, their own brand.",
  },
};

// Named radius step -> CSS length, matching index.css scale.
export const RADIUS_SCALE = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
};

// Font allowlist (mirrors config/clients/client.schema.json) with web-safe fallbacks.
export const FONT_STACKS = {
  Inter: '"Inter", system-ui, sans-serif',
  Fraunces: '"Fraunces", Georgia, serif',
  "Playfair Display": '"Playfair Display", Georgia, serif',
  Lora: '"Lora", Georgia, serif',
  "Source Sans 3": '"Source Sans 3", system-ui, sans-serif',
  "Work Sans": '"Work Sans", system-ui, sans-serif',
  "Libre Franklin": '"Libre Franklin", system-ui, sans-serif',
  Merriweather: '"Merriweather", Georgia, serif',
  "JetBrains Mono": '"JetBrains Mono", ui-monospace, monospace',
};

export function fontStack(name) {
  return FONT_STACKS[name] || FONT_STACKS.Inter;
}
