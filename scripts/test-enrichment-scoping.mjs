/* Unit test for campaign-scoped enrichment.  Run:  npm run test:scoping
 *
 * WHY THIS FILE EXISTS. Before 2026-09-26 the enrichment store was keyed by companyId ALONE.
 * `campaignId` was written onto the row as a tag but was never part of the key, so a second
 * campaign enriching a company the first campaign had already worked OVERWROTE it — buyer, title,
 * email, phone, address, outcome, all of it. One slot per company, tenant-wide.
 *
 * Worth a test for the same reason the note-history fix was: the failure is SILENT. Nothing
 * errors. A campaign's call record is simply not there any more, and you find out when you go
 * looking for what someone said and it is gone.
 *
 * Tests the three pure helpers exported from netlify/functions/campaign-enrichment.js.
 * No network, no Blobs, no Netlify runtime.
 */
import { scopeOf, seedScopes, flattenScopes } from "../netlify/functions/campaign-enrichment.js";

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};

// ---------------------------------------------------------------------------------------------
console.log("\n1. scopeOf routes a row to its campaign, or to the shared bucket");
t("valid campaignId used as scope", scopeOf({ campaignId: "fall-tasting" }) === "fall-tasting");
t("missing campaignId -> _shared", scopeOf({ buyer: "Lou" }) === "_shared");
t("empty campaignId -> _shared", scopeOf({ campaignId: "" }) === "_shared");
t("malformed campaignId -> _shared, not dropped", scopeOf({ campaignId: "../../etc/passwd" }) === "_shared");
t("null row -> _shared, does not throw", scopeOf(null) === "_shared");

// ---------------------------------------------------------------------------------------------
console.log("\n2. seedScopes promotes legacy flat rows into their campaign bucket");
const legacyEntries = {
  "111": { buyer: "Lou Dipalo", campaignId: "fall-tasting", calledAt: "2026-09-01T10:00:00Z" },
  "222": { buyer: "Tess", campaignId: "eataly-onboarding", calledAt: "2026-09-02T10:00:00Z" },
  "333": { buyer: "No campaign", calledAt: "2026-09-03T10:00:00Z" },
};
const seeded = seedScopes(legacyEntries, {});
t("fall-tasting bucket created", !!seeded["fall-tasting"]?.["111"], Object.keys(seeded));
t("eataly bucket created", !!seeded["eataly-onboarding"]?.["222"], Object.keys(seeded));
t("untagged row lands in _shared, NOT discarded", seeded["_shared"]?.["333"]?.buyer === "No campaign", seeded["_shared"]);
t("three scopes total", Object.keys(seeded).length === 3, Object.keys(seeded));

console.log("\n3. seedScopes is idempotent — the whole migration strategy depends on this");
const twice = seedScopes(legacyEntries, seeded);
t("same scope count on re-run", Object.keys(twice).length === 3, Object.keys(twice));
t("same row count on re-run", Object.keys(twice["fall-tasting"]).length === 1);
t("deep-equal to first run", JSON.stringify(twice) === JSON.stringify(seeded));

console.log("\n4. an already-scoped row is NEVER clobbered by the flat shadow copy");
const scopedWins = seedScopes(
  { "111": { buyer: "STALE FLAT COPY", campaignId: "fall-tasting" } },
  { "fall-tasting": { "111": { buyer: "Lou Dipalo", note: "the real one" } } },
);
t("scoped copy survives", scopedWins["fall-tasting"]["111"].buyer === "Lou Dipalo", scopedWins["fall-tasting"]["111"]);
t("stale flat copy did not win", scopedWins["fall-tasting"]["111"].note === "the real one");

// ---------------------------------------------------------------------------------------------
console.log("\n5. THE BUG: two campaigns, one company — both records survive");
const shared = seedScopes({}, {
  "fall-tasting":  { "111": { buyer: "Lou Dipalo", note: "wants Asiago",  calledAt: "2026-09-01T10:00:00Z", campaignId: "fall-tasting" } },
  "spring-push":   { "111": { buyer: "Lou Dipalo", note: "asked re Piave", calledAt: "2026-09-20T10:00:00Z", campaignId: "spring-push" } },
});
t("fall-tasting record intact", shared["fall-tasting"]["111"].note === "wants Asiago", shared["fall-tasting"]["111"]);
t("spring-push record intact", shared["spring-push"]["111"].note === "asked re Piave", shared["spring-push"]["111"]);
t("same company, two independent rows", shared["fall-tasting"]["111"] !== shared["spring-push"]["111"]);

// ---------------------------------------------------------------------------------------------
console.log("\n6. flattenScopes keeps `entries` meaning what it always meant: latest wins");
const flat = flattenScopes(shared);
t("one row per company", Object.keys(flat).length === 1, Object.keys(flat));
t("NEWEST calledAt wins", flat["111"].note === "asked re Piave", flat["111"]);

console.log("\n7. flatten picks by calledAt, not by object enumeration order");
const reversed = flattenScopes({
  "zzz-late-alphabetically": { "111": { note: "OLD", calledAt: "2026-01-01T00:00:00Z" } },
  "aaa-early-alphabetically": { "111": { note: "NEW", calledAt: "2026-12-31T00:00:00Z" } },
});
t("newest wins regardless of key order", reversed["111"].note === "NEW", reversed["111"]);

console.log("\n8. a row with no calledAt never beats one that has it");
const missingDate = flattenScopes({
  a: { "111": { note: "has a date", calledAt: "2026-05-01T00:00:00Z" } },
  b: { "111": { note: "no date at all" } },
});
t("dated row wins", missingDate["111"].note === "has a date", missingDate["111"]);

// ---------------------------------------------------------------------------------------------
console.log("\n9. round trip: seed -> flatten reproduces the original flat view");
const roundTrip = flattenScopes(seedScopes(legacyEntries, {}));
t("same companies", Object.keys(roundTrip).sort().join() === "111,222,333", Object.keys(roundTrip));
t("row content preserved", roundTrip["111"].buyer === "Lou Dipalo", roundTrip["111"]);

console.log("\n10. empty and malformed input does not throw");
t("empty seed", Object.keys(seedScopes({}, {})).length === 0);
t("null seed", Object.keys(seedScopes(null, null)).length === 0);
t("empty flatten", Object.keys(flattenScopes({})).length === 0);
t("null flatten", Object.keys(flattenScopes(null)).length === 0);
t("non-object rows skipped", Object.keys(seedScopes({ "111": "not an object" }, {})).length === 0);
t("non-object scope skipped", Object.keys(seedScopes({}, { bad: "not an object" })).length === 0);

// ---------------------------------------------------------------------------------------------
console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
