// Shared Sentry wrapper for Netlify Functions — error capture + basic performance signal.
// NOT exported as its own Netlify function (leading underscore — see _write-guard.js note);
// imported by every function that exports `handler`.
//
// Why this exists (2026-08-14): the platform had zero error/perf monitoring on the serverless
// side. Every incident to date (2026-07-24 blank images, 2026-07-25 PNG 400s, 2026-08-13
// silently-404ing logo) was caught by Rick manually — never by the app. See
// docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md. This closes that gap for the 25 functions the same
// way src/lib/monitoring.js closes it for the browser.
//
// Env-gated like every other backend seam in this codebase (CRM/Shopify/Campaigns) — inert
// until SENTRY_DSN is set in the Netlify dashboard. No DSN = zero behavior change, zero added
// latency, functions run exactly as before.
//
// IMPORTANT: Netlify Functions run on AWS Lambda under the hood, which can freeze the process
// the instant a response is returned. Every capture below is explicitly flushed (awaited)
// before the wrapped handler returns, or the event can be silently dropped and never sent.
//
// Most functions in this repo already catch their own errors and return a structured JSON
// error response instead of throwing (Cloudinary/HubSpot failures, bad input, etc.) — that's
// correct, expected behavior, not a bug, and this wrapper does not flag it. Two things ARE
// worth capturing: (1) an uncaught exception — a real code bug outside the function's own
// try/catch, and (2) a >=500 response the function chose to return — a real server-side
// failure it handled gracefully but that's still worth knowing about in aggregate.

import * as Sentry from "@sentry/node";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // inert — no Sentry account wired up yet
  Sentry.init({
    dsn,
    // Netlify sets CONTEXT to production/deploy-preview/branch-deploy — more useful here than
    // NODE_ENV, which Netlify Functions don't reliably set.
    environment: process.env.CONTEXT || "production",
    tracesSampleRate: 0.2, // keeps well inside the free tier at current traffic; raise if needed
  });
}

/**
 * Wrap a Netlify Function handler with error capture + a lightweight perf span.
 * Behavior is IDENTICAL to the unwrapped handler when SENTRY_DSN is unset — this only adds
 * observation, it never changes what the caller receives.
 * @param {string} name  Function name, for grouping in Sentry (e.g. "inventory", "crm-hubspot").
 * @param {Function} fn  The real handler: async (event, context) => response.
 */
export function withMonitoring(name, fn) {
  return async (...args) => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return fn(...args); // no-op path, zero overhead when monitoring isn't configured
    ensureInit();

    const event = args[0] || {};
    const started = Date.now();
    try {
      const result = await Sentry.startSpan(
        { name: `function.${name}`, op: "function.netlify", attributes: { "http.method": event.httpMethod || "" } },
        () => fn(...args)
      );
      const ms = Date.now() - started;
      // A function that "handled" its own failure (structured 5xx JSON, not a throw) is still
      // a real problem worth seeing in aggregate — this is the class of error the 2026-08-13
      // incident report flagged as invisible to the app.
      if (result?.statusCode >= 500) {
        Sentry.captureMessage(`${name} returned ${result.statusCode}`, {
          level: "error",
          tags: { fn: name, statusCode: String(result.statusCode) },
          extra: { httpMethod: event.httpMethod, path: event.path, ms },
        });
      } else if (ms > 3000) {
        // Slow-response signal even without a full tracing dashboard — Cloudinary/HubSpot calls
        // are the usual cause. 3s is a starting threshold; tune once real data comes in.
        Sentry.captureMessage(`${name} took ${ms}ms`, {
          level: "warning",
          tags: { fn: name, slow: "true" },
        });
      }
      await Sentry.flush(2000);
      return result;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { fn: name },
        extra: { httpMethod: event.httpMethod, path: event.path, ms: Date.now() - started },
      });
      await Sentry.flush(2000);
      throw err; // don't swallow — the caller's existing error handling (or Netlify's default 500) still applies
    }
  };
}
