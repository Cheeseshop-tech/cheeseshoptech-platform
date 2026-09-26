// One-time diagnostic, 2026-09-18: does the SENTRY_DSN value now saved in Netlify actually accept
// events? Run this LOCALLY (never on Netlify) with that DSN passed as an env var so it never has
// to be pasted into chat or committed anywhere:
//
//   SENTRY_DSN="<paste the value from Netlify's env var here>" node _archive/one-time-scripts/test-sentry-functions-dsn.mjs
//
// Sends one tagged test exception through @sentry/node -- the exact same package _sentry.js uses
// -- then check the Sentry project's Issues page for an issue titled "Manual test event from
// test-sentry-functions-dsn.mjs", tagged environment=test-script. If it shows up, the DSN is good
// and the 25 Netlify Functions are correctly wired. If nothing appears after ~30s, the DSN is
// still wrong (or a firewall/proxy is blocking outbound to ingest.us.sentry.io).
//
// Safe to delete once this has been used once -- it's a one-off check, not a permanent tool.
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;
if (!dsn) {
  console.error("Set SENTRY_DSN in the shell first -- see the comment at the top of this file.");
  process.exit(1);
}

// Sentry.init() only WARNS on a malformed DSN, so without this guard a placeholder value still
// reaches the "Sent." line and looks like a success. Fail loudly instead.
const VALID = /^https:\/\/[^@\s/]+@[^\s/]+\/\d+$/;
if (!VALID.test(dsn)) {
  // A pasted value that LOOKS identical to the one in Sentry's dashboard can still fail here if
  // clipboard/shell handling added an invisible character -- a trailing newline from a "Copy"
  // button, a stray space, a smart quote. Diagnose that without ever printing the real key.
  const trimmed = dsn.trim();
  if (trimmed !== dsn) {
    console.error(
      `SENTRY_DSN has ${dsn.length - trimmed.length} invisible leading/trailing whitespace ` +
      `character(s) that a visual comparison would never catch. Re-paste with no leading/trailing ` +
      `space or newline (in the shell AND in Netlify's field) and try again.`
    );
  } else if (VALID.test(trimmed)) {
    console.error("SENTRY_DSN fails the format check but trimming doesn't explain why -- " +
      "an invisible character may be embedded in the middle, not just the edges.");
  } else {
    console.error(`SENTRY_DSN is not a real DSN (length ${dsn.length}, starts ` +
      `${JSON.stringify(dsn.slice(0, 8))}, ends ${JSON.stringify(dsn.slice(-8))}).`);
    console.error('Expected the literal value from Netlify, e.g. https://<key>@o<org>.ingest.us.sentry.io/<project>');
  }
  process.exit(1);
}

Sentry.init({ dsn, environment: "test-script" });
const eventId = Sentry.captureException(new Error("Manual test event from test-sentry-functions-dsn.mjs"));
const delivered = await Sentry.flush(3000);
if (!delivered) {
  console.error("Flush timed out -- the event did NOT leave this machine (network/proxy blocking ingest?).");
  process.exit(1);
}
console.log(`Sent event ${eventId}. Check Sentry Issues (environment=test-script) for the test event.`);
