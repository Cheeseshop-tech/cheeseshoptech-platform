# Rep Territory Assignments — spec

**Date:** 2026-09-21 · **Status:** SPEC'D, BUILT · **Owner:** Rick Posada

## Why

Rick, 2026-09-21, building the "ACE ENDICO REP customer visits" campaign: "I want to now
identify areas and prospect and reps. create the process and Ill select the reps and regions
and the system CST should populate the fields with the details and call consol and email
button." Clarified over several follow-ups:

- Reps load LIVE from HubSpot ("we have the ace contacts in hub spot and emails so just load
  them"), not typed in by hand and not a new reusable directory.
- Rick pairs each rep to their region(s) himself ("Pair each rep to their region(s)") — states,
  with optional city/town narrowing ("states city town") — because HubSpot only carries the
  distributor's HQ address on every contact, never the rep's own territory ("we dont have the
  rep region info since their contacts show the ACE headquarters not the regions or their home
  address").
- The moment a rep's region is filled in, Target Prospects should populate itself — no separate
  apply step ("create the field to be filled in that will automatically route itself once
  filled out").
- Not a one-off for Ace Endico: "in the near future we will wire other distributors and their
  reps to the campaign engine" — and wire it into the New Campaign template too ("lets wire
  this function to the template also so we wont have to build from scratch each time").

## Decisions made

1. **Reps are live HubSpot contacts, matched by company name, not a new directory.** The
   existing `crm-hubspot.js` read already returns every contact with its free-text `company`
   field (used for the CRM console's owner join). Rep Territory Assignments reuses that same
   data — no new Netlify Function, no second HubSpot line — filtering `crm.people` by a
   distributor name Rick types once ("Ace Endico", or any future distributor).
2. **Region assignment is manual, stored per rep, generalized beyond the old PA-only pattern.**
   Each rep gets `states: ["NY","NJ",...]` plus optional `cities: {PA: ["philadelphia",...]}`
   — the same `{states, cityAllowlist}` shape `segmentOf()` already filters on, just built by
   hand per rep instead of hardcoded once for PA. A state is narrowed to specific cities only
   when *every* rep covering it gave city names; one rep with no narrowing keeps the whole
   state in the segment.
2a. **Territory-first UI (2026-09-21, revised same day after first pass shipped).** Rick's
   reaction to the first version (free-text "NY, NJ, PA" inputs per rep): "I need som boxes and
   by state city town/ borough so wne the boxes get check and I lock in territory the list for
   the focused territory is right below the rep list then once teritory is matched it populates
   in the rep dropdown." Rebuilt as: check state/city checkboxes (built from the live CRM's own
   state→city breakdown, so only real places with accounts show up — boroughs come along for
   free since HubSpot stores them as plain city values), see the matching account list update
   live right below the checkbox tree, then pick the rep from a dropdown and click "Lock in
   territory" to save. Locking in MERGES (unions) into that rep's existing assignment rather
   than replacing it, so a rep's territory can be built up across more than one lock-in pass.
   The underlying data shape is unchanged (`repVisits.reps[].states/cities`) — only the input
   method changed, so nothing else in the pipeline (`deriveRepFilter`, `mergeCampaign`,
   `campaign-state.js`) needed to change.
3. **Auto-routes on save — no apply button.** `mergeCampaign()` derives `audience.filter` from
   the saved rep assignments on every read, so the instant Rick blurs a "States covered" field
   the autosave fires and Target Prospects above recomputes from the new filter on next render.
   A campaign with a fixed `companyIds` list is left alone — an exact, hand-qualified scope
   always wins over a derived one.
4. **Reusable across any distributor, not hardcoded to Ace Endico.** The HubSpot company name
   is data (`repVisits.source` in campaign-state, or `audience.repsFrom` set at creation), not
   a constant. The same panel and the same `deriveRepFilter()` helper work for any distributor's
   campaign.
5. **Wired into the New Campaign template.** `new-campaign-form.jsx` gained an optional "Rep
   source — HubSpot company" field, saved as `audience.repsFrom` on the campaign definition, so
   a *future* distributor-visits campaign gets the Rep Territory Assignments tab live from the
   moment it's created — no bespoke build each time. A campaign made before this field existed
   (like the current Ace Endico one, whose definition is already locked once created — see
   `campaign-defs.js`'s upsert-only POST) can still set its source from the tab itself; that
   value is saved into the mutable `campaign-state.js` overlay instead.
6. **Call console + email button, on both prospect rows and rep rows.** Reused
   `PhoneInline` (existing) and added a new `EmailInline`, wrapping the same tenant-identity-
   aware Gmail-compose helper (`composeUrl()`, `src/lib/crm.js`) Booth's Calendar/Recap buttons
   already use — the rep or prospect's email opens pre-addressed from the shared sales identity,
   Send is still a manual tap.

## What shipped

```
CampaignDetail "Rep territory assignments" section (new, every campaign gets one)
   │
   ▼
RepVisitsPanel
   │  "Distributor — HubSpot company name" input → repVisits.source
   │  getCrmData(resolved) → crm.people (reps) + crm.companies (territory checkbox tree/preview)
   ▼
National rep list (read-only display: name/title, current region badge, PhoneInline, EmailInline)
   ▼
Territory builder: state checkboxes, expandable to real city/town/borough checkboxes for that
   state (built live from crm.companies, not a static list) → live preview list of matching
   accounts right below → "Assign this territory to" rep dropdown → "Lock in territory" button
   ▼
lockInTerritory() merges the checked states/cities into the chosen rep's existing assignment
   ▼
onPatch({ repVisits: { source, reps: [...] } })  — same debounced autosave as every other
   campaign-detail field (items/comments/documents)
   ▼
netlify/functions/campaign-state.js — sanitizes + stores `repVisits` in the per-campaign entry
   ▼
src/lib/campaigns.js mergeCampaign() — deriveRepFilter(state.repVisits.reps) →
   audience.filter = { states, cityAllowlist }  (skipped if audience.companyIds already exact)
   ▼
ProspectPanel / segmentOf() — reads the merged campaign's audience.filter exactly as it already
   does for any other campaign; Target Prospects list updates on the next render, automatically.
```

### Files touched

1. **`netlify/functions/campaign-state.js`** — new `repVisits: {source, reps: [...]}` field in
   the per-campaign state shape, sanitized like `documents`: bounded array (`MAX_REPS = 300`),
   every field length- and shape-checked, `states`/`cities` normalized to uppercase 2-letter
   codes / lowercase city names.
2. **`netlify/functions/campaign-defs.js`** — `audience.repsFrom` (free text) accepted at
   creation time, for the New Campaign template wiring.
3. **`src/components/campaigns/new-campaign-form.jsx`** — new optional "Rep source — HubSpot
   company" field, saved into `audience.repsFrom`.
4. **`src/lib/campaigns.js`** — `deriveRepFilter(reps)` (new export): turns rep→region
   assignments into `{states, cityAllowlist}`. `mergeCampaign()` now derives `audience.filter`
   from `state.repVisits.reps` when present, and exposes the raw `repVisits` for the editor.
5. **`src/lib/crm.js`** — no changes; reused existing `composeUrl()` and the `people` array
   `crm-hubspot.js` already returns.
6. **`src/components/campaigns/campaign-detail.jsx`** — new "Rep territory assignments"
   section (`RepVisitsPanel`, `RepRegionRow`), new `EmailInline` component wired next to
   `PhoneInline` in both `CallRow` (prospects) and `RepCallRow` (the older hardcoded Sales Rep
   Contacts panel, kept for `ace-fall-show-2026`'s existing seeded rep list).

### Not touched, on purpose

- The older hardcoded `audience.salesReps` / `SalesRepPanel` / `RepCallRow` "Sales Rep Contacts"
  panel (rep-qualification calls, keyed by email) stays exactly as-is — it's a different job
  (confirm territory + whether their accounts fit) for the one seeded campaign that already uses
  it. The new Rep Territory Assignments panel renders on every campaign, seeded or custom.
- `campaign-defs.js`'s create-only POST (409 on an existing id) is unchanged — region
  assignments and the rep source for an already-created campaign live entirely in the mutable
  `campaign-state.js` overlay, never in the immutable definition.
