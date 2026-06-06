// Validate every config/clients/<id>.json against client.schema.json + the AA contrast
// guardrail. Run: npm run validate:clients  (also a good CI / pre-deploy gate.)
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "config", "clients");
const schema = JSON.parse(readFileSync(join(dir, "client.schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function bestRatio(hex) {
  return Math.max(contrast(hex, "#ffffff"), contrast(hex, "#221c14"));
}

const files = readdirSync(dir).filter(
  (f) => f.endsWith(".json") && f !== "_template.json" && f !== "client.schema.json"
);

let failed = 0;
for (const f of files) {
  const cfg = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const errors = [];
  if (!validate(cfg)) errors.push(...validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}`));

  const primary = cfg?.brand?.colors?.primary;
  if (primary) {
    const r = bestRatio(primary);
    if (r < 4.5) errors.push(`brand.colors.primary ${primary} contrast ${r.toFixed(2)}:1 < 4.5:1 (WCAG AA)`);
  }

  if (errors.length) {
    failed++;
    console.error(`✗ ${f}`);
    errors.forEach((e) => console.error(`    ${e}`));
  } else {
    console.log(`✓ ${f}`);
  }
}

if (failed) {
  console.error(`\n${failed} client config(s) failed validation.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} client config(s) valid.`);
