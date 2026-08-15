# Backlog — the single source of truth for what's next

One list. Add items here (or tell Claude). Format: `- [impact/effort] description — why / blocker`.
See `docs/CONTINUAL_IMPROVEMENT.md` for the loop. Updated 2026-06-18.

## Now (next batch)
- [high/low] **Flip Sentry on** — code shipped 2026-08-14 (error boundary + Web Vitals on the
  browser, all 25 Netlify Functions wrapped), inert until a Sentry account exists. Rick: create the
  free account, set `VITE_SENTRY_DSN` + `SENTRY_DSN` in Netlify, redeploy. Steps in
  `docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md`.
- [med/med] **Catch vs exact weight in the UI + invoice states** — mark catch-weight lines "estimate" and
  exact-weight "firm" in the on-screen proforma; carry proforma → weighed → final-invoice states.

## Next
- [high/med] **Photo series per SKU (typed, ordered)** — move off one-image-per-code
  (`imageForCode` takes the first match) to the pack shot / beauty / styled series CLAUDE.md commits
  to. Do it expand → adapter → contract so Catalog, Proposals, Pricing, and Studio Director migrate
  one at a time; also settles the four double-packshot SKUs in `IMAGE_HEALTH_2026-07-09.md`. Step-by-step
  plan in `docs/IMAGE_PIPELINE_SPEC.md` § "Migration plan — one image per code → typed, ordered series".
  Rick's Cloudinary tagging pass can start now, ahead of any code change.
- [med/med] **Create a campaign from the UI** — campaign definitions are seeded in `src/lib/campaigns.js`;
  lifecycle state (status/checklist/results) already round-trips through Blobs. Needs a write path for
  definitions too. See `docs/HANDOFF_2026-08-03_campaign-pill-nav-and-email-lifecycle.md`.
- [med/med] **Campaign results from the ESP** — results are hand-entered today; wire opens/clicks from
  whichever ESP the Fall Tasting send lands on (Brevo, per the launch runbook).
- [low/low] **Widen the HubSpot company read** — add company size + a proven-customer flag to
  `crm-hubspot.js` so enrichment call priority can sort the way the prototype did (channel tier only today).
- [med/high] **Forecasting view** — now that shared history accrues (central store shipped), surface
  monthly run-rate + YoY in the Movement tab as it fills.
- [med/low] **Shelf-life → action** — from the Shelf Life tab, one-click "build a clear-out list / draft"
  for a chosen customer group (path to the per-customer sales sheet).
- [low/low] **Weekly shelf-life email** — auto-draft the <4mo list each week (extends monti-inventory-watch).

## Blocked
- [high/low] **Class-of-trade margin alignment** — reshape tiers to importer +15% / retail distrib +20–30% /
  food-service +25–35%. BLOCKED on Sales Management's real numbers. (On the next client data request.)

## Later
- [med/high] **Forecasting dashboards** — monthly/yearly projections once the history store has accrued data.
- [low/high] **Cost-of-goods / tariff + FX watch** — landed-cost versioning + trend for competitive positioning.
- [low/med] **Per-customer sales sheet** — generate a targeted sheet for a specific customer group from
  live availability + shelf life.

## Done (log)
- ✅ 2026-08-14 Error tracking + performance monitoring (Sentry, env-gated) — React error boundary +
  Web Vitals in the browser, all 25 Netlify Functions wrapped with exception + slow-response
  capture. Closes the "no monitoring" gap from `docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md`. Inert
  until the account exists — see the Now item above.
- ✅ 2026-08-03 Campaigns pill sub-nav (email / social / enrichment) + per-campaign lifecycle dashboard with a
  real launch-readiness gate; state in Netlify Blobs via `campaign-state.js`
- ✅ 2026-06-18 Live inventory feed (Netlify Blobs, weekly sync, no rebuild) — `e31086a`, `cc7229a`, `04ba2e4`
- ✅ 2026-06-18 $300 local trucking floor + proforma firm/estimate labels & liner notes — `c63348b`
- ✅ 2026-06-18 Shelf Life monitoring tab — `a618253`
- ✅ 2026-06-18 Live-wired home dashboard, proposals, agency data-health panel — `8926647`
- ✅ 2026-06-18 Polished passcode sign-in gate for go-live testing — `e21e389`
- ✅ 2026-06-18 Editable trucking + processing fees (base 300/135, presets + free entry) — `a6c0a74`
- ✅ 2026-06-18 Central movement history store (Netlify Blobs, shared) — unlocks forecasting
