// WCAG 2.1 relative-luminance + contrast utilities. Powers the B3 AA guardrail.

function srgbToLinear(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** Parse "#rrggbb" -> [r,g,b] (0-255). Returns null if invalid. */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance (0-1) of a hex color. */
export function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colors (1:1 .. 21:1). */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = "#ffffff";
const ESPRESSO = "#221c14"; // house near-black

/**
 * Pick the on-color (text/icon color) for a given brand background that maximizes
 * contrast, and report whether it clears WCAG AA for normal text (>= 4.5:1).
 */
export function resolveOnColor(bgHex, threshold = 4.5) {
  const onWhite = contrastRatio(bgHex, WHITE);
  const onEspresso = contrastRatio(bgHex, ESPRESSO);
  const best = onWhite >= onEspresso ? WHITE : ESPRESSO;
  const ratio = Math.max(onWhite, onEspresso);
  return { onColor: best, ratio, passesAA: ratio >= threshold };
}
