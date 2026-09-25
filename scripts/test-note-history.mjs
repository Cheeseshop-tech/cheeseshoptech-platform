/* Unit test for enrichment call-note history.  Run:  npm run test:notes
 *
 * WHY THIS FILE EXISTS. Before 2026-09-25 a call note was a single string per company and a POST
 * replaced the whole enrichment document, so the second call to the same buyer silently
 * overwrote the first. The fix appends server-side. That fix is worth a test because the failure
 * mode is SILENT — nothing errors, a note just disappears, and you find out weeks later when you
 * go looking for what someone said.
 *
 * It tests the two pure helpers in netlify/functions/campaign-enrichment.js, which are exported
 * for exactly this purpose. No network, no Blobs, no Netlify runtime.
 */
import { priorNotes, appendNote } from "../netlify/functions/campaign-enrichment.js";

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};

console.log("\n1. a legacy single-string note is promoted into history, not lost");
const legacy = { note: "Spoke to Lou, wants Asiago", calledAt: "2026-09-01T10:00:00Z", campaignId: "fall-tasting", outcome: "cleared" };
const h1 = priorNotes(legacy);
t("seeded one entry", h1.length === 1, h1);
t("text preserved", h1[0].text === "Spoke to Lou, wants Asiago", h1[0]);
t("carries campaignId + outcome", h1[0].campaignId === "fall-tasting" && h1[0].outcome === "cleared", h1[0]);

console.log("\n2. a second call APPENDS rather than overwriting — the bug this fixes");
const h2 = appendNote(h1, "Called back — ready to order 10cs", { at: "2026-09-20T14:00:00Z", campaignId: "fall-tasting", outcome: "cleared" });
t("history is 2 long", h2.length === 2, h2.map((n) => n.text));
t("first note survives", h2[0].text === "Spoke to Lou, wants Asiago", h2[0]);
t("new note is newest", h2[1].text === "Called back — ready to order 10cs", h2[1]);

console.log("\n3. re-saving an unchanged row does not duplicate");
t("still 2 after identical re-save", appendNote(h2, "Called back — ready to order 10cs", { at: "2026-09-20T15:00:00Z" }).length === 2);

console.log("\n4. an empty note never appends");
t("empty ignored", appendNote(h2, "", { at: "x" }).length === 2);

console.log("\n5. history caps at 25, keeping the NEWEST");
let big = [];
for (let i = 0; i < 40; i++) big = appendNote(big, "note " + i, { at: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z` });
t("capped at 25", big.length === 25, big.length);
t("kept newest", big[big.length - 1].text === "note 39", big[big.length - 1]);
t("dropped oldest", big[0].text === "note 15", big[0]);

console.log("\n6. an already-migrated entry round-trips, garbage is dropped");
t("array preserved", priorNotes({ notes: h2 }).length === 2);
t("blank/!text entries dropped", priorNotes({ notes: [{ text: "  " }, { nope: 1 }, { text: "real" }] }).length === 1);

console.log("\n7. absent prior data is safe");
t("undefined -> []", priorNotes(undefined).length === 0);
t("entry with no note -> []", priorNotes({ buyer: "X" }).length === 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
