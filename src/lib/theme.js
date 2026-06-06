// Theme injector. Writes the resolved tenant's overridable tokens onto :root as CSS
// custom properties, loads the client web font on demand, and enforces the WCAG AA
// contrast guardrail (DESIGN_SYSTEM.md B3). Locked tokens stay in index.css.

import { RADIUS_SCALE, fontStack } from "./tokens.js";

const loadedFonts = new Set();

function loadGoogleFont(name) {
  if (typeof document === "undefined") return;
  if (loadedFonts.has(name)) return;
  // House fonts are already in index.html; skip them.
  if (["Fraunces", "Inter", "JetBrains Mono"].includes(name)) {
    loadedFonts.add(name);
    return;
  }
  const family = name.replace(/ /g, "+");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(name);
}

/** Apply a resolved client (from resolveClient) to the document root. */
export function applyTheme(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { brand, onPrimary, onAccent } = resolved;

  // Contrast guardrail — warn loudly if a client color can't reach AA on either on-color.
  if (!onPrimary.passesAA) {
    console.warn(
      `[CheeseShop TECH] brand.primary ${brand.colors.primary} for "${resolved.id}" ` +
        `only reaches ${onPrimary.ratio.toFixed(2)}:1 (needs >= 4.5:1). ` +
        `Using ${onPrimary.onColor} as the safest on-color.`
    );
  }
  if (!onAccent.passesAA) {
    console.warn(
      `[CheeseShop TECH] brand.accent ${brand.colors.accent} for "${resolved.id}" ` +
        `only reaches ${onAccent.ratio.toFixed(2)}:1 (needs >= 4.5:1).`
    );
  }

  root.style.setProperty("--cs-color-brand-primary", brand.colors.primary);
  root.style.setProperty("--cs-color-on-primary", onPrimary.onColor);
  root.style.setProperty("--cs-color-brand-accent", brand.colors.accent);
  root.style.setProperty("--cs-color-on-accent", onAccent.onColor);
  root.style.setProperty("--cs-font-heading", fontStack(brand.fonts.heading));
  root.style.setProperty("--cs-font-body", fontStack(brand.fonts.body));
  root.style.setProperty("--cs-radius-base", RADIUS_SCALE[brand.radius] || RADIUS_SCALE.md);

  loadGoogleFont(brand.fonts.heading);
  loadGoogleFont(brand.fonts.body);
}
