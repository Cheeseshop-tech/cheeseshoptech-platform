import { SIGN_TEMPLATES, SIGN_SIZES } from "file:///Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build/src/lib/sign-templates.js";
const out = SIGN_TEMPLATES.map(t => ({
  id: t.id, label: t.label, family: t.family, mode: t.mode,
  canvas: t.canvas, bleed: t.bleed, safe: t.safe,
  pad: SIGN_SIZES.find(s => t.id.startsWith(`sign-${s.id}/`)).pad,
  base: 300, slots: t.slots,
}));
console.log(JSON.stringify(out));
