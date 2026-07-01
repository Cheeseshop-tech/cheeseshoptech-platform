# Handoff — Market Intelligence / Opportunity Engine (2026-07-01)

**For:** the next session (Rick is moving to Sonnet 5) · **Read first:** `docs/MARKET_INTELLIGENCE_SPEC.md`,
then this. **State:** Slice 0 + 1 shipped on mock, **compiles, uncommitted on disk.**

## Where this came from (the goal)
Connect the app's "nerve endings" so the Content Engine speaks from **brand voice + market opportunity +
customer profile**, not brand voice alone. The brand story is the **selector** — brand-fit scoring picks
which story angle capitalizes on a given market signal. This makes the positioning line
(*"Content Engine wired into the client's CRM"*) literally true. Full architecture + build slices are in
`docs/MARKET_INTELLIGENCE_SPEC.md` (§8 lists what shipped).

## What shipped (on mock — no credentials used)

**Slice 0 — reconcile (Salesforce is dead → HubSpot IS the CRM):**
- `src/lib/crm.js` — header + Sample comment now say HubSpot; added `CHANNEL_TO_AUDIENCE` + `audienceOf()`
  (the customer→brand-voice join). Mapping: Distributor→distributor · Restaurant/Chef→foodservice ·
  Specialty grocer + Retail chain→retail · Partner/Producer→excluded. **Amend the mapping only here.**
- `src/components/home/command-center.jsx` — SampleTag comment fixed to HubSpot.
- `src/components/home/agency-console.jsx` — `SEAMS`: CRM `liveWhen:"hubspot"`; added a `signals` row.

**Slice 1 — the Opportunity Engine:**
- `src/data/montitrentini/signals.json` — 8 hand-authored Monti market signals (seasonal/category/intent/
  competitive), each with `audience`, `storyHints` (→ brand story blocks), `skus` (catalog product ids).
- `src/lib/signals.js` — `getSignals()` seam, gated `VITE_SIGNALS_BACKEND=mock|function`; `signalsAreSample`.
- `src/lib/opportunities.js` — **pure** `rankOpportunities({crm, signals, brandKit, catalog})`. Joins CRM
  accounts × signals, scores brand-fit (0.45) × timeliness (0.30) × account-value (0.25), returns ranked
  `{ id, accountId, who, audience, whyNow, angle, headline, intro, storyKeys, signalKeys, skuCodes, score }`.
- `src/lib/proposals.js` — `emptyProposal()` gains `buyerId` + `signalKeys` (additive; v1 share links still valid).
- `src/components/home/command-center.jsx` — **Opportunities lane** (top 4 cards, why-now + angle + fit score)
  with a **Compose** button → seeds a proposal draft (`saveDraft`) → `onNavigate("compose")`.
- `src/App.jsx` — imports `ProposalBuilder`; new **non-nav `compose` route** renders it (bypasses nav check
  like `proposal` does). This **revives the previously orphaned `ProposalBuilder`** as the Compose target;
  `ContentStudio`/SlideStudio keeps the "proposals" nav slot untouched.

## How to verify
```
# dev
npm run dev            # open Monti tenant → Home → "At a glance" → Opportunities lane → Compose

# build (note: `npm run build` may hit an EPERM on dist/.DS_Store in some sandboxes — harmless,
# it's the outDir cleanup, not the code). Build to a fresh dir to confirm compilation:
npx vite build --outDir /tmp/cst_check --emptyOutDir --logLevel warn
```
Engine sanity (already run): Eataly Flatiron (distributor, active reorder) tops at **97** with the
supply-chain angle; foodservice/retail accounts get the fall-boards provenance angle. Ranking is
differentiated and brand-fit visibly picks the story.

## Open / next (in order)
1. **Review + commit.** Changes are uncommitted — Rick's convention is review-then-push. Suggested message:
   `feat(intelligence): Opportunity Engine slice 0+1 (reconcile HubSpot + signals→content, on mock)`.
2. **Slice 2 — wire HubSpot read-only.** Blocked on the **HubSpot Private App token** in Netlify env
   `HUBSPOT_TOKEN` (scopes: contacts/companies/deals read). Then `netlify/functions/crm.js` maps HubSpot →
   the app shape and flip `VITE_CRM_BACKEND=hubspot`. Real accounts/channels/activity flow into the engine.
3. **Slice 3 — Market News card + morning brief.** Ambient daily read (cheese-trade + consumer). Recommended
   v1 source = a scheduled morning research task writing `market-news.json` (no connector to stand up). A
   house-only "→ Signal" action promotes a news item into Tier 2. Spec §2a / §4 / §5.
4. **SKU pre-select.** `rankOpportunities` already resolves `skuCodes` when given a `catalog`; the Command
   Center currently doesn't pass one. Pass the tenant catalog so Compose pre-selects SKUs.

## Watch-outs
- **Two "Content Studio" titles.** `ContentStudio` (SlideStudio deck composer, nav "proposals") and the
  revived `ProposalBuilder` (route "compose") both render an h1 "Content Studio". Cosmetic; rename if it
  confuses users. Naming hygiene note is in `CST_POSITIONING_BRIEF.md`.
- **Signal `skus` are catalog product ids** (e.g. `asiago-fresco-dop`), a few were best-effort — verify against
  `catalog.json` before relying on SKU pre-select.
- **Market signals stay house-authored** for v1 (part of the CST orchestration value) — don't hand signal
  authoring to clients.
- Memory updated: `cst-opportunity-engine.md` (+ MEMORY.md index).
