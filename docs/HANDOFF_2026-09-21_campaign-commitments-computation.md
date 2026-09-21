# Handoff — Campaign commitments computation (Phase 2)

**Date:** 2026-09-21 · **Status:** built, not wired into any UI yet · **Read with:**
`docs/CAMPAIGN_ACCOUNTABILITY_AUTOMATION_SPEC_2026-09-21.md` (the full plan this is Phase 2 of)

## What shipped

`src/lib/commitments.js` — `computeCommitments(campaigns, opts)`, a pure function over an array of
already-MERGED campaigns (`mergeCampaign()` output — same shape `campaigns-page.jsx` and
`campaign-detail.jsx` already work with). No fetching, no writing, no new state — everything it
needs (`checklist`, `status`, `stateUpdatedAt`, `end`) is already on that object.

Three categories, plus a deduped `all` for the future digest:
- **`approvalNeeded`** — open campaigns with an incomplete `"approval"` checklist item.
- **`stalled`** — open campaigns with no state activity in `stalledDays` (default 6), falling back
  to the campaign's `start` date when it's never been touched at all.
- **`deadlineApproaching`** — open campaigns whose `end` is within `deadlineDays` (default 7,
  including already-passed dates so a missed deadline doesn't just age out silently) AND whose
  required checklist work isn't fully done (`readinessOf().ready === false`) — a campaign that's
  actually ready just hasn't been formally advanced, which isn't a commitment at risk.

Closed (`status === "complete"`) campaigns are excluded from every category, always.

## Verified

- `eslint` clean (0 errors).
- `vite build` transform stage clean (2060 modules — this file isn't imported anywhere yet, so it
  doesn't show up in the bundle; that's expected for a Phase 2 lib-only commit).
- No test framework exists in this repo, so verification was a standalone re-implementation of the
  same logic run against (a) the real live `montitrentini` campaign data (fetched directly via
  `AGENT_GATE_PASSCODE`, confirming the one genuinely-open campaign — `ace-endico-fall-show-rep-
  qualification-phone-pass` — correctly surfaces as stalled + deadline-passed while all four
  closed campaigns are correctly excluded from every category) and (b) a synthetic 3-campaign case
  specifically exercising the approval-item branch and the "ready campaigns aren't falsely flagged
  as at-risk even within the deadline window" branch. Both matched expected output.

## Not done yet (Phase 3 / 4, per the spec)

- No UI. Nothing calls `computeCommitments()` from a component yet — the "Commitments" panel
  (Phase 3) is the next real user-visible step, gated so Rick and client-admin (Stefano, once his
  role is bumped — still outstanding, a Netlify Identity dashboard click, not code) can both see it.
- No scheduled task, no Blobs store, no email drafting (Phase 4) — email mechanism is decided
  (Gmail via Chrome, `sales@montitrentini-usa.com`, per the spec's update) but nothing built
  against it yet.
- Enrichment and event checklist templates still have no dedicated `"approval"` item (flagged in
  the spec, not resolved) — `approvalNeeded` structurally can't fire for those two types until
  that's decided one way or the other.
