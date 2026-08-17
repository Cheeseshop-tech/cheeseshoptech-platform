// Hand-maintained summary of docs/PROJECT_ROADMAP.md, rendered by the Agency Console's Project
// status panel (added 2026-08-17, per Rick's ask: "add Cheese Shop TECH project status to the
// House Command Center dashboard"). This is a deliberate v1 shortcut per
// docs/PROGRESS_TAB_SPEC_2026-08-17.md — that spec's recommendation was to parse the roadmap
// doc's markdown directly, but PROJECT_ROADMAP.md is a running narrative log (corrections,
// timestamps, superseded sections), not clean structured data, so parsing it reliably was judged
// too fragile for v1. This file is a structured mirror kept in sync BY HAND whenever
// docs/PROJECT_ROADMAP.md's thread statuses change. If this ever drifts from that doc, the doc is
// the source of truth — fix this file to match it, not the other way around.
//
// Admin-only, read-only (no write-back to the doc from the UI — same "out of scope for v1" call
// as the spec). Consumed by ProjectStatusPanel in agency-console.jsx.

export const PROJECT_STATUS_UPDATED = "2026-08-17";

export const PROJECT_THREADS = [
  {
    id: "security-auth",
    label: "Security & Auth upgrade",
    status: "live",
    statusLabel: "Live",
    progress: 100,
    nextAction:
      "Closed for real, verified end-to-end (real Identity gating live data, write-guard fix deployed). Only open item: Stefano finishing his own Identity password reset.",
  },
  {
    id: "scale-10",
    label: "Scale to 10 clients",
    status: "in-progress",
    statusLabel: "In progress",
    progress: 55,
    nextAction:
      "Decide and lock the pricing model (v1.1 proposal exists) — gates how client #2 is actually proposed and signed.",
  },
  {
    id: "ecommerce",
    label: "Ecommerce — D2C + Wholesale (\"the jewel\")",
    status: "in-progress",
    statusLabel: "Foundations laid",
    progress: 28,
    nextAction:
      "Build Phase 2 of wholesale ordering (buyer email gate) — the identity layer everything after it depends on. Separately: confirm Monti's real Shopify store to turn the D2C read from mock to live.",
  },
  {
    id: "monti-ops",
    label: "Monti Trentini — ongoing operations",
    status: "live",
    statusLabel: "Live",
    progress: 100,
    nextAction:
      "Upkeep only. Open, not urgent: decide whether HUBSPOT_TOKEN should move to a Service Key per HubSpot's current guidance.",
  },
];

// Items flagged in the doc's "Also on the radar, not yet a tracked thread" section — surfaced
// here so they don't quietly fall off Rick's radar between full roadmap re-reads.
export const PROJECT_RADAR = [
  "CST business model crossroads — Stefano's interest in partnering in CST itself (not just being a client) is unresolved and higher-stakes than any thread above.",
  "This panel is the Agency Console (admin) view of the in-app Progress/Onboarding tab spec — the client-scoped view is next, once client #2's onboarding is actually underway.",
];

export const STATUS_BADGE_VARIANT = {
  live: "success",
  "in-progress": "info",
  spec: "muted",
  idea: "muted",
};
