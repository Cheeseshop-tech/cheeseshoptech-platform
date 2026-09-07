# CST Development Status Inventory — 2026-09-07

**Why this exists.** `docs/PROJECT_ROADMAP.md` (last synced 2026-08-23) and `docs/PROJECT_STATUS.md`
(last updated 2026-06-12) are both stale relative to real shipped work from September — the
2026-09-03 hardening plan, the 2026-09-03 priority roadmap, the Content Studio design-skills
thread, the Onboarding Engine scope, and the Asiago template port. Rather than patch two
increasingly-out-of-sync docs, this is a fresh, single-pass status grade across every real
CST system, done honestly: **real/live, in progress, spec'd-not-built, or idea-not-scoped.**
Treat this as the current source of truth; `PROJECT_ROADMAP.md`/`PROJECT_STATUS.md` are kept as
historical record, flagged at the top of each, not deleted.

**How to use this doc:** it's a snapshot, not a live feed. Re-grade a row when work on it lands,
don't let it drift the way the two files above did.

---

## Core platform

| System | Status | Notes |
|---|---|---|
| Multi-tenant architecture (tenant resolver, token theming) | ✅ Live | Foundational, unchanged since June. |
| Auth (Netlify Identity) | ✅ Live | Closed for real 2026-08-17 — see `[[cst-auth-upgrade]]`. Passcode gate fully retired. |
| House Command Center / Agency Console | ✅ Live | Portal dashboard w/ live feed, item 1 of the 2026-09 priority roadmap — in progress on later increments. |
| Media Hub / Brand Kit | ✅ Live | Real, Cloudinary-backed. No guided intake FLOW for a second brand yet — see `onboarding-engine/01-CORE-BUILD.md`. |
| Content Engine (slide templates, Studio Director, AI Polish) | ✅ Live | Stage 0/1/2 all built, not spec-only (corrects an earlier stale artifact). 9 template families as of 2026-09-06, +15 new variants (Asiago moods) 2026-09-07. |
| Pricing & Inventory tool | ✅ Live | Class-of-trade quoting, freight line items, lots/FIFO. Real gaps: sync-registration confirmed unreliable as of 2026-08-12 ([[monti-inventory-pricing-app-gap]]). |
| Campaign Management | ✅ Live, not yet accuracy-tested at scale | Real write path for campaign definitions since 2026-08-21. Real test = small-scale runs now → ACE Fall Show 2026-09-15. |
| Booth → HubSpot / Enrichment Campaigns | ✅ Live | Most mature piece of the whole platform vision — see `onboarding-engine/07-SALES-OUTREACH-ENRICHMENT-STATUS.md`. |
| Quote Builder | 📋 Scoped, not built | Spec exists (`QUOTE_BUILDER_SPEC_2026-08-13.md`), print-only delivery designed, not shipped. |
| Cheese Signs (retail case signage) | 🔧 In progress | v1 template family built + proofed 2026-08-23. Blocked on Stefano (pasteurized/raw, aging confirmation, official DOP artwork) before any commercial print run. |
| Test coverage | 🔴 Not started | Zero `.test.*` files anywhere in `src/` or `netlify/functions/`. Flagged as a standing, load-bearing risk since 2026-09-06 — Studio Director's scoring and Campaign Manager's checklist-gate logic are exactly the kind of pure functions cheap to test and expensive to get wrong silently. |

## Onboarding Engine (see `onboarding-engine/` folder for full detail)

| Piece | Status |
|---|---|
| Brand ingestion (Media Hub intake) | ✅ Live for manual/session-driven ingestion. No repeatable SOP. |
| Brand voice + design system extraction | 🔧 Proven manually for Monti. No repeatable procedure for a new brand. |
| Design algorithm | 🔧 Two real precedents (Theme Engine, Asiago mood grammar), neither is "a program." |
| Template generation — decks | ✅ Live, `family` pattern proven and reusable. |
| Template generation — social/blog/email | 🔴 Zero infrastructure. Content-type tags exist as filing categories only. |

## Future app functions (not part of the Onboarding Engine — see `onboarding-engine/02–06`)

| System | Status |
|---|---|
| Self-redesigning storefront | 🔴 Idea, barely scoped. No dynamic re-theming exists anywhere. |
| Operations backbone (manufacturing/replenishment/traffic/logistics) | 🔴 Idea, not scoped, beyond the real inventory sync already listed above. |
| Distributor partner portals | 🔴 Idea, not scoped. Nearest real precedent is the active ACE Endico relationship. |
| Social media automation + market watch | 🔴 Not started — confirmed roadmap item 7, correctly sequenced last. |
| E-commerce completion (7 sub-pieces: dynamic design, fulfillment pricing, liability, compliance, payment/tax, customer service, billing/accounting) | 🔴 Storefront READ path built but never run live; the other 6 sub-pieces have zero scope anywhere. Single largest remaining phase per Rick's own 2026-09-07 assessment. |

## Business/strategy threads (not engineering, but blocking engineering sequencing)

| Thread | Status |
|---|---|
| Agency-vs-product business model | 🟡 Unresolved since 2026-08-14, reopened 2026-09-07 by the Onboarding Engine scope. Currently answered in part: Monti stays the sole proving ground, no 2nd brand yet. |
| B2B/B2C platform split (branch + switch) | 🟡 New, unresolved as of 2026-09-07. Gates the e-commerce phase. |
| Multi-tenant/role flexibility (Hardening Plan Part B) | 🟡 Deliberately deprioritized 2026-09-03 ("no client onboarding imminent"). Onboarding Engine sequencing (Phase 0 = onboarding first) may reopen this — not yet re-decided. |
| Pricing model for client #2+ | 📋 Proposal exists (`PRICING_PROPOSAL_v1.1.md`), not locked. |

---

**Grounding note:** this inventory was compiled by cross-referencing `PROJECT_ROADMAP.md`,
`PROJECT_STATUS.md`, project memory files (`content-studio-design-skills.md`,
`cst-onboarding-engine-scope.md`, `cst-priority-roadmap-2026-09.md`, `cst-hardening-plan.md`),
and the `onboarding-engine/` doc set created the same day — not a fresh line-by-line code audit of
every system. Rows marked ✅ Live were independently code-verified in their own threads (see the
linked memory files); rows marked with a repo doc filename are as current as that file.
