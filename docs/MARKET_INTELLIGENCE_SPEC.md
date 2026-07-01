# Market Intelligence — The Opportunity Engine

**Status:** Draft (2026-07-01) · **Owner:** Rick Posada · **Read with:** `CONTENT_ORCHESTRATION_SPEC.md`,
`BRAND_KIT_AND_PROPOSAL_SPEC.md`, `DATA_OWNERSHIP_MAP.md`, `INTEGRATION_WIRING_BRIEF.md`, `CST_POSITIONING_BRIEF.md`.

## 0. The ask (decoded)
Today the Content Engine speaks from **one** input: brand voice. Rick wants it to speak from **three** —
**brand voice + market opportunity + the specific customer profile** — so a proposal/deck/campaign isn't just
on-brand, it's aimed. This is the build that makes the positioning line literally true:
*"the Content Engine wired into the client's CRM."* We are adding the **market** nerve ending and the **join**
that fuses all three into a suggested next action.

```
Market News (raw daily read: cheese-trade + consumer category)
       │  distill (house or AI pass)
       ▼
Market Signal (trend + audience + SKUs)  ──────────────────────┐
Brand Voice   (brand-kit · attributes + storyBlocks + phrases) ─┼─► Opportunity Engine ─► Content Studio ─► buyer
Customer      (CRM/HubSpot · company + Channel + activity)      ─┘   (brand story SELECTS the spin)   (pre-seeded)
```
**The brand story is the selector, not a passive input:** a trend is scored against the brand's `attributes`
+ `storyBlocks`, and the engine surfaces the specific spin that capitalizes on it (high fit = fire, low fit =
skip). That scoring is how "brand story decides what's effective on a current trend."

## 1. Current-state evaluation (what's already wired vs. missing)

| Layer | State in the build | Verdict |
|---|---|---|
| **Brand voice** | `brand-kit.json` — single-source; `voice`, 7 `readyPhrases`, 6 `storyBlocks` tagged by 3 audiences (`retail`/`foodservice`/`distributor`). `brandKit.js` exposes `AUDIENCES` + `storyBlocksFor(audience)`. | **Solid. Reuse as-is.** The join key already exists: `audience`. |
| **Content engine** | `Content Studio` (SlideStudio) + `Proposal Builder`. Proposal model carries `audience` → filters story blocks. Composes from Brand Kit + Media Hub. | **Solid frame, single-input.** Needs a buyer ref + a market-signal input added to the same pattern. |
| **Customer profile** | CRM seam (`lib/crm.js`) — **mock**. Real HubSpot: 632 contacts, 189 companies channel-tagged (`Distributor 39 · Specialty grocer 60 · Restaurant/Chef 45 · Retail chain 32 · Partner/Producer 13`). Config already set `"crm": "hubspot"`. | **Data exists, not connected to content.** Buyer is a free-text field, not a record. |
| **Market signal** | *Nothing.* No signal/opportunity/intent concept anywhere in `src` or `docs`. | **The real gap.** This is net-new. |
| **The join** | *Nothing.* Nothing reads CRM + brand + market together. `command-center.jsx` shows CRM & campaigns side by side but they don't talk. | **The real build.** The Opportunity Engine. |

### 1a. Two things to fix first (they will misroute this exact build)
1. **Stale Salesforce wiring.** `INTEGRATIONS_PLAN.md` (06-13) still says *CRM = Salesforce, HubSpot = content
   only*. The newer decision (`INTEGRATION_WIRING_BRIEF.md` 06-17, `PROJECT_STATUS.md`, live config) is
   **Salesforce dead → HubSpot IS the CRM**. But the code still points at the dead path: `crm.js` comment says
   *"Real source = Salesforce"*, `command-center.jsx` `SampleTag` says *"CRM = Salesforce"*, and `agency-console.jsx`
   `SEAMS` has CRM `liveWhen: "make"`. **Reconcile to direct-HubSpot** before wiring the customer nerve ending,
   or the "customer profile" this spec depends on is pointed at nothing.
