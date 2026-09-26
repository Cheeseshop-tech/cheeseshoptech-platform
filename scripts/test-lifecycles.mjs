/* Tests for the campaign lifecycle registry.  Run:  npm run test:lifecycles
 *
 * Design: docs/DESIGN_PER_TYPE_LIFECYCLES_2026-09-26.md
 *
 * WHY THIS FILE EXISTS. Status is the most-compared string in the campaign code, and every defect
 * found this week failed silently. The invariants below make misclassification impossible to
 * introduce quietly: a step reused with a different meaning, a lifecycle with no terminal step, a
 * status the server would drop. Section 2 of the design explains the `kind` abstraction these
 * protect.
 */
import {
  LIFECYCLES, ALL_STEP_IDS, lifecycleFor, normalizeStatus, stepOf, kindOf,
  isLive, isClosed, isPlanning, nextStepFor, stepLabel, requiresReadiness,
} from "../src/lib/lifecycles.js";

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};
const KINDS = ["planning", "live", "closed"];

console.log("\nI1. every lifecycle ends in exactly one closed step, and it is `complete`");
for (const [name, steps] of Object.entries(LIFECYCLES)) {
  const closed = steps.filter((s) => s.kind === "closed");
  t(`${name}: exactly one closed`, closed.length === 1, closed.map((s) => s.id));
  t(`${name}: it is last`, steps[steps.length - 1].kind === "closed");
  t(`${name}: it is 'complete'`, closed[0]?.id === "complete", closed[0]?.id);
}

console.log("\nI2. a step id shared by two lifecycles means the same KIND in both");
// If this broke, kindOf() would answer differently depending on which lifecycle you asked —
// the exact ambiguity the whole design exists to remove.
const seen = {};
let i2 = true;
for (const steps of Object.values(LIFECYCLES)) {
  for (const s of steps) {
    if (seen[s.id] && seen[s.id] !== s.kind) { i2 = false; console.log(`       ${s.id}: ${seen[s.id]} vs ${s.kind}`); }
    seen[s.id] = s.kind;
  }
}
t("no id has two kinds", i2);

console.log("\nI3. every lifecycle has a planning step and a live step");
for (const [name, steps] of Object.entries(LIFECYCLES)) {
  t(`${name}: has planning`, steps.some((s) => s.kind === "planning"));
  t(`${name}: has live`, steps.some((s) => s.kind === "live"));
  t(`${name}: starts in planning`, steps[0].kind === "planning", steps[0]);
}

console.log("\nI4. ALL_STEP_IDS is exactly the union — the set the server will accept");
const union = new Set(Object.values(LIFECYCLES).flat().map((s) => s.id));
t("same size as the union", ALL_STEP_IDS.length === union.size, ALL_STEP_IDS);
t("contains every step", [...union].every((id) => ALL_STEP_IDS.includes(id)));
t("no duplicates", new Set(ALL_STEP_IDS).size === ALL_STEP_IDS.length);
t("includes the new distributor steps", ["setup", "connect", "execute"].every((id) => ALL_STEP_IDS.includes(id)));
t("still includes every generic step", ["draft", "building", "ready", "launched", "complete"].every((id) => ALL_STEP_IDS.includes(id)));

console.log("\nI5. every step is well-formed");
for (const [name, steps] of Object.entries(LIFECYCLES)) {
  for (const s of steps) {
    t(`${name}.${s.id}: valid kind + label + blurb`, KINDS.includes(s.kind) && !!s.label && !!s.blurb, s);
    t(`${name}.${s.id}: has a next label unless terminal`, s.kind === "closed" ? s.next === null : !!s.next, s.next);
  }
}

console.log("\n1. generic campaigns are UNCHANGED — the backward-compatibility promise");
const G = ["draft", "building", "ready", "launched", "complete"];
for (const type of ["email", "social", "event", "enrichment", undefined, "a-type-nobody-has-invented"]) {
  t(`${type ?? "no type"} -> generic lifecycle`, JSON.stringify(lifecycleFor(type).map((s) => s.id)) === JSON.stringify(G));
}
for (const st of G) t(`generic ${st} normalizes to itself`, normalizeStatus("email", st) === st);
t("launched is live", isLive({ type: "email", status: "launched" }));
t("complete is closed", isClosed({ type: "email", status: "complete" }));
t("ready is planning", isPlanning({ type: "email", status: "ready" }));
t("ready is still gated", stepOf({ type: "email", status: "ready" }).gated === true);
t("launched is still gated", stepOf({ type: "email", status: "launched" }).gated === true);

