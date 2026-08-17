# Progress / Onboarding Tab — spec (not built)

**Date:** 2026-08-17 · **Status:** SPEC'D, NOT BUILT · **Owner:** Rick Posada

**Decision needed before build starts:** none blocking — this spec can be built against once
prioritized. Sequenced behind the Security & Auth upgrade per Rick's 2026-08-17 call
(`docs/PROJECT_ROADMAP.md`), since it should sit behind real per-user auth once clients other
than Monti can see it.

## Why

Rick's ask (2026-08-17): a visible map of what's complete vs. still in development, both as his
own daily accountability tool AND — reused, not rebuilt — as an onboarding artifact new clients
see when they come on board. One data source, two audiences.

## What it is

A real route inside the CST platform (not a report, not an export) that renders
`docs/PROJECT_ROADMAP.md`'s structure as a visual map: threads as cards or a timeline, each with
a status badge (✅ Live / 🔧 In progress / 📋 Spec'd / 💭 Idea) and its "Next concrete action" line.

**Two views, one data source, gated by role:**
- **Agency Console view (admin/owner only):** ALL threads — platform-wide security, scale infra,
  ecommerce build, every client's ongoing work. This is Rick's internal map.
- **Client view (client / client-admin roles, once a tenant is onboarded):** ONLY that tenant's
  own thread(s) — e.g. Monti Trentini sees their own "ongoing operations" card and whatever
  onboarding-kit steps are still open for them, never CST's internal platform/security/other-client
  threads. This is the reused onboarding artifact.

## Data source — do not fork the truth

Per Part E discipline (no per-client code, config not forks): this page must NOT hardcode status
text. Two real options, pick one at build time:
1. **Parse `docs/PROJECT_ROADMAP.md`** at build/deploy time into structured data (status badges,
   next-action lines) — keeps one human-editable file as the only source of truth, same discipline
   as `config/clients/*.json`.
2. **A new `roadmap.json`** (or per-tenant `onboarding-status.json` alongside `config/clients/`)
   that both this page AND the daily email read from — more structured, but is a second place to
   remember to update unless the daily-email scheduled task also writes back to it.

Recommendation: start with option 1 (parse the markdown) — it's the file Rick is already being
asked to keep current for the daily email, so there's no new habit to maintain. Revisit option 2
only if the parsing gets fragile.

## Client-facing onboarding use

For a new client (client #2+), this becomes their literal onboarding checklist: which
onboarding-kit files they've returned (01–06), which template-tenant steps are done, what's next
before their tenant goes fully live. This reuses the exact "Next concrete action" pattern from the
internal map — same component, scoped to their tenant's slice of the roadmap data instead of all
of it.

## Explicitly out of scope for v1

- Editing roadmap status from the UI (the doc/JSON stays hand-edited for now — this is a read-only
  mirror, not a project-management tool).
- Any cross-tenant visibility for client-role users (hard gate, same as every other tenant-scoped
  surface in the app).
- Historical/trend view (e.g. "here's what shipped this month") — v1 is current-state only.

## Build sequencing

1. Land after the Security & Auth upgrade (this page will eventually be client-visible, so it
   should sit behind real per-user auth, not the shared passcode).
2. Confirm data-source choice (markdown parse vs. JSON) before writing the component.
3. Build the Agency Console (admin) view first — that's the version Rick uses daily regardless of
   client #2's timeline.
4. Add the client-scoped view once client #2's onboarding is actually underway, not speculatively
   before.

Related: `docs/PROJECT_ROADMAP.md`, `docs/CLIENT_ONBOARDING_GUIDE.md`, [[cst-template-tenant-onboarding]].
