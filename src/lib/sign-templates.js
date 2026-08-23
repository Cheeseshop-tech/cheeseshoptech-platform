// Cheese Signs — template manifests (docs/CHEESE_SIGNS_SPEC.md).
// Same slot grammar as src/lib/slide-templates.js: role / kind / x,y,w,h / z / $tokens.
// Difference from slides: the canvas is a PHYSICAL sheet, not a screen. Canvas units are
// 100 per inch, so a 3x4 in sign is 300x400 and 1 pt = 1.389 units (see PT below).
// Bleed is NOT in the canvas — it is added by the print export (spec §7).
//
// Slots are filled from a SIGN RECORD (src/data/<tenant>/signs.json), one per cheese, not
// per SKU. The Studio Director fills every var slot deterministically from that record;
// nothing on a sign face is typed by hand.

const PT = 1.389; // canvas units per typographic point

export const SIGN_SIZES = [
  { id: "3x4", label: '3" × 4"', w: 300, h: 400, pad: 17 },
  { id: "4x5", label: '4" × 5"', w: 400, h: 500, pad: 22 },
];

// ---- shared slot builders ---------------------------------------------------------------
const bar = (w) => ({ id: "accent_bar", role: "lock", kind: "shape", x: 0, y: 0, w, h: 5.5, z: 2, fill: "$accent" });

const wordmark = (w, s) => ([
  { id: "brand_wordmark", role: "lock", kind: "text", x: 0, y: 13 * s, w, h: 11 * s, z: 8, value: "MONTI TRENTINI",
    font: { font: "$ui", size: 6.4 * PT * s, bold: true, uppercase: true, tracking: 0.2, color: "$primary", align: "center" } },
  { id: "brand_line", role: "lock", kind: "text", x: 0, y: 23 * s, w, h: 9 * s, z: 8, value: "Casari dal 1925 · Grigno, Valsugana",
    font: { font: "$display", size: 5 * PT * s, italic: true, color: "$muted", align: "center" } },
]);

// The spec rail: milk icon + region icon + minimum age. Bound to the sign record, never typed.
const rail = (x, y, w, s) => ([
  { id: "milk_icon", role: "lock", kind: "image", fit: "contain", x, y, w: 28 * s, h: 19 * s, z: 5, asset: "$icon:cow", label: "Milk icon" },
  { id: "milk_type", role: "var", kind: "text", binds: "milk.type", x: x + 32 * s, y, w: 62 * s, h: 9 * s, z: 5,
    font: { font: "$ui", size: 5.6 * PT * s, bold: true, color: "$primary" } },
  { id: "milk_detail", role: "var", kind: "text", binds: "milk.detail", x: x + 32 * s, y: y + 9 * s, w: 62 * s, h: 11 * s, z: 5,
    font: { font: "$ui", size: 4.7 * PT * s, color: "$muted" }, clamp: 2 },
  { id: "region_icon", role: "lock", kind: "image", fit: "contain", x: x + 100 * s, y, w: 28 * s, h: 19 * s, z: 5,
    asset: "$icon:region", bindsAsset: "region.icon", label: "Region illustration" },
  { id: "region_label", role: "var", kind: "text", binds: "region.label", x: x + 132 * s, y, w: 62 * s, h: 9 * s, z: 5,
    font: { font: "$ui", size: 5.6 * PT * s, bold: true, color: "$primary" } },
  { id: "region_sub", role: "var", kind: "text", binds: "region.sub", x: x + 132 * s, y: y + 9 * s, w: 62 * s, h: 11 * s, z: 5,
    font: { font: "$ui", size: 4.7 * PT * s, color: "$muted" }, clamp: 2 },
  { id: "min_age", role: "var", kind: "text", binds: "minAge", x: x + w - 78 * s, y: y - 1 * s, w: 78 * s, h: 15 * s, z: 5,
    font: { font: "$display", size: 10.5 * PT * s, italic: true, bold: true, color: "$accent", align: "right" } },
  { id: "min_age_label", role: "lock", kind: "text", value: "Minimum age", x: x + w - 78 * s, y: y + 14 * s, w: 78 * s, h: 8 * s, z: 5,
    font: { font: "$ui", size: 4.7 * PT * s, uppercase: true, tracking: 0.1, color: "$muted", align: "right" } },
]);

// Footer: designation marks + origin + QR. QR value comes from the record's qrUrl.
const foot = (x, y, w, s) => ([
  { id: "dop_badge", role: "brand", kind: "image", fit: "contain", x, y, w: 34 * s, h: 34 * s, z: 6,
    asset: "$icon:dop", showIf: "designation", label: "DOP / PDO mark" },
  { id: "mountain_badge", role: "brand", kind: "image", fit: "contain", x: x + 40 * s, y, w: 34 * s, h: 34 * s, z: 6,
    asset: "$icon:mountain", showIf: "mountainMark", label: "Product of the Mountain" },
  { id: "tricolore", role: "lock", kind: "shape", x: x + 80 * s, y: y + 12 * s, w: 34 * s, h: 2.4, z: 6, fill: "$tricolore" },
  { id: "origin", role: "var", kind: "text", binds: "origin", x: x + 80 * s, y: y + 18 * s, w: 90 * s, h: 9 * s, z: 6,
    font: { font: "$ui", size: 5.2 * PT * s, bold: true, uppercase: true, tracking: 0.05, color: "$ink" } },
  { id: "qr", role: "var", kind: "qr", binds: "qrUrl", x: x + w - 62 * s, y: y - 28 * s, w: 62 * s, h: 62 * s, z: 6,
    ec: "M", quiet: 1, label: "QR — product page" },
  { id: "qr_caption", role: "lock", kind: "text", value: "Scan for the story", x: x + w - 62 * s, y: y + 36 * s, w: 62 * s, h: 8 * s, z: 6,
    font: { font: "$ui", size: 4.6 * PT * s, uppercase: true, tracking: 0.06, color: "$muted", align: "center" } },
]);

