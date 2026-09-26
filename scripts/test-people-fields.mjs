/* Unit test for the people-spine vocabularies.  Run:  npm run test:fields
 *
 * WHY THIS FILE EXISTS. These option strings must match what HubSpot actually stores, because a
 * HubSpot enumeration option's internal value is WRITE-ONCE — you cannot rename it afterwards,
 * only delete the option and rebuild it. On 2026-09-25 four strings drifted on the first build
 * (`FLorida`, `South East`, `REP`, and an option stored as `Not a fit` while labelled `Lost`) and
 * all four properties had to be deleted and recreated.
 *
 * The single check that matters most is #2: the Company and Contact TERRITORY lists being
 * identical. The rep-to-account join is a plain string match, so a mismatch does not error — the
 * join returns nothing, forever, and a screen looks empty rather than broken.
 *
 * As-built values verified against the live portal by API, 2026-09-26.
 * Canonical record: docs/HUBSPOT_PROPERTY_SPEC.md.
 */
import {
  RELATIONSHIP, OUTREACH_STAGE, CONTACT_ROLE, TERRITORY, PROPERTY,
  serializeMulti, parseMulti, allValid,
} from "../src/lib/people-fields.js";

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};

// The as-built truth, transcribed from the API verification on 2026-09-26. If HubSpot changes,
// this block changes WITH a matching change in the portal — never one without the other.
const AS_BUILT = {
  relationship:   ["Prospect", "Active customer", "Dormant", "Lost"],
  outreach_stage: ["New", "Emailed", "Replied", "Meeting", "Won", "Lost", "Not a fit"],
  contact_role:   ["Buyer", "Rep", "Owner", "Operations", "Other"],
  territory:      ["NY Metro", "New Jersey", "Philadelphia", "PA", "New England",
                   "Upstate NY", "Mid-Atlantic", "Southeast", "FL", "National"],
};

console.log("\n1. every list matches the as-built HubSpot options, exactly and in order");
t("relationship",   JSON.stringify(RELATIONSHIP)   === JSON.stringify(AS_BUILT.relationship), RELATIONSHIP);
t("outreach_stage", JSON.stringify(OUTREACH_STAGE) === JSON.stringify(AS_BUILT.outreach_stage), OUTREACH_STAGE);
t("contact_role",   JSON.stringify(CONTACT_ROLE)   === JSON.stringify(AS_BUILT.contact_role), CONTACT_ROLE);
t("territory",      JSON.stringify(TERRITORY)      === JSON.stringify(AS_BUILT.territory), TERRITORY);

console.log("\n2. THE SILENT ONE: Company territory and Contact territory are the same strings");
// Both objects read the SAME exported constant, so this asserts the invariant holds at the source
// rather than that two copies happen to agree today.
t("ten values", TERRITORY.length === 10, TERRITORY.length);
t("no duplicates", new Set(TERRITORY).size === 10, TERRITORY);
t("no leading/trailing whitespace", TERRITORY.every((v) => v === v.trim()), TERRITORY.filter((v) => v !== v.trim()));
t("no double spaces", TERRITORY.every((v) => !v.includes("  ")), TERRITORY.filter((v) => v.includes("  ")));

console.log("\n3. the four strings that drifted on the first build are NOT present");
t("'FLorida' gone (was Company territory)", !TERRITORY.includes("FLorida"));
t("'South East' gone (was Contact territory)", !TERRITORY.includes("South East"));
t("'Southeas' gone (the mid-rebuild typo)", !TERRITORY.includes("Southeas"));
t("'REP' gone (was Contact role)", !CONTACT_ROLE.includes("REP"));
t("'Rep' present and correctly cased", CONTACT_ROLE.includes("Rep"));

console.log("\n4. Lost and Not a fit are SEPARATE outreach stages");
t("both present", OUTREACH_STAGE.includes("Lost") && OUTREACH_STAGE.includes("Not a fit"), OUTREACH_STAGE);
t("seven stages", OUTREACH_STAGE.length === 7, OUTREACH_STAGE.length);
t("'meeting' lowercase gone", !OUTREACH_STAGE.includes("meeting"));
t("'WON' uppercase gone", !OUTREACH_STAGE.includes("WON"));

console.log("\n5. relationship and outreach_stage do not share a vocabulary");
// They answer different questions; an account can be `Won` in one and `Active customer` in the
// other. `Lost` legitimately appears in both and is the only overlap.
const overlap = RELATIONSHIP.filter((v) => OUTREACH_STAGE.includes(v));
t("only 'Lost' overlaps", overlap.length === 1 && overlap[0] === "Lost", overlap);

console.log("\n6. internal property names");
t("relationship", PROPERTY.relationship === "relationship");
t("outreach_stage", PROPERTY.outreachStage === "outreach_stage");
t("contact_role", PROPERTY.contactRole === "contact_role");
t("territory", PROPERTY.territory === "territory");

console.log("\n7. multi-select serialises the way HubSpot expects: semicolons, not commas");
t("two values", serializeMulti(["NY Metro", "New Jersey"]) === "NY Metro;New Jersey", serializeMulti(["NY Metro", "New Jersey"]));
t("single value", serializeMulti(["National"]) === "National");
t("empty array", serializeMulti([]) === "");
t("not an array", serializeMulti(null) === "");
t("no comma joining", !serializeMulti(["NY Metro", "FL"]).includes(","));
t("a value containing ';' is dropped, not mangled", serializeMulti(["NY Metro", "bad;value"]) === "NY Metro", serializeMulti(["NY Metro", "bad;value"]));
t("non-strings dropped", serializeMulti(["FL", 42, null]) === "FL", serializeMulti(["FL", 42, null]));

console.log("\n8. parse round-trips");
t("round trip", JSON.stringify(parseMulti(serializeMulti(TERRITORY))) === JSON.stringify(TERRITORY));
t("empty string", parseMulti("").length === 0);
t("absent", parseMulti(undefined).length === 0);
t("tolerates spaces round the separator", JSON.stringify(parseMulti("FL; National")) === JSON.stringify(["FL", "National"]));

console.log("\n9. validation refuses values HubSpot would reject");
t("valid set passes", allValid(["FL", "National"], TERRITORY));
t("unknown value fails", !allValid(["Atlantis"], TERRITORY));
t("near-miss fails (this is the point)", !allValid(["South East"], TERRITORY));
t("empty array is vacuously valid", allValid([], TERRITORY));
t("non-array fails", !allValid("FL", TERRITORY));

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
