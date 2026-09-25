/* Unit test for the inventory publish gate.  Run:  npm run test:freshness
 *
 * WHY THIS FILE EXISTS. Three separate incidents shared one root cause — nothing asserted that
 * the inventory reaching the live buyer catalog was recent, or that its date came from somewhere
 * trustworthy:
 *   2026-07-25  a hand-typed banner read three days in the FUTURE; it shipped, and stock age
 *               rendered as a negative number
 *   2026-09-17..24  the validation gate correctly blocked two promotes, so the catalog served
 *               week-old stock and nothing said so
 *   2026-09-25  the daily sync task was found disabled — indistinguishable, from the app, from a
 *               week with no new drop
 * The freshness check closes all three. These tests exist so a future edit can't quietly reopen
 * them: every case below is a real incident or its mirror image.
 */
import { validate } from "../netlify/functions/inventory-publish.js";

const DAY = 86_400_000;
const iso = (offsetDays) => new Date(Date.now() - offsetDays * DAY).toISOString().slice(0, 10);

/** A payload that passes everything, so each test can break exactly one thing. */
const good = (over = {}) => {
  const skus = {};
  for (let i = 0; i < 100; i++) skus["c" + i] = { lots: [{ cases: 5 }] };
  return { schemaVersion: "1.2", lastUpdated: iso(1), lastUpdatedSource: "drive-modifiedTime", skus, ...over };
};

let pass = 0, fail = 0;
const t = (name, cond, got) => {
  if (cond) { pass++; console.log("  ok    " + name); }
  else { fail++; console.log("  FAIL  " + name + "   got: " + JSON.stringify(got)); }
};
const has = (errs, sub) => errs.some((e) => e.includes(sub));

console.log("\n0. the control — a healthy payload passes");
t("no errors", validate(good()).length === 0, validate(good()));

console.log("\n1. FUTURE date is refused, and is never overridable (the 2026-07-25 incident)");
const future = validate(good({ lastUpdated: iso(-3) }));
t("rejected", future.length > 0, future);
t("names the problem", has(future, "FUTURE"), future);
t("allowStale does NOT rescue it", validate(good({ lastUpdated: iso(-3) }), { allowStale: true }).length > 0);

console.log("\n2. stale data is refused (the stuck-gate / disabled-scheduler case)");
t("11 days old rejected", validate(good({ lastUpdated: iso(11) })).length > 0);
t("10 days old still accepted (boundary)", validate(good({ lastUpdated: iso(10) })).length === 0);
t("says how old it is", has(validate(good({ lastUpdated: iso(30) })), "30 days old"));

console.log("\n3. stale IS overridable — recovering an empty Blobs store is legitimate");
t("allowStale accepts 30-day-old data", validate(good({ lastUpdated: iso(30) }), { allowStale: true }).length === 0);

console.log("\n4. provenance is mandatory and NOT overridable");
const banner = validate(good({ lastUpdatedSource: "sheet-banner" }));
t("hand-typed banner rejected", banner.length > 0, banner);
t("allowStale does NOT rescue it", validate(good({ lastUpdatedSource: "sheet-banner" }), { allowStale: true }).length > 0);
t("tells you the exact command to fix it", has(banner, "--require-drive-meta --promote"), banner);
t("absent source rejected", validate(good({ lastUpdatedSource: undefined })).length > 0);

console.log("\n5. a missing or junk date is refused");
t("missing", validate(good({ lastUpdated: undefined })).length > 0);
t("unparseable", validate(good({ lastUpdated: "last Tuesday" })).length > 0);

console.log("\n6. the pre-existing shape checks still fire");
t("wrong schemaVersion", has(validate(good({ schemaVersion: "1.1" })), "schemaVersion"));
t("too few SKUs", has(validate(good({ skus: { a: { lots: [{}] } } })), "SKUs"));
t("not an object", validate(null).length > 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
