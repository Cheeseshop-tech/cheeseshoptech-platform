# CST Unified Direction — 2026-09-07

**Why this exists.** By early September, CST had several scope documents describing different,
sometimes-contradicting futures: the 2026-09-03 priority roadmap (7 hardening items, sequenced as
if they were the whole plan), the 2026-08-14 business-model crossroads (unresolved), the
2026-09-03 hardening plan (Part B multi-tenant work explicitly parked), and the 2026-09-07
Onboarding Engine scope (a much bigger platform vision). Read separately, they read as competing
plans. This doc is the single reconciliation — what's actually decided, in what order, and what's
still genuinely open. Superseded/stale statements are called out explicitly below rather than
silently dropped.

## The actual sequencing, as Rick has now confirmed it (2026-09-07)

1. **Onboarding Engine build-out (Phase 0, active now)** — get Monti Trentini's data and systems
   fully into the 7-core-apps nucleus. See `onboarding-engine/01-CORE-BUILD.md`.
2. **Campaign Management small-scale test runs (in progress now)**, building toward the
   **ACE Endico Fall Show, 2026-09-15** — Booth-to-meeting app + Contact Enrichment campaigns used
   live, as the real proof point for campaign-switching accuracy.
3. **Hardening (Phase 2)** — this is where the 2026-09-03 priority roadmap's 7 items
   (`cst-priority-roadmap-2026-09.md` in project memory) actually live now. **This supersedes that
   doc's implicit framing of itself as the near-term plan in isolation** — the 7 items are the
   testing/validation pass that proves what onboarding brought in actually works (live
   functioning, wiring, templates, output), not a data-accuracy gate onboarding has to clear
   first.
4. **Post-Fall-Show launch**: landing-page / email / social-media campaigns.
5. **Design-flip phase** (`content-studio-design-skills.md`) continues in parallel wherever Rick
   pulls a specific tool forward (as with `awesome-design-md` and the Asiago template port) —
   it's not gated behind the phases above, but the broader "all CST apps" rollout still waits
   behind roadmap items 1–6 per the original 2026-09-03 framing, unchanged.
6. **Social automation + market watch** — roadmap item 7, unchanged position: after the launch
   above, not pulled forward.
7. **E-commerce completion** — the largest remaining phase. See
   `onboarding-engine/06-ECOMMERCE-EXPANSION.md`. Gated behind the B2B/B2C decision below.
8. **Distributor portal integration** — piloted with ACE Endico, after e-commerce. See
   `onboarding-engine/04-DISTRIBUTOR-PORTALS.md`.

## What this explicitly supersedes / corrects

- **`docs/PROJECT_ROADMAP.md` (last synced 2026-08-23) and `docs/PROJECT_STATUS.md` (last updated
  2026-06-12)** are both stale — neither reflects the hardening plan, the priority roadmap, the
  Onboarding Engine scope, or the design-flip work from September. Both files now carry a banner
  at the top pointing here and to `CST_DEVELOPMENT_STATUS_2026-09-07.md`. They are NOT deleted —
  they're real history — but should not be read as current planning.
- **`cst-priority-roadmap-2026-09.md`'s framing** as a self-contained near-term plan is corrected
  above — its 7 items are real and still the right hardening checklist, just re-slotted as
  Phase 2 rather than the starting point.
- **`cst-hardening-plan.md` Part B's deprioritization** ("no client onboarding imminent," decided
  2026-09-03) is **reopened, not yet re-decided.** If Phase 0 above is genuinely "onboarding
  first," multi-tenant readiness may need to move back up. This is flagged, not resolved — see
  Open Decisions below.

## What's genuinely settled now (don't re-litigate)

- Monti Trentini remains the sole proving ground for the Onboarding Engine — not a second brand
  yet. Confirmed 2026-09-07.
- The ACE Endico Fall Show (2026-09-15) is the named real-world proof point for Campaign
  Management, Booth, and Contact Enrichment — not a hypothetical future test.
- E-commerce is understood as seven real sub-pieces (dynamic storefront, fulfillment pricing,
  liability, compliance, payment/tax, customer service, billing/accounting), not just "dynamic
  design." Don't scope it as smaller than that going forward.
- Stefano-partnering-in-CST: closed 2026-08-21, Rick decided not to pursue it. Don't resurface.

## Open decisions — need Rick's explicit call before the engineering below them starts

1. **B2B/B2C platform architecture** — one storefront per tenant that switches mode, or genuinely
   separate B2B/B2C surfaces? Gates all of `onboarding-engine/06-ECOMMERCE-EXPANSION.md` and
   `02-CAMPAIGN-AND-STOREFRONT.md`'s dynamic re-theming work. See
   `cst-business-model-crossroads.md`.
2. **Multi-tenant/role flexibility (Hardening Plan Part B)** — still deprioritized, or does
   Phase 0's onboarding-first framing change that? Not yet re-decided.
3. **Human-in-the-loop vs. automatic design algorithm** — for the Onboarding Engine's core build.
4. **Which non-deck channel to prove first** (email is the standing suggestion) — for template
   generation infrastructure.
5. **Billing/accounting system scope** — Monti's customer-facing billing, CST's own agency
   billing, or both? Not yet clarified with Rick.

## Where each piece of documentation now lives

- `docs/onboarding-engine/` — the actual engineering scope, one doc per section, core build
  separated from every future app function.
- `docs/CST_DEVELOPMENT_STATUS_2026-09-07.md` — whole-platform status inventory, fresh as of this
  date.
- This doc — sequencing and conflict resolution.
- Project memory (`cst-onboarding-engine-scope.md`, `cst-business-model-crossroads.md`,
  `cst-priority-roadmap-2026-09.md`, `cst-hardening-plan.md`, `content-studio-design-skills.md`)
  — session-continuity detail and full history; cross-referenced from here, not duplicated.
