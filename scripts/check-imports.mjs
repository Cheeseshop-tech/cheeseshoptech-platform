#!/usr/bin/env node
/* Refuse to commit or deploy a tree that imports a file the tree does not contain.
 *
 *   node scripts/check-imports.mjs --index   what is STAGED (run after `git add`, before commit)
 *   node scripts/check-imports.mjs --head    what is COMMITTED (run before `git push`)
 *
 * WHY THIS EXISTS — 2026-09-26, deploy of 63fe915 failed on Netlify:
 *   [vite:load-fallback] Could not load src/lib/lifecycles.js (imported by campaign-detail.jsx)
 *
 * A COMMIT <FEATURE>.command button stages a hand-written list of files. That list was written,
 * then two of the files on it were edited further — picking up imports of src/lib/lifecycles.js,
 * a new file that was NOT on the list. The button captured the files as they were when it RAN,
 * not when it was written. Result: a commit whose files import a file the commit does not contain.
 * Tests passed locally (the file existed on disk); lint passed; the build only failed on Netlify's
 * clean checkout. Every local check saw the working tree, and the working tree was not what shipped.
 *
 * This checks the thing that actually ships — the index, or HEAD — not the working tree. It reads
 * file contents from git itself, so a file that exists on disk but was never added cannot satisfy
 * an import. That is the whole point.
 *
 * Scope: src/ and netlify/functions/, local imports only (relative, `@/`, `@config/`). Package
 * imports are npm's job. Dynamic `import("...")` with a string literal is checked too; query
 * suffixes like `?raw` are stripped. No dependencies — node + git only.
 */
import { execFileSync } from "node:child_process";
import { posix as path } from "node:path";

const mode = process.argv.includes("--head") ? "head" : process.argv.includes("--index") ? "index" : null;
if (!mode) {
  console.error("usage: node scripts/check-imports.mjs --index | --head");
  process.exit(2);
}

// --no-optional-locks on every call: a read that takes .git/index.lock and dies leaves a lock that
// silently breaks every later commit (CLAUDE.md, TRAP 2026-09-26). This script must never be that.
const git = (...args) => execFileSync("git", ["--no-optional-locks", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const files = new Set(
  (mode === "head" ? git("ls-tree", "-r", "--name-only", "HEAD") : git("ls-files")).split("\n").filter(Boolean)
);
const read = (p) => git("show", mode === "head" ? `HEAD:${p}` : `:${p}`);

const ALIASES = [["@config/", "config/"], ["@/", "src/"]];
const CANDIDATE_SUFFIXES = ["", ".js", ".jsx", ".mjs", ".json", "/index.js", "/index.jsx"];
const IMPORT_RE = /(?:^|[^.\w])(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|(?:^|[^.\w])import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function resolve(fromFile, spec) {
  let base;
  const alias = ALIASES.find(([a]) => spec.startsWith(a));
  if (alias) base = alias[1] + spec.slice(alias[0].length);
  else if (spec.startsWith(".")) base = path.normalize(path.join(path.dirname(fromFile), spec));
  else return null; // a package — not ours to check
  base = base.split("?")[0];
  return CANDIDATE_SUFFIXES.map((s) => base + s);
}

const offenders = [];
for (const f of files) {
  if (!/^(src|netlify\/functions)\//.test(f) || !/\.(js|jsx|mjs)$/.test(f)) continue;
  let src;
  try { src = read(f); } catch { continue; } // staged deletion etc.
  // Strip comments so a commented-out import (or one quoted in prose) cannot trip the check.
  src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] || m[2] || m[3];
    const candidates = resolve(f, spec);
    if (!candidates) continue;
    if (!candidates.some((c) => files.has(c))) offenders.push({ f, spec, want: candidates[0] });
  }
}

const what = mode === "head" ? "the COMMITTED tree (HEAD)" : "the STAGED tree (index)";
if (!offenders.length) {
  console.log(`  imports ok — every local import in ${what} resolves to a file in it.`);
  process.exit(0);
}
console.error(`\n  x ${offenders.length} import(s) in ${what} point at files that are NOT in it:\n`);
for (const o of offenders) console.error(`      ${o.f}\n        imports "${o.spec}"  →  ${o.want}  (not ${mode === "head" ? "committed" : "staged"})`);
console.error(`\n  This is the failure that broke the Netlify build on 2026-09-26. The files exist on this`);
console.error(`  Mac, so local tests and lint pass — but they are not in what would ship.`);
console.error(`  Fix: add the missing file(s) to the commit.\n`);
process.exit(1);
