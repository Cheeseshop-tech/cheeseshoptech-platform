// Browser error tracking + performance monitoring (Sentry) — env-gated exactly like every other
// backend seam in this codebase (CRM/Shopify/Campaigns): inert until VITE_SENTRY_DSN is set, in
// which case zero behavior changes and zero bytes ship for it.
//
// Why this exists (2026-08-14): the platform had zero error/perf visibility. Every incident to
// date (2026-07-24 blank images, 2026-07-25 PNG 400s, 2026-08-13 silently-404ing logo — see
// docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md) was caught by Rick manually. This is the browser
// half of the fix; netlify/functions/_sentry.js is the serverless half.
//
// The SDK is dynamically imported, not statically, so a tenant/session running without a DSN
// configured pays NOTHING for it — no added bundle weight, no init cost. This also happens to
// help the bundle-size finding in the app health review (one more chunk that only loads when
// actually used).

let sentryModule = null; // set once init succeeds; reportError()/reportMessage() check this

export async function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // inert — no Sentry account wired up yet

  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // browserTracingIntegration also captures Core Web Vitals (LCP/INP/CLS) on page load and
    // route change — no separate web-vitals package needed.
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2, // keeps well inside the free tier at current traffic; raise if needed
  });
  sentryModule = Sentry;
}

/**
 * Report a caught error with context. No-op (besides a console.error, so it's never silently
 * lost in dev) when monitoring isn't configured. Used by ErrorBoundary and anywhere a component
 * already catches its own failure but the failure is still worth knowing about in aggregate
 * (e.g. a partial-write failure the UI already surfaces to the user via a toast).
 * @param {Error} error
 * @param {object} [context]  Extra key/value context, e.g. { tenant, tool: "media-hub" }.
 */
export function reportError(error, context = {}) {
  if (!sentryModule) {
    if (import.meta.env.DEV) console.error("[monitoring, no DSN configured]", error, context);
    return;
  }
  sentryModule.captureException(error, { extra: context });
}

/** Same idea as reportError, for a non-exception warning worth tracking (no-op without a DSN). */
export function reportMessage(message, level = "warning", context = {}) {
  if (!sentryModule) {
    if (import.meta.env.DEV) console.warn("[monitoring, no DSN configured]", message, context);
    return;
  }
  sentryModule.captureMessage(message, { level, extra: context });
}
