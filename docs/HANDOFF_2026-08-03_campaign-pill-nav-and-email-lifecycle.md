# Handoff — Campaign Pill Nav + Email Campaign Lifecycle Dashboard (2026-08-03)

For: the next coding session in this repo (recommend Claude Code — see Recommendation below) · Owner: Rick Posada
Read first: `src/components/campaigns/campaigns-page.jsx`, `src/lib/campaigns.js`, `src/components/crm/crm-page.jsx`, `src/lib/crm.js` (the CRM tab is the architectural precedent this brief asks you to follow for the live-data/persistence pattern).
State: **BUILT 2026-08-03.** The spec below is kept as written for the record; what actually shipped, and the four
answers that shaped it, are in "What shipped" immediately below. Everything from "The ask" down is the original brief.

---

## What shipped (2026-08-03)

Rick answered the four open questions before the build; each answer is recorded next to the thing it decided.

| Question | Answer | Where it lives |
|---|---|---|
| 1. Enrichment — own pill or checklist item? | **Own pill, own lifecycle.** Confirmed by the runbook's own note that the 94-account phone pass is "a separate initiative… not part of this campaign's scope". An email campaign may still declare `dependsOn: ["ne-contact-enrichment"]` without owning it. | `CAMPAIGN_TYPES` in `src/lib/campaigns.js` |
| 2. Checklist — template or custom? | **Template seeds it, then editable per campaign** — add tasks, remove template tasks, restore them. | `CHECKLIST_TEMPLATES` + the `custom` / `hidden` state fields |
| 3. Admin passcode on writes? | **Yes — identical gate to the CRM console.** Reads take any valid passcode tier, writes are house/client-admin. No new auth concept. | `requireReadAuth` / `requireWriteAuth` in `netlify/functions/campaign-state.js` |
| 4. Where does strategy live? | **Link out + a short in-platform summary.** The brief and runbook stay the source of truth in the client project folder; the platform shows the positioning summary and a copyable pointer (plus a real link when a campaign has a URL). | `strategy.summary` / `.path` / `.runbookPath` / `.url` |

**Files**

- `netlify/functions/campaign-state.js` *(new)* — per-tenant Blobs store (`campaign-state`), GET/POST, sanitizing:
  status against the lifecycle, notes to 500 chars, custom items to 40, results to non-negative integers, document to 400 KB.
  Modelled line-for-line on `crm-outreach.js`.
- `src/lib/campaigns.js` *(rewritten)* — type registry, lifecycle, checklist templates, seeded definitions,
  `getCampaignState`/`saveCampaignState`, `mergeCampaign`, `readinessOf`, `canAdvanceTo`, `groupChecklist`.
- `src/components/campaigns/campaigns-page.jsx` *(rewritten)* — pill sub-nav over `CAMPAIGN_TYPES` (Radix
  `Tabs` from `ui/tabs.jsx`, as the brief suggested), per-type stat row, campaign cards with a readiness bar,
  and the single debounced save shared by the whole tab.
- `src/components/campaigns/campaign-detail.jsx` *(new)* — the lifecycle dashboard: launch-readiness checklist,
  strategy, content + nurture sequence, target prospects, results.
