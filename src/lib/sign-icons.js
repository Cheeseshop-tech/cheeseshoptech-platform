// Cheese Signs — icon set (docs/CHEESE_SIGNS_SPEC.md §5).
// Monochrome-friendly inline SVG, drawn to stay legible at 0.4 in on a printed sign.
// Colors are Brand-Kit TOKENS resolved at render: {primary} {accent} {ink} {paper}.
// Generated from the same source as the print proof — do not fork one without the other.

export const SIGN_ICONS = {
  cow: "<svg viewBox=\"0 0 120 82\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic ic-cow\" aria-label=\"Cow's milk\">\n<g fill=\"none\" stroke=\"{ink}\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M34 30 Q34 17 52 17 L84 17 Q100 17 103 31 Q106 45 96 52 L40 52 Q30 45 34 30 Z\" fill=\"{paper}\"/>\n<path d=\"M36 33 L18 37 Q8 39 8 47 Q8 55 18 55 L28 53 Q34 51 36 46 Z\" fill=\"{paper}\"/>\n<path d=\"M17 34 Q9 28 12 24 Q17 22 22 30\" fill=\"{paper}\"/>\n<path d=\"M8 47 L18 47\" />\n<path d=\"M44 52 L44 72 M58 52 L58 72 M84 52 L84 72 M96 52 L96 72\"/>\n<path d=\"M101 26 Q112 22 112 34 Q112 44 106 47\"/>\n<path d=\"M62 52 Q68 62 76 58\"/>\n</g>\n<g fill=\"{ink}\">\n<circle cx=\"15\" cy=\"43\" r=\"2.1\"/>\n<path d=\"M52 22 Q66 19 74 26 Q78 34 68 37 Q56 39 51 32 Q48 25 52 22 Z\"/>\n<path d=\"M86 30 Q98 30 99 39 Q100 47 91 47 Q83 46 82 38 Q82 31 86 30 Z\"/>\n<path d=\"M40 40 Q49 41 50 47 L38 48 Q36 43 40 40 Z\"/>\n</g>\n</svg>",
  region: {
    valsugana: "<svg viewBox=\"0 0 120 82\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic\" aria-label=\"Valsugana\">\n<g fill=\"none\" stroke=\"{ink}\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M4 58 L30 20 L46 42 L56 30 L78 58 Z\" fill=\"{paper}\"/>\n<path d=\"M62 58 L86 24 L116 58 Z\" fill=\"{paper}\"/>\n<path d=\"M22 32 L30 20 L38 32 L33 29 L27 33 Z\" fill=\"{ink}\"/>\n<path d=\"M78 36 L86 24 L94 36 L89 33 L83 37 Z\" fill=\"{ink}\"/>\n<path d=\"M4 62 L116 62\"/>\n<path d=\"M18 72 Q38 64 58 72 Q78 80 102 71\"/>\n</g></svg>",
    "altopiano-asiago": "<svg viewBox=\"0 0 120 82\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic\" aria-label=\"Altopiano di Asiago\">\n<g fill=\"none\" stroke=\"{ink}\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M6 56 L26 30 Q34 21 48 21 L78 21 Q92 21 100 32 L116 56 Z\" fill=\"{paper}\"/>\n<path d=\"M40 21 L48 12 L56 21\" fill=\"{ink}\"/>\n<path d=\"M6 60 L116 60\"/>\n<path d=\"M20 60 L20 74 M44 60 L44 74 M68 60 L68 74 M92 60 L92 74\"/>\n<path d=\"M12 66 L100 66\"/>\n</g></svg>",
    "trentino-veneto": "<svg viewBox=\"0 0 120 82\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic\" aria-label=\"Trentino and Veneto\">\n<g fill=\"none\" stroke=\"{ink}\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M2 56 L24 26 L40 48 L52 34 L68 56 Z\" fill=\"{paper}\"/>\n<path d=\"M54 56 L76 22 L98 50 L106 40 L118 56 Z\" fill=\"{paper}\"/>\n<path d=\"M17 36 L24 26 L31 36 L27 33 L21 37 Z\" fill=\"{ink}\"/>\n<path d=\"M69 32 L76 22 L83 32 L79 29 L73 33 Z\" fill=\"{ink}\"/>\n<path d=\"M2 60 L118 60\"/>\n<path d=\"M14 70 Q40 62 60 70 Q84 79 108 69\"/>\n</g></svg>",
  },
  dop: "<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic-badge\" aria-label=\"DOP protected designation of origin\">\n<circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"none\" stroke=\"{accent}\" stroke-width=\"4\"/>\n<circle cx=\"50\" cy=\"50\" r=\"38\" fill=\"{accent}\"/>\n<text x=\"50\" y=\"46\" text-anchor=\"middle\" font-family=\"Georgia,serif\" font-weight=\"700\" font-size=\"26\" fill=\"{paper}\">DOP</text>\n<text x=\"50\" y=\"64\" text-anchor=\"middle\" font-family=\"Inter,sans-serif\" font-weight=\"600\" font-size=\"11\" letter-spacing=\"1.2\" fill=\"{paper}\">PDO</text>\n</svg>",
  mountain: "<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic-badge\" aria-label=\"Product of the Mountain\">\n<circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"none\" stroke=\"{primary}\" stroke-width=\"4\"/>\n<circle cx=\"50\" cy=\"50\" r=\"38\" fill=\"{paper}\"/>\n<path d=\"M22 64 L40 34 L52 52 L60 42 L78 64 Z\" fill=\"{primary}\"/>\n<path d=\"M34 48 L40 34 L46 48 L41 45 L37 49 Z\" fill=\"{paper}\"/>\n<text x=\"50\" y=\"80\" text-anchor=\"middle\" font-family=\"Inter,sans-serif\" font-weight=\"700\" font-size=\"10\" letter-spacing=\"0.6\" fill=\"{primary}\">MOUNTAIN</text>\n</svg>",
  italy: "<svg viewBox=\"0 0 60 100\" xmlns=\"http://www.w3.org/2000/svg\" class=\"ic-italy\" aria-label=\"Italy\">\n<path d=\"M20 6 L27 4 L31 12 L38 15 L36 24 L44 34 L52 48 L50 58 L42 62 L36 74 L28 86 L20 94 L14 90 L18 78 L14 68 L8 60 L12 50 L10 38 L14 26 L18 16 Z\"\n      fill=\"{ink}\" opacity=\".9\"/>\n<path d=\"M50 74 L56 70 L58 78 L52 82 Z\" fill=\"{ink}\" opacity=\".9\"/>\n</svg>",
};

// paint(svg, tokens) — swap the token placeholders for resolved Brand-Kit values.
export function paintIcon(svg, { primary = "#064E22", accent = "#009640", ink = "#141413", paper = "#FFFFFF" } = {}) {
  return String(svg)
    .replaceAll("{primary}", primary)
    .replaceAll("{accent}", accent)
    .replaceAll("{ink}", ink)
    .replaceAll("{paper}", paper);
}

// regionIcon(key) — falls back to the Valsugana illustration for an unmapped region.
export function regionIcon(key) {
  return SIGN_ICONS.region[key] || SIGN_ICONS.region.valsugana;
}
