# App Health & Roadmap — 2026-08-14

Snapshot of the platform's technical state: errors/known issues, what shipped recently, performance,
and an honest completion read against "market ready." Built from git history (323 commits,
2026-06-05 → 2026-08-13), `docs/BACKLOG.md`, `docs/WIRING_AUDIT_2026-07-15.md`, `docs/BUILD_LOG.md`,
the one formal incident report, and a live build run. Companion to the weekly `docs/BACKLOG.md`
review — this one looks at the app itself, not just what's next.

---

## 1. Errors & known issues

**The core gap: there is no error tracking or monitoring.** No Sentry/Bugsnag/equivalent, no React
error boundaries, no Netlify Function error/latency dashboard connected. Every incident to date has
been caught by Rick noticing something looked wrong, not by the app telling anyone. The 2026-07-25
incident report says this explicitly: *"two consecutive incidents on the same surface, both
invisible to application logging, both first reported by a human noticing something looked wrong.
That is the gap worth closing."* Nothing has closed it since.

**Live/open right now:**
- **Auth model — house passcode leaked to a client GM (2026-08-14, today).** Real, live exposure.
  Per-user auth (Netlify Identity, Phase 3) is already built but dormant behind
  `VITE_AUTH_MODE=passcode` — this is a flag flip, not a rebuild, but it hasn't been flipped yet.
- **Zero automated tests** (0 `.test.`/`.spec.` files in `src/`). All verification today is manual
  spot-check + `npm run build` green, per `CONTINUAL_IMPROVEMENT.md`'s own safety rules. Fine for
  the current pace; won't scale past one tenant + one operator.
- **Quote Builder approvals gap** — quotes log records the quote, but accepted/declined tracking is
  the explicitly-named remaining piece (`docs/BUILD_LOG.md`, 2026-08-13).
- **Two corrupted product titles** in the catalog (`Asiago Stag03023 …lbsionato DOP`, `Asiago Fresco
  PDM —…28-30 lbs`) — flagged 2026-07-25, still open.
- **`images.json` staleness** — no auto-resync or "last synced" indicator (P2, 2026-07-15 audit).

**Fixed, but worth knowing they happened:**
| Date | What broke | Caught by | Time to fix |
|---|---|---|---|
| 2026-08-13 | Monti logo silently 404'd on production since ~05-25/06-15 — including the buyer-facing proposal cover | Rick, manually | Same session |
| 2026-07-25 | "Download PNG" returned blank HTTP 400 on 31/386 assets (Cloudinary 10MB derived-image cap) | Rick, manually | ~1 hour |
| 2026-07-24 | Media Hub images went blank — a Deploy Preview was manually published to prod with an empty API key | Rick, manually | Same day |
| 2026-07-16 | Unauthenticated read endpoints — `crm.js`, `items-get.js`, `media-list.js`, `inventory.js` and others had zero server-side auth; anyone with the URL could read tenant CRM/pricing/inventory | Internal wiring audit | Same day |

**Fix-commit rate:** 39 of 323 commits (12%) are explicit fixes across the project's life; 19 of the
last 111 commits (last 30 days) are fixes (~17%). Normal for active development, not alarming — but
there's no dashboard tracking this trend, it's hand-counted from git today.

---

## 2. What shipped — last 30 days (since 2026-07-15)

111 commits. Highlights, newest first:

- **Quote Builder** (new, 2026-08-13) — 4th quoting surface: one-page branded rate card, margin/markup
  pricing, exact reference-matched color palette, quotes-issued log.
- **Booth** (new, 2026-08-06→14) — offline-first field-sales tool: card OCR scan, auto-crop/framing
  guide, desktop webcam shutter, lead taxonomy, offline-retry sync.
- **Campaigns pill-nav + lifecycle dashboard** (2026-08-03) — real launch-readiness gate
  (`canAdvanceTo()`), per-campaign checklist, enrichment console, geo breakdown.
- **CRM Outreach console** (2026-07-19→21) — ported from a prototype artifact onto live HubSpot
  wiring, region normalization, 429 backoff, worked-row filtering.
- **Content Engine Part C** — AI Polish (Claude Messages API, server-revalidated), Affineur's Note
  slide template, 6 new layout templates with guardrailed AI layout-swap.
- **Auth hardening** — access-log panel (per-login, IP/city/state), per-tenant manager passcode fix,
  read-endpoint auth closed (the P0 above).
- **Product Catalog** — item-truth identity join (names from `items.js`, not stale `catalog.json`
  copies), alphabetical load order, bulk photo matching.
- **Inventory pipeline** — Drive `modifiedTime` as the real "last updated" source instead of a
  hand-typed banner cell (closed a silent-typo class of bug).

Net: the app gained two entirely new surfaces (Booth, Quote Builder) and hardened auth/data-integrity
on existing ones, in one month, solo.

---

## 3. Performance

Ran a real production build (`vite build`) to check — first attempt failed on the sandbox
(architecture mismatch + a stray `.DS_Store` the mount won't let go of, both environment artifacts,
not app bugs). Second run, clean:

