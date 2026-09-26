/* Unit test for the campaign section display-mode table.  Run:  npm run test:stages
 *
 * WHY THIS FILE EXISTS. The failure mode here is a section VANISHING — a typo in the table, or a
 * new section nobody added to it, and a whole panel is gone from the page with nothing to
 * indicate it should be there. That is how the per-campaign fields feature spent an hour being
 * real, tested and invisible, and it is how territory-book shipped a screen over an empty store.
 *
 * So the tests below care most about two things: that nothing is unreachable at any status, and
 * that an UNKNOWN section defaults to visible rather than hidden.
 *
 * Design record: docs/CAMPAIGN_UI_REDESIGN_2026-09-26.md
 */
import { modeFor, orderFor, isOpen, isHidden, nextActionFor, SECTION_ORDER, MODES } from "../src/lib/campaign-stages.js";

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};

const STATUSES = ["draft", "building", "ready", "launched", "complete"];

console.log("\n1. every section resolves to a valid mode at every status");
let allValid = true;
for (const s of SECTION_ORDER) {
  for (const st of STATUSES) {
    if (!MODES.includes(modeFor(s, st))) { allValid = false; console.log(`       ${s} @ ${st} -> ${modeFor(s, st)}`); }
  }
}
t("all 45 combinations valid", allValid);

console.log("\n2. THE POINT: at `launched` the call console is primary and the checklist is folded");
t("prospects primary", modeFor("prospects", "launched") === "primary", modeFor("prospects", "launched"));
t("results primary", modeFor("results", "launched") === "primary", modeFor("results", "launched"));
t("checklist folded", modeFor("checklist", "launched") === "summary", modeFor("checklist", "launched"));
t("strategy folded", modeFor("strategy", "launched") === "summary");
t("content folded", modeFor("content", "launched") === "summary");
t("documents folded", modeFor("documents", "launched") === "summary");

console.log("\n3. the call console sorts ABOVE the checklist once launched — the whole complaint");
t("prospects before checklist", orderFor("prospects", "launched") < orderFor("checklist", "launched"),
  [orderFor("prospects", "launched"), orderFor("checklist", "launched")]);
t("results before checklist", orderFor("results", "launched") < orderFor("checklist", "launched"));
t("and the reverse holds while BUILDING", orderFor("checklist", "building") < orderFor("prospects", "building"),
  [orderFor("checklist", "building"), orderFor("prospects", "building")]);

console.log("\n4. rep roster stays EXPANDED at launched (Rick, 2026-09-26: live working data)");
t("repvisits secondary, not summary", modeFor("repvisits", "launched") === "secondary", modeFor("repvisits", "launched"));
t("repvisits open by default", isOpen("repvisits", "launched", undefined));
t("salesreps matches it", modeFor("salesreps", "launched") === "secondary", modeFor("salesreps", "launched"));

console.log("\n5. nothing is unreachable — every section is open at SOME status");
for (const s of SECTION_ORDER) {
  const everOpen = STATUSES.some((st) => isOpen(s, st, undefined) && !isHidden(s, st));
  t(`${s} is reachable`, everOpen);
}

console.log("\n6. hidden only ever means 'not applicable yet', never 'gone forever'");
for (const s of SECTION_ORDER) {
  const hiddenAt = STATUSES.filter((st) => isHidden(s, st));
  const visibleLater = STATUSES.some((st) => !isHidden(s, st));
  t(`${s} hidden at [${hiddenAt.join(",") || "none"}] but visible somewhere`, visibleLater);
}

console.log("\n7. an UNKNOWN section defaults to VISIBLE, never hidden");
// This is the guard against a future section being added to the page and forgotten here.
t("unknown -> secondary", modeFor("brand-new-section", "launched") === "secondary", modeFor("brand-new-section", "launched"));
t("unknown is not hidden", !isHidden("brand-new-section", "launched"));
t("unknown is open", isOpen("brand-new-section", "launched", undefined));
t("unknown at every status", STATUSES.every((st) => !isHidden("brand-new-section", st)));

console.log("\n8. an UNKNOWN status shows everything rather than guessing");
t("unknown status -> secondary", modeFor("checklist", "banana") === "secondary", modeFor("checklist", "banana"));
t("unknown status not hidden", !isHidden("results", "banana"));
t("missing status not hidden", !isHidden("results", undefined));

console.log("\n9. a manual override beats the automatic rule, in both directions");
t("forced open on a folded section", isOpen("checklist", "launched", true));
t("forced closed on an open section", !isOpen("prospects", "launched", false));
t("undefined falls back to the rule", isOpen("checklist", "launched", undefined) === false);
t("null is not a boolean — falls back to the rule", isOpen("checklist", "launched", null) === false);

console.log("\n10. draft is a planning page, launched is a working page");
t("draft leads with strategy", modeFor("strategy", "draft") === "primary");
t("draft hides results", isHidden("results", "draft"));
t("draft hides the call console", isHidden("prospects", "draft"));
t("building leads with the checklist", modeFor("checklist", "building") === "primary");
t("ready still leads with the checklist", modeFor("checklist", "ready") === "primary");
t("complete folds everything except results", modeFor("results", "complete") === "primary");

console.log("\n11. updates never folds — it is the running log");
t("open at every status", STATUSES.every((st) => isOpen("updates", st, undefined)));
t("hidden at no status", STATUSES.every((st) => !isHidden("updates", st)));

console.log("\n12. the next action is exactly one step, and it walks the lifecycle in order");
t("draft -> building", nextActionFor("draft").to === "building", nextActionFor("draft"));
t("building -> ready", nextActionFor("building").to === "ready");
t("ready -> launched", nextActionFor("ready").to === "launched");
t("launched -> complete", nextActionFor("launched").to === "complete");
t("complete is the end of the line", nextActionFor("complete") === null, nextActionFor("complete"));
t("unknown status has no next action", nextActionFor("banana") === null);
t("missing status has no next action", nextActionFor(undefined) === null);

console.log("\n13. every next action carries a label and a reason to show the user");
for (const st of ["draft", "building", "ready", "launched"]) {
  const n = nextActionFor(st);
  t(`${st}: has label + blurb`, !!n.label && !!n.blurb, n);
}

console.log("\n14. the chain reaches `complete` from `draft` in exactly four steps and terminates");
let cur = "draft", steps = 0;
while (nextActionFor(cur) && steps < 10) { cur = nextActionFor(cur).to; steps++; }
t("four steps", steps === 4, steps);
t("ends at complete", cur === "complete", cur);

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