console.log("\n2. distributor: Setup → Connect → Execute → Complete");
const D = { type: "distributor" };
t("lifecycle order", JSON.stringify(lifecycleFor("distributor").map((s) => s.id)) === JSON.stringify(["setup", "connect", "execute", "complete"]));
t("setup is planning", kindOf({ ...D, status: "setup" }) === "planning");
t("connect is live", isLive({ ...D, status: "connect" }));
t("execute is live", isLive({ ...D, status: "execute" }));
t("complete is closed", isClosed({ ...D, status: "complete" }));
t("connect marks the gate line (setup gets checked off)", stepOf({ ...D, status: "connect" }).gated === true);
t("execute adds no NEW gate of its own in v1", !stepOf({ ...D, status: "execute" }).gated);
// ...but it is still behind the line — see section 8.

console.log("\n3. THE BUG THIS PREVENTS: the home dashboard counts Connect/Execute as live");
// Before: isLive was `status === "launched"`. A distributor campaign in Connect would have been
// invisible on the home dashboard's live list, silently.
t("connect counts as live", isLive({ ...D, status: "connect" }));
t("execute counts as live", isLive({ ...D, status: "execute" }));
t("setup does not", !isLive({ ...D, status: "setup" }));

console.log("\n4. normalizeStatus makes retyping safe (ace-fall-show-2026: enrichment@building -> distributor)");
t("building -> setup (planning -> first planning)", normalizeStatus("distributor", "building") === "setup");
t("draft -> setup", normalizeStatus("distributor", "draft") === "setup");
t("ready -> setup", normalizeStatus("distributor", "ready") === "setup");
t("launched -> connect (live -> first live)", normalizeStatus("distributor", "launched") === "connect");
t("complete -> complete", normalizeStatus("distributor", "complete") === "complete");
t("and back: setup -> draft", normalizeStatus("email", "setup") === "draft");
t("and back: execute -> launched", normalizeStatus("email", "execute") === "launched");

console.log("\n5. normalizeStatus is total and idempotent");
for (const type of ["email", "distributor"]) {
  for (const st of [...ALL_STEP_IDS, "", undefined, null, "banana"]) {
    const once = normalizeStatus(type, st);
    t(`${type}/${st}: lands on a real step`, lifecycleFor(type).some((s) => s.id === once), once);
    t(`${type}/${st}: idempotent`, normalizeStatus(type, once) === once);
  }
}
t("unknown -> first step, never undefined", normalizeStatus("distributor", "banana") === "setup");
t("missing -> first step", normalizeStatus("email", undefined) === "draft");

console.log("\n6. nextStepFor walks each lifecycle and stops");
for (const [name, steps] of Object.entries(LIFECYCLES)) {
  const type = name === "distributor" ? "distributor" : "email";
  let cur = steps[0].id, n = 0;
  while (nextStepFor({ type, status: cur }) && n < 10) { cur = nextStepFor({ type, status: cur }).id; n++; }
  t(`${name}: walks ${steps.length - 1} steps`, n === steps.length - 1, n);
  t(`${name}: ends at complete`, cur === "complete", cur);
}
t("complete has no next", nextStepFor({ type: "distributor", status: "complete" }) === null);

console.log("\n7. labels resolve for any step in any lifecycle");
t("connect", stepLabel("connect") === "Connect");
t("launched", stepLabel("launched") === "Launched");
t("unknown falls back to the id", stepLabel("banana") === "banana");

console.log("\n8. requiresReadiness — the gate is a LINE, not a per-step flag");
// Generic: must reproduce the pre-2026-09-26 canAdvanceTo() exactly.
t("generic draft free", !requiresReadiness("email", "draft"));
t("generic building free", !requiresReadiness("email", "building"));
t("generic ready gated", requiresReadiness("email", "ready"));
t("generic launched gated", requiresReadiness("email", "launched"));
t("generic complete EXEMPT (retiring is never blocked)", !requiresReadiness("email", "complete"));
// Distributor.
t("distributor setup free", !requiresReadiness("distributor", "setup"));
t("distributor connect gated", requiresReadiness("distributor", "connect"));
t("distributor complete exempt", !requiresReadiness("distributor", "complete"));
// THE HOLE the first draft had: Execute carries no `gated` flag, so read per step it was
// reachable straight from Setup, skipping the Connect gate. It must be behind the line.
t("THE HOLE: execute is behind the gate (no Setup → Execute skip)", requiresReadiness("distributor", "execute"));