- **1,698 modules, compiles clean, no errors.**
- **Main JS bundle: 1.055 MB (286.5 KB gzip)** — one chunk. Vite's own warning threshold is 500KB;
  this is over 2x it. There is no route-based code splitting — a visitor opening only the Shelf Life
  tab downloads all of Booth, Quote Builder, Campaigns, Media Hub, Content Engine, etc. in the same
  bundle.
- CSS: 38.7 KB (7.9 KB gzip) — fine.
- One prior perf fix already shipped: Media Hub first paint capped at 12 tiles / 50 per "Load more"
  (2026-07-18), after it was identified as a load-time problem.
- No real-world timing data exists (no RUM, no Lighthouse CI) — the bundle-size finding above is a
  code-shape observation, not a measured page-load number. Worth treating as a "watch" item, not
  urgent — nobody's complained about slowness yet, but the bundle will keep growing under the current
  structure.
- 29 Netlify Functions, all cold-start serverless, no latency/error-rate visibility (same monitoring
  gap as §1).

**Recommendation if this becomes a priority:** `build.rollupOptions.output.manualChunks` split by
tool (Booth / Quote Builder / Campaigns / Content Engine each their own chunk) — cheap, mechanical,
no architecture change. Not urgent at current traffic (one tenant, small internal + buyer audience).

---

## 4. Full build list — status by area

| Area | Status | Completion (rough) |
|---|---|---|
| Multi-tenant core (auth, theming, routing) | Live, one real tenant proven | ~95% — hardening: flip passcode → per-user auth |
| Pricing / Quoting suite (Pro Forma, Proposals, Quote Builder, Shelf Life) | Live, feature-rich | ~90% — quote approvals tracking is the open piece |
| CRM / Outreach (HubSpot) | Live, real data (697 contacts) | ~85% — company size + proven-customer flag still on backlog |
| Media Hub / Content Engine | Live on real Cloudinary, AI Polish shipped | ~80% — `images.json` staleness, minor dedup cleanup open |
| Campaigns | Lifecycle dashboard + gate built | ~60% — no UI to create a campaign def, results still hand-entered |
| Booth (field sales) | New, shipping fast | ~70% — real tool, still stabilizing (10 commits in 8 days) |
| Forecasting | History store + monthly pipeline built | ~40% — blocked on Sales Management's real class-of-trade margins |
| Storefront (Shopify) | Code-complete scaffold only | ~20% — deliberately still mock, correct call per the audit |
| Observability / testing | No monitoring, no automated tests | ~10% — the single biggest gap, see §1 |
| Client #2 / true multi-tenant proof | Not started | 0% — everything above is proven on exactly one tenant |

**Open backlog (from `docs/BACKLOG.md`, 2026-08-03):**
- Now: catch-weight UI states (proforma estimate → weighed → final invoice)
- Next: campaign creation from the UI, campaign results from the ESP, wider HubSpot company read,
  forecasting view, shelf-life → action, weekly shelf-life email
- Blocked: class-of-trade margin alignment (on Sales Management)
- Later: forecasting dashboards, cost-of-goods/tariff watch, per-customer sales sheet

**Doc debt worth naming:** `docs/PROJECT_STATUS.md` (the stated "definition of done" tracker) is
dated 2026-06-12 — two months and ~200 commits stale. It still lists things as "NOT STARTED" that
have since shipped (auth roles, campaigns, content engine, quote builder). `DEVELOPMENT_PLAN.md` is
the same age. Neither is wrong about intent, both are wrong about current state — same pattern the
2026-07-15 audit already flagged for other docs. Worth a correction pass or retiring them in favor
of `BACKLOG.md` + this doc as the living trackers.

---

## 5. Market-ready evaluation

**Operationally live for tenant #1 (Monti Trentini), not yet market-ready as a sellable
multi-tenant product.** The feature surface is genuinely strong for a solo build in ~10 weeks — five
quoting/CRM/content tools, real integrations, a real client using it. The gap to "ready to onboard
client #2" isn't feature count. It's three specific things:

1. **Auth has to flip from shared passcode to per-user before a second client signs** — today's leak
   is the proof. The fix is built and dormant; flipping it is the actual next milestone, not a
   feature.
2. **No observability.** Every incident so far was caught by a human, not the system. That's
   survivable at one tenant with one very attentive operator; it does not survive a second tenant.
3. **Zero automated tests, one operator holding the whole build in his head.** Fine today; a real
   risk the day this needs a second builder or Rick is unavailable for a stretch.

None of these are large builds — auth is a flag flip, error tracking is a Sentry account + a few
hours of wiring, tests can start narrow (the pricing/quoting math, since that's what a wrong number
costs money on). They're just not on the feature backlog today because nothing has broken badly
enough yet to force them up. Recommend treating "flip auth + add basic error tracking" as the actual
next batch, ahead of new features, given today's incident.
