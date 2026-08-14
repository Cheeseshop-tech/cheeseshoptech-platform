// Top-level render-error boundary. Before this (2026-08-14), an uncaught render error anywhere
// in the tree produced a blank white screen — no message, no recovery path, and nothing was
// ever logged anywhere. See docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md.
//
// Deliberately NOT Sentry's own <Sentry.ErrorBoundary> component: that component needs the SDK
// loaded synchronously, but lib/monitoring.js dynamically imports Sentry so a DSN-less session
// pays zero bundle cost for it. This boundary works identically whether or not monitoring is
// configured — reportError() itself is the no-op-safe part.

import { Component } from "react";
import { reportError } from "@/lib/monitoring.js";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md rounded-base border border-border bg-surface p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-fg">Something went wrong on this page</h1>
          <p className="mt-2 text-sm text-fg-muted">
            The error has been recorded. Reloading usually clears it — if it keeps happening, tell Rick what
            you were doing right before this appeared.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-base bg-brand-primary px-4 font-medium text-brand-on-primary hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