console.log("\n8b. every type that can reach a gate has something REQUIRED to tick");
// An empty checklist reads as NOT ready (readinessOf: `req.length > 0 && ...`). A type with a gated
// step and no required items can never cross the gate — stuck in planning forever, silently. The
// distributor type was one missing template away from exactly that.
{
  const { CHECKLIST_TEMPLATES, templateFor } = await import("../src/lib/checklist-templates.js");
  const { CAMPAIGN_TYPES, hasCallConsole } = await import("../src/lib/lifecycles.js");
  for (const { id } of CAMPAIGN_TYPES) {
    const gated = lifecycleFor(id).some((s) => s.gated);
    const req = templateFor(id).filter((i) => i.required).length;
    t(`${id}: has a template`, templateFor(id).length > 0, templateFor(id).length);
    if (gated) t(`${id}: gated, and has ${req} required item(s) — can cross the gate`, req > 0, req);
  }

  console.log("\n8c. retyping enrichment → distributor orphans NO checklist ticks");
  // Ticks are stored against item IDS. If the distributor template lacked an id the enrichment
  // template had, a retyped campaign's tick for it would silently stop rendering.
  const dist = new Set(CHECKLIST_TEMPLATES.distributor.map((i) => i.id));
  for (const i of CHECKLIST_TEMPLATES.enrichment) {
    t(`enrichment id "${i.id}" exists in distributor`, dist.has(i.id));
  }
  t("ace-fall-show-2026's seeded tick 'source' survives the retype", dist.has("source"));

  console.log("\n8d. the distributor gate is Setup, and only Setup");
  const d = CHECKLIST_TEMPLATES.distributor;
  t("every required item is in the Setup group", d.filter((i) => i.required).every((i) => i.group === "Setup"),
    d.filter((i) => i.required && i.group !== "Setup").map((i) => i.id));
  // `calls` is required in enrichment (the calls ARE the build) but must NOT be here: the calls
  // happen IN Connect, so requiring them to ENTER Connect would lock the campaign in Setup forever.
  t("'calls' is NOT required in distributor", d.find((i) => i.id === "calls")?.required === false);
  t("Rick's Setup items are all present and required",
    ["strategy", "materials", "reps", "key-accounts", "territories"].every((id) => d.find((i) => i.id === id)?.required));
  t("Execute tracks new items + new customers", ["new-items", "new-customers"].every((id) => d.some((i) => i.id === id)));

  console.log("\n8e. the call console is a CAPABILITY, not an identity");
  // campaign-detail.jsx used to ask `c.type === "enrichment"` in nine places. Retyping Ace would
  // have silently removed its ~252-prospect call list.
  t("enrichment has a call console", hasCallConsole("enrichment"));
  t("distributor has a call console — Ace keeps its call list", hasCallConsole("distributor"));
  t("email does not", !hasCallConsole("email"));
  t("unknown type does not", !hasCallConsole("banana"));
}

console.log("\n9. GUARD: no status-literal comparisons outside src/lib/lifecycles.js");
// The whole design rests on consumers asking what KIND a status is. A comparison like
// `status === "launched"` written anywhere else would misclassify silently the moment a lifecycle
// without that step exists — exactly what distributor campaigns are. This scan turns that from a
// silent misfire six months from now into a red build today.
{
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join, relative } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  // fileURLToPath, NOT `new URL(...).pathname` — the latter percent-encodes, and this repo lives
  // in "Cheese Shop TECH  Agency Build" (spaces, including a double space). .pathname silently
  // yields a path that does not exist.
  const root = fileURLToPath(new URL("..", import.meta.url));
  const ids = ALL_STEP_IDS.join("|");
  const re = new RegExp(`status\\s*[!=]==?\\s*["'](${ids})["']|["'](${ids})["']\\s*[!=]==?\\s*[a-z.]*status`, "i");
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx|mjs)$/.test(name)) continue;
      const rel = relative(root, p);
      if (rel === "src/lib/lifecycles.js") continue;
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, ""); // comments may quote the old literals
        if (re.test(code)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
      });
    }
  };
  for (const d of ["src", "netlify/functions"]) walk(join(root, d));
  if (offenders.length) console.log(offenders.map((o) => "       " + o).join("\n"));
  t("no status literal comparisons found", offenders.length === 0, offenders.length);
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