// ---- the four templates -----------------------------------------------------------------
function shortTemplate(size) {
  const { id, w, h, pad } = size;
  const s = w / 300;                       // scale factor off the 3x4 base
  const inner = w - pad * 2;
  return {
    id: `sign-${id}/short`, label: `Case sign ${size.label} — short + photo`, family: "cheese-sign",
    mode: "short", canvas: { w, h }, bleed: 12.5, safe: 12,
    slots: [
      { id: "ground", role: "lock", kind: "shape", x: 0, y: 0, w, h, z: 1, fill: "$cream" },
      bar(w),
      ...wordmark(w, s),
      { id: "packshot", role: "var", kind: "image", fit: "contain", bg: "$paper", binds: "image",
        x: 0, y: 33 * s, w, h: 115 * s, z: 3, required: true, tag: "packshot", label: "Packshot" },
      { id: "name", role: "var", kind: "text", binds: "name", x: pad, y: 155 * s, w: inner, h: 30 * s, z: 5, fit: "shrink",
        font: { font: "$display", size: 13.5 * PT * s, italic: true, bold: true, color: "$primary" } },
      { id: "italian_name", role: "var", kind: "text", binds: "italianName", x: pad, y: 184 * s, w: inner, h: 10 * s, z: 5,
        font: { font: "$ui", size: 5.6 * PT * s, uppercase: true, tracking: 0.11, color: "$muted" } },
      ...rail(pad, 202 * s, inner, s),
      { id: "flavor", role: "var", kind: "text", binds: "flavorProfile", x: pad, y: 236 * s, w: inner, h: 18 * s, z: 5,
        font: { font: "$display", size: 7.4 * PT * s, italic: true, color: "$accent" } },
      { id: "description", role: "var", kind: "text", binds: "shortDescription", x: pad, y: 256 * s, w: inner, h: 56 * s, z: 5,
        font: { font: "$ui", size: 6.7 * PT * s, color: "$ink" }, maxChars: 165 },
      ...foot(pad, 340 * s, inner, s),
    ],
  };
}

function longTemplate(size) {
  const { id, w, h, pad } = size;
  const s = w / 300;
  const inner = w - pad * 2;
  return {
    id: `sign-${id}/long`, label: `Case sign ${size.label} — long description`, family: "cheese-sign",
    mode: "long", canvas: { w, h }, bleed: 12.5, safe: 12,
    slots: [
      { id: "ground", role: "lock", kind: "shape", x: 0, y: 0, w, h, z: 1, fill: "$cream" },
      bar(w),
      ...wordmark(w, s),
      { id: "name", role: "var", kind: "text", binds: "name", x: pad, y: 40 * s, w: inner, h: 34 * s, z: 5, fit: "shrink",
        font: { font: "$display", size: 16 * PT * s, italic: true, bold: true, color: "$primary" } },
      { id: "italian_name", role: "var", kind: "text", binds: "italianName", x: pad, y: 74 * s, w: inner, h: 10 * s, z: 5,
        font: { font: "$ui", size: 5.6 * PT * s, uppercase: true, tracking: 0.11, color: "$muted" } },
      { id: "flavor", role: "var", kind: "text", binds: "flavorProfile", x: pad, y: 90 * s, w: inner, h: 20 * s, z: 5,
        font: { font: "$display", size: 7.4 * PT * s, italic: true, color: "$accent" } },
      ...rail(pad, 118 * s, inner, s),
      { id: "description", role: "var", kind: "text", binds: "longDescription", x: pad, y: 156 * s, w: inner, h: 150 * s, z: 5,
        font: { font: "$ui", size: 7 * PT * s, color: "$ink", align: "justify" }, maxChars: 900 },
      { id: "unique", role: "var", kind: "text", binds: "unique", x: pad, y: 310 * s, w: inner, h: 26 * s, z: 5,
        rule: { side: "left", w: 1.6, color: "$accent" }, eyebrow: "Worth knowing",
        font: { font: "$ui", size: 6.2 * PT * s, color: "$ink" } },
      ...foot(pad, 340 * s, inner, s),
    ],
  };
}

export const SIGN_TEMPLATES = [
  shortTemplate(SIGN_SIZES[0]),
  longTemplate(SIGN_SIZES[0]),
  shortTemplate(SIGN_SIZES[1]),
  longTemplate(SIGN_SIZES[1]),
];

export function getSignTemplate(id) {
  return SIGN_TEMPLATES.find((t) => t.id === id) || SIGN_TEMPLATES[0];
}

// Resolve a dotted binding ("region.label") against a sign record.
export function bindValue(record, path) {
  if (!path) return "";
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), record) ?? "";
}