2. **Audience↔Channel taxonomy mismatch.** Brand voice has 3 audiences; HubSpot has 5 channels. Define the
   crosswalk **once** (below) so a buyer's channel deterministically selects the right story blocks.

## 2. Data model — add ONE new domain, extend TWO existing files

Follows the `DATA_OWNERSHIP_MAP.md` rule (one authoring home per fact) and the proven **seam + flag + function**
pattern. Nothing is duplicated; everything joins on `audience` and `sku`.

### 2a. New domain: `signals` — TWO tiers, one bridge (the market nerve ending)

Market intake is two-tiered. Both read behind seams that mirror `getCampaigns`/`getCrmData`.

**Tier 1 — Market News (ambient, the morning read).** `getMarketNews(resolved)` in `lib/market-news.js`,
gated `VITE_MARKETNEWS_BACKEND=mock|function`. Two categories, cheese-industry + consumer:
```jsonc
{ "id": "news-2026-07-01-01", "category": "trade",     // trade | consumer
  "headline": "Specialty grocers expand imported alpine cheese sets for fall",
  "summary": "Retailers reporting stronger provenance-led SKUs into Q4 entertaining.",
  "url": "https://…", "source": "Cheese Market News", "date": "2026-07-01",
  "tags": ["provenance","fall","specialty-grocer"] }
```
Not per-account, not scored — just a scannable daily brief. **Source options (pick one for v1, §5 Slice 3):**
a scheduled Cowork research task that writes `market-news.json` each morning (lowest setup, no new
credential — recommended to start), an Apify news scraper, or a news/RSS API. Cadence = **daily, refreshed
overnight** so it's ready as a morning read.

**Tier 2 — Signal (structured, the sales-strategy foundation).** Authoring home
`src/data/<tenant>/signals.json` (mock now), read via `getSignals(resolved)` in `lib/signals.js`, gated
`VITE_SIGNALS_BACKEND=mock|function`. A news item is **promoted to a signal** (by a house click or an AI
distill pass) — this is the bridge. A signal is small and angle-first:

```jsonc
{
  "id": "sig-2026-fall-boards",
  "scope": "market",                 // market | segment | account
  "audience": ["retail", "foodservice"],
  "type": "seasonal",                // seasonal | category-trend | intent | reorder | competitive
  "title": "Fall entertaining ramps — cheese-board season",
  "insight": "Sept–Nov is peak board/gifting demand for specialty grocers and chef menus.",
  "suggestedAngle": "Lead with the alpine-origin story block + Asiago DOP; pair with the board how-to.",
  "skus": ["ASIAGO-DOP", "GRANA-PADANO"],
  "source": "seasonal-calendar",     // provenance (calendar | ahrefs | zoominfo | apify | manual)
  "freshness": "2026-07-01"
}
```
Add `signal` to the Data Ownership Map table: **authoring home = signals.json (house-admin only, it's part of
the CST orchestration value); consumed read-only by the Opportunity Engine + Content Studio.**

### 2b. Extend the customer layer: the crosswalk (recommended default — adjust in one place)
Add to `lib/crm.js` (or a small `lib/customer.js`):
```js
// HubSpot Channel (5) → brand-voice audience (3). One authoring home for the join.
export const CHANNEL_TO_AUDIENCE = {
  "Distributor":        "distributor",
  "Restaurant / Chef":  "foodservice",
  "Specialty grocer":   "retail",
  "Retail chain":       "retail",
  "Partner / Producer":  null,        // not a sell-to buyer — excluded from targeting
};
export const audienceOf = (company) => CHANNEL_TO_AUDIENCE[company?.channel] ?? null;
```
Once a buyer is chosen from CRM, `audienceOf()` auto-selects the right story blocks and readyPhrases — **the
customer-profile → brand-voice wire, for free, because the story blocks are already audience-tagged.**

