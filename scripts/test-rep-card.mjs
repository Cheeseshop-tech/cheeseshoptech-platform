/* Unit test for the rep card's stored fields.  Run:  npm run test:repcard
 *
 * WHY THIS FILE EXISTS. The rep card stores two new things side by side that belong to opposite
 * owners, and mixing them up is the failure worth guarding against:
 *
 *   territory[]    — a durable fact HubSpot owns. Staged here, promoted by crm-push. Must be
 *                    validated against the shared vocabulary, because a value HubSpot rejects
 *                    fails a batch push later with a much less legible error.
 *   keyAccounts[]  — campaign process state. Never promoted.
 *
 * Also guards the rep record's pre-existing fields, since they moved into an extracted function
 * and nothing about them should have changed in the move.
 *
 * Design record: docs/DISTRIBUTOR_CAMPAIGN_PHASES_2026-09-26.md
 */
import { cleanRosterRep } from "../netlify/functions/campaign-state.js";

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};

console.log("\n1. pre-existing fields survive the extraction unchanged");
const base = cleanRosterRep({ name: "Vincenzo Purpura", phone: "19174145533", jobtitle: "Sales", addedAt: "2026-09-20T00:00:00Z", emailedAt: "2026-09-21T00:00:00Z" });
t("name", base.name === "Vincenzo Purpura", base);
t("phone", base.phone === "19174145533");
t("jobtitle", base.jobtitle === "Sales");
t("addedAt preserved", base.addedAt === "2026-09-20T00:00:00Z");
t("emailedAt preserved", base.emailedAt === "2026-09-21T00:00:00Z");
t("emailedAt NEVER invented when absent", !("emailedAt" in cleanRosterRep({ name: "x" })));
t("dropped only when exactly true", cleanRosterRep({ dropped: "yes" }).dropped === undefined);
t("dropped true kept", cleanRosterRep({ dropped: true }).dropped === true);

console.log("\n2. territory accepts only the shared vocabulary");
t("valid values kept", JSON.stringify(cleanRosterRep({ territory: ["NY Metro", "New Jersey"] }).territory) === JSON.stringify(["NY Metro", "New Jersey"]));
t("the drifted spellings are refused", cleanRosterRep({ territory: ["South East", "FLorida", "Southeas"] }).territory === undefined, cleanRosterRep({ territory: ["South East", "FLorida", "Southeas"] }));
t("valid kept, invalid dropped, in one list", JSON.stringify(cleanRosterRep({ territory: ["FL", "Atlantis", "National"] }).territory) === JSON.stringify(["FL", "National"]));
t("duplicates collapsed", cleanRosterRep({ territory: ["FL", "FL", "FL"] }).territory.length === 1);
t("a string instead of an array is refused", cleanRosterRep({ territory: "NY Metro" }).territory === undefined);

console.log("\n3. empty pickers write NOTHING, never an empty array");
// An untouched picker must not become a stored `[]` — that is a write of nothing, and it blurs
// "never set" with "deliberately cleared".
t("no territory key when empty", !("territory" in cleanRosterRep({ territory: [] })));
t("no keyAccounts key when empty", !("keyAccounts" in cleanRosterRep({ keyAccounts: [] })));
t("no keys when absent", !("territory" in cleanRosterRep({})) && !("keyAccounts" in cleanRosterRep({})));

console.log("\n4. key accounts: HubSpot company ids only");
t("numeric ids kept", JSON.stringify(cleanRosterRep({ keyAccounts: ["324918430431", "327581085392"] }).keyAccounts) === JSON.stringify(["324918430431", "327581085392"]));
t("numbers coerced to strings", JSON.stringify(cleanRosterRep({ keyAccounts: [324918430431] }).keyAccounts) === JSON.stringify(["324918430431"]));
t("non-numeric refused", cleanRosterRep({ keyAccounts: ["ace-endico", "DROP TABLE"] }).keyAccounts === undefined);
t("duplicates collapsed", cleanRosterRep({ keyAccounts: ["1", "1", "2"] }).keyAccounts.length === 2);
t("whitespace trimmed", JSON.stringify(cleanRosterRep({ keyAccounts: [" 123 "] }).keyAccounts) === JSON.stringify(["123"]));

console.log("\n5. key accounts are capped at 10 — a curated list, not a territory");
const many = Array.from({ length: 30 }, (_, i) => String(1000 + i));
const capped = cleanRosterRep({ keyAccounts: many }).keyAccounts;
t("capped at 10", capped.length === 10, capped.length);
t("keeps the FIRST ten picked, in order", capped[0] === "1000" && capped[9] === "1009", capped);

console.log("\n6. the two fields are independent — one never leaks into the other");
const both = cleanRosterRep({ territory: ["NY Metro"], keyAccounts: ["324918430431"] });
t("territory intact", JSON.stringify(both.territory) === JSON.stringify(["NY Metro"]));
t("keyAccounts intact", JSON.stringify(both.keyAccounts) === JSON.stringify(["324918430431"]));
t("an account id is not a territory", !(cleanRosterRep({ territory: ["324918430431"] }).territory));
t("a territory is not an account id", !(cleanRosterRep({ keyAccounts: ["NY Metro"] }).keyAccounts));

console.log("\n7. malformed input does not throw");
t("null", typeof cleanRosterRep(null) === "object");
t("undefined", typeof cleanRosterRep(undefined) === "object");
t("addedAt always set", !!cleanRosterRep(null).addedAt);

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