- `src/components/home/command-center.jsx` — now merges the same state overlay, so the hub can't disagree with
  the tab about what's launched. Its card became "Campaigns in flight" showing status + required-task progress
  (the old card read `kpis.revenue`/`kpis.reach`, which the new model doesn't carry).
- `config/clients/{montitrentini,demo,_template}.json` — campaigns tool-card copy no longer promises
  "reach, revenue and status".

**The architectural split** (the thing to keep if this gets refactored): campaign **definitions** are seeded in
`src/lib/campaigns.js` and versioned with the code; campaign **state** — status, checklist ticks, custom/hidden
tasks, results — lives in Netlify Blobs. Same shape as accounts-from-HubSpot vs outreach-state-from-Blobs on the
CRM tab, and for the same reason: these ticks are the real send gate, so they must be shared and survive any browser.

**The gate is real.** `canAdvanceTo()` blocks every status at or past `ready` until all required tasks are done, and
the UI disables those pills with the reason in the tooltip. Verified in the browser: Fall Tasting sits at 2/12
required and the Ready/Launched/Complete pills are disabled; ticking the remaining ten flips the banner to
"Clear to launch" and unlocks them — with both optional tasks still unticked, which is the correct behaviour.

**Seeded campaigns** (Monti Trentini): Fall Tasting Box (email, building, 2/12 — mirrors the runbook's verified
state on 2026-07-23), Asiago DOP Cold Outreach (email, complete), NE Contact Enrichment (enrichment, building, 2/5),
Fall Tasting social support (social, draft).

**Verified:** `npm run build` clean · `npm run validate:clients` clean · function handler exercised directly for
400/401/413 and note truncation · full click-through in the browser with no console or server errors.

**Not built / known limits**

- Creating a campaign from the UI. Definitions are seeded in code today; `NewCampaignDialog` was removed rather than
  left as a button that lies. A create path means writing definitions to the store too — a deliberate next step.
- The prospect panel reads `crm.companies`, which the **mock** CRM dataset doesn't have — so it shows "0 accounts"
  under `VITE_CRM_BACKEND=mock`, exactly as the CRM console does. It populates on the HubSpot backend.
- Enrichment call priority sorts by channel tier only. "Proven customer" and company size aren't in the HubSpot
  company read (`crm-hubspot.js` requests name/channel/city/state/domain/phone), so the artifact's full priority
  sort can't be reproduced without widening that read. Not faked.
- Per-account call outcomes stay in the outreach console rather than forking a second per-company overlay.
- Results are entered by hand. Wiring them to an ESP is a separate integration.

---

## The ask (Rick, verbatim intent)

Anchor campaign work in the CST portal's existing **Campaigns** tab. Add a **pill sub-navigation** at the top of that tab, organized by campaign type/project:

- **Email Campaigns** (build first)
- **Social Media** (future)
- **Enrichment Campaigns** (future — but see note below, may be a cross-cutting concern rather than its own pill)
- more types anticipated later, so the nav must be easy to extend

Within **Email Campaigns**, each campaign needs to become a full **lifecycle dashboard**, tracking a campaign from draft through launch and into results:

1. **Launch-readiness checklist** — the tasks that must be complete before a campaign is allowed to launch (this becomes the actual "is this ready to send" gate, not just a status label).
2. **Campaign strategy guide** — the brief/positioning doc for this specific campaign.
3. **Content** — the email copy/assets for this campaign.
4. **Target prospect list** — the audience, ideally the same live contact data the CRM tab already uses.
5. **Results tracking** — opens/replies/meetings/won, and an overall "success" read, once launched.

The first real campaign to populate this with is the **Fall Tasting Box** campaign (Monti Trentini) — see `monti_asiago_campaign/` in this repo and the mounted `Email/Campaign_Brain/Fall_Tasting_Campaign/` project folder for its brief, runbook, and copy. Its **contact-enrichment step** (94 contacts across 66 companies missing an email or a named buyer, who need a phone call before they can receive the send) is the first checklist item this dashboard should surface — a working version of that specific view was prototyped this session as a standalone Cowork artifact (`fall-tasting-enrichment`, live-pulls company size/channel from HubSpot via `search_crm_objects`, static contact list from `MT_Contacts_Master_2026-07-15.xlsx`'s "Phone Outreach Needed" tab). That artifact is a reference for the interaction design (expandable company rows, call-to-mark-done checkboxes, priority sort by proven-customer > channel tier > size) — not something to import directly, since it doesn't share this app's component/data conventions.

---

## Current state (verified in code today)

**Campaigns tab is a stub, 100% mock data.** `src/lib/campaigns.js`: `USE_MOCK` defaults true (`campaignsAreSample` flag), four hardcoded sample campaigns with a flat shape — `{id, name, status: draft|scheduled|active|completed, channels: [retail|dtc|social], start, end, goal, assets: <count>, kpis: {reach, orders, revenue}}`. `campaigns-page.jsx` renders a flat card list with summary stats — **no sub-navigation by type, no checklist, no linked strategy/content/prospect data.** `docs/BACKLOG.md` has no existing entry for this feature — it's net-new scope.

**A reusable pill/tab primitive already exists and is ready to use:** `src/components/ui/tabs.jsx` wraps Radix (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) with CST's own styling (`data-[state=active]:border-brand-primary`). This is very likely the right primitive for the Email Campaigns / Social Media / Enrichment Campaigns pill row — check other pages for existing usage examples before styling from scratch.

**The CRM tab is the architectural precedent to copy for live data + durable writes**, per its own header comment in `crm-page.jsx`: accounts/contacts are **live HubSpot, read-only** (`crm-hubspot.js`), while status/notes/last-reply are **platform-owned, written through `crm-outreach.js` to Netlify Blobs per tenant** — explicitly chosen over localStorage so state is "shared, survives any browser." This is the pattern the Email Campaign checklist/status data should follow — **not** mock data, and **not** browser-local storage, if it's meant to be the real tracking surface Rick works from daily. (This also explains the admin-passcode gate mentioned in the CRM tab's footer — the write path is passcode-protected; confirm with Rick whether the same gate should apply here.)

---

## Proposed shape (starting point, not locked)

- **New data model**, richer than the current `Campaign` mock shape — needs at minimum: `type` (email/social/enrichment, drives which pill it appears under), `checklist: [{label, done, required}]` (launch is gated on all `required` items being `done`), `strategyDoc` (link or embedded content), `content` (email copy/assets, could be a link into the existing Content Engine/Media Hub), `prospectList` (linked HubSpot list/segment — reuse `crm-hubspot.js` rather than building a second HubSpot fetcher), and `results` (opens/replies/meetings/won — mirrors `OUTREACH_STAGES`/`FUNNEL_STAGES` already defined in `crm.js`, don't reinvent).
- **Status lifecycle** richer than current `draft/scheduled/active/completed` — something like `draft → building → ready-to-launch (checklist complete) → launched → complete`, with the checklist gating the `ready-to-launch` transition specifically (this is the "dashboard for tracking the campaign from draft through launch" Rick asked for).
- **Backend**: a Netlify function + Blobs store per tenant, same pattern as `crm-outreach.js` — swap `campaigns.js`'s `USE_MOCK` path for a real one, the way `crm.js` already did for outreach state.
- **Enrichment as first-class checklist item type**: rather than "Enrichment Campaigns" necessarily being its own pill with its own campaign list, consider whether it's better modeled as a **checklist item type** attached to any Email Campaign (e.g. a "Contact enrichment" checklist item that expands into exactly the company/contact view prototyped in the Cowork artifact this session). Flag this as an open question for Rick — the pill-nav ask was explicit, but the enrichment *data* is really a pre-launch gate on an email campaign, not an independent campaign type with its own lifecycle. Confirm intent before building.

---

## Open questions for Rick (confirm before/during build)

1. Is **Enrichment Campaigns** truly its own pill/campaign-type, or a checklist-item type nested inside Email Campaigns (see note above)?
2. Should the checklist be a fixed template per campaign type, or fully custom per campaign?
3. Does the admin-passcode gate on CRM writes (`crm-outreach.js`) need to apply to campaign checklist/status writes too?
4. Where does "strategy guide" content actually live — pasted into the platform, or linked out to the Google Doc / markdown file in the client's project folder (e.g. `Email/Campaign_Brain/Fall_Tasting_Campaign/FALL_TASTING_CAMPAIGN_BRIEF.md`)? Linking is far less work and keeps one source of truth.

---

## Recommendation: hand off to code

This is real multi-file frontend + backend engineering — new data model, new Netlify function/Blobs wiring, new components, a status-lifecycle rewrite of an existing (currently mock) tab. It matches the scale of this repo's own established handoff pattern (`CLAUDE_CODE_BRIEF.md`, and the `HANDOFF_2026-07-01`/`07-09`/`07-19` docs already in `docs/`) — meaning this project already expects exactly this kind of doc to precede a coding session, rather than being built inside a content/campaign-ops Cowork session. Recommend picking this up in **Claude Code** (or an equivalent coding-focused session) scoped to this repo, starting from the Open questions above.