### 2c. Extend the composition model (parallel to the existing `storyKeys` pattern)
In `lib/proposals.js` `emptyProposal()` add two fields — additive, back-compatible with the URL-encoded v1:
```js
buyerId: "",       // CRM company/contact ref (replaces free-text `buyer` as the source of truth)
signalKeys: [],    // selected market-opportunity angles — parallels storyKeys[]
```
Content now composes from three sources at render time: `storyBlocks` (voice) + `signals` (market) +
buyer record (profile). Keep it a **reference**, never a copy (same rule as pricing/SKUs).

## 3. The Opportunity Engine (`lib/opportunities.js`) — the actual "connect the nerve endings"
A **pure function**, no new infra, testable, demo-ready on mock data:
```js
rankOpportunities({ crm, signals, catalog, brandKit }) -> Opportunity[]
```
Each `Opportunity` fuses the three layers into one actionable card:
- **who** — account/segment (from CRM: e.g. "Eataly Flatiron", channel → audience)
- **why now** — the triggering signal(s): a market angle (`seasonal`) and/or an account signal (`reorder`,
  positive `sample feedback` in `activity`)
- **what to say** — the **brand-fit selection**: score the signal's trend against the brand's `attributes`
  + audience-matched `storyBlocks`, and surface the specific spin (story block + readyPhrase) that best
  capitalizes on it. High fit → suggested; low fit → the opportunity is de-prioritized or dropped. This is
  where the brand story decides the angle, not the trend.
- **what to make** — a one-click **Compose** that deep-links into Content Studio pre-seeded with
  `{ buyerId, audience, storyKeys, signalKeys, skus }`
- **score** — transparent weighting (activity recency × **brand-fit** × open-pipeline value) so it ranks;
  no black box. Brand-fit is a first-class factor, not an afterthought.

This is the piece that lets the app "speak from market opportunities, directly to the customer profile."

## 4. UI surfaces (four changes, smallest-first)

1. **Command Center → fusion view (upgrade what exists).** `command-center.jsx` "At a glance" already loads CRM
   + campaigns. Add a third lane — **"Opportunities"** — rendering the top N `rankOpportunities()` cards, each
   with a **Compose** button. This is where brand voice + market + customer visibly meet. Highest-visibility,
   lowest-net-new surface.
2. **Content Studio / Proposal Builder → a "Targeting" rail.** Pick a buyer from CRM → audience auto-fills →
   story blocks filter → matching market signals appear as suggested angles → readyPhrases surface. Turns the
   composer from *brand-voice-only* into *brand + market + profile*. (The proposal already has `audience`
   driving story blocks — this rail just sources it from a record and adds the signal picker.)
3. **Home dashboard → Market News card (the morning read).** A `MarketNews` card on the home hub: two tabs
   (`Trade` / `Consumer`), each row = headline · source · date, opening the article. A house-only **"→ Signal"**
   action on a row promotes it to Tier 2 (the bridge). Refreshed overnight so it's ready as a morning read.
   Deliberately lightweight — this is skim, not analysis.
4. **Integration-health panel → add the nerve endings.** In `agency-console.jsx` `SEAMS`, add `signals` and
   `market-news` rows and flip CRM `liveWhen` to `hubspot`. The panel already *is* the nerve-map; make it show
   the new ones.

## 5. Build slices (dependency order — each independently shippable, honors "action beats setup")

- **Slice 0 — Reconcile (½ day, no deps).** Fix §1a: HubSpot as CRM in comments/flags/SampleTag; land the
  `CHANNEL_TO_AUDIENCE` crosswalk. Pure cleanup; unblocks everything.
- **Slice 1 — Opportunity Engine on mock (1–2 days, NO credentials).** Add `signals.js` + a hand-written
  `signals.json` (6–8 real Monti seasonal/category angles), `opportunities.js` pure function, extend
  `emptyProposal()`, render the Opportunities lane on Command Center read-only, wire Compose → Content Studio
  seed. **Demo-ready immediately** — proves the concept to MT ownership *and* to prospect brands, on the
  platform track, waiting on no one. This is the two-track rule in action.
- **Slice 2 — Real customer profile (when HubSpot token lands).** Wire `crm.js` read-only to HubSpot
  (`crm.objects.contacts/companies/deals.read`); opportunity cards + targeting rail use real accounts,
  channels, reorder cadence, and sample-feedback activity.
- **Slice 3 — Market News card + morning brief (1 day, no new credential to start).** Add the `MarketNews`
  card (mock `market-news.json` first), then wire the source. **Recommended v1 source: a scheduled morning
  research task** that writes `market-news.json` overnight (cheese-trade + consumer category) — no connector
  to stand up, ready as a morning read. The `→ Signal` promote action provides the bridge into Tier 2.
- **Slice 4 — Real structured signal feed (optional, one connector).** Replace the seasonal-calendar/mock
  behind the `signals` seam with ONE live source: search demand (Ahrefs), buyer intent/firmographics
  (ZoomInfo), or retail-assortment/review scraping (Apify). Add sources incrementally; the model already
  supports mixed provenance via `signal.source`.

## 6. Reminders / things not to lose
- **HubSpot Private App token is still not provided** (`INTEGRATION_WIRING_BRIEF.md` checklist). Slice 1 needs
  none; Slice 2 is blocked until it's in Netlify env `HUBSPOT_TOKEN`.
- **Keep market signals house-authored at first.** They're part of the CST orchestration value (the monthly
  fee), same governance as the Brand Kit — don't hand signal authoring to clients.
- **`Partner / Producer` is not a sell-to channel** — excluded from targeting by the crosswalk; confirm that's
  the intent.
- **Scope guard (paralysis-by-setup):** ship Slice 1 on mock before touching any live connector. The engine's
  value is provable without a single new credential — resist wiring three data sources before the join exists.

## 7. Locked decisions (fill as confirmed)
- [x] Channel→audience crosswalk built as in §2b (`crm.js` `CHANNEL_TO_AUDIENCE` / `audienceOf`); amend there.
- [x] Market signals are house-authored (client-invisible authoring) for v1.
- [x] Slice order 0 → 1 → 2 → 3/4 accepted; Slice 1 built on mock first.
- [x] Compose target = the (previously orphaned) `ProposalBuilder`, revived behind a **non-nav `compose`
      route** in `App.jsx` — reached only from an opportunity's Compose button, so the client menu is
      unchanged. `ContentStudio`/SlideStudio keeps the "proposals" nav slot.

## 8. Shipped — Slice 0 + Slice 1 (2026-07-01, on mock)
- **Slice 0:** reconciled Salesforce→HubSpot in `crm.js`, `command-center.jsx`, `agency-console.jsx`
  (`SEAMS` CRM `liveWhen: "hubspot"`, added a `signals` seam row); added the channel→audience crosswalk.
- **Slice 1:** `data/montitrentini/signals.json` (8 real Monti market signals) · `lib/signals.js` seam
  (`VITE_SIGNALS_BACKEND`) · `lib/opportunities.js` (`rankOpportunities`, brand-fit-weighted) ·
  `emptyProposal()` gains `buyerId` + `signalKeys` · Opportunities lane on the Command Center with a
  Compose button that seeds a proposal draft and jumps into the builder. Build compiles; engine output
  verified against mock CRM (Eataly/distributor tops the rank).
- **Next:** Slice 2 (wire HubSpot read-only — needs `HUBSPOT_TOKEN`) · Slice 3 (Market News card + morning
  brief) · pass a real `catalog` into `rankOpportunities` so Compose pre-selects SKUs.

---
*CheeseShop TECH · the platform multiplies the team · keep this honest and current.*
