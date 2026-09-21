# Handoff — Rep Territory Assignments (2026-09-21)

**Spec:** `docs/REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md`

## What shipped

1. **`netlify/functions/campaign-state.js`** — new `repVisits: {source, reps}` field in the
   per-campaign state document. `MAX_REPS = 300`. Each rep: `email` (key), `name`, `phone`,
   `jobtitle`, `states` (array of 2-letter codes), `cities` (map of state → array of lowercase
   city/town names). Folded into the same "nothing worth storing" / `clean[id]` construction as
   `documents`/`comments`.
2. **`netlify/functions/campaign-defs.js`** — `audience.repsFrom` (free-text HubSpot company
   name), accepted at campaign-creation time only.
3. **`src/components/campaigns/new-campaign-form.jsx`** — new "Rep source — HubSpot company"
   optional field, feeding `audience.repsFrom`.
4. **`src/lib/campaigns.js`** — new export `deriveRepFilter(reps)`; `mergeCampaign()` now
   derives `audience.filter` from saved rep assignments (skipped when `audience.companyIds` is
   already an exact list) and exposes `repVisits` on the merged campaign.
5. **`src/components/campaigns/campaign-detail.jsx`**:
   - New "Rep territory assignments" section on every campaign (`RepVisitsPanel`).
   - `RepVisitsPanel`: a "Distributor — HubSpot company name" input, live HubSpot contact match
     (reusing `getCrmData()` — the same read `ProspectPanel` and the CRM console already use, no
     new fetch), search box, and one `RepRegionRow` per matched rep.
   - `RepRegionRow`: expandable row, `PhoneInline` + new `EmailInline`, "States covered"
     (comma-separated) and "City/town narrowing" (`"PA: Philadelphia, Pittsburgh; NY: Buffalo"`)
     inputs, saved on blur through the existing `onPatch` autosave.
   - `EmailInline` (new, shared): wraps `composeUrl()` from `src/lib/crm.js` (same
     tenant-identity-aware Gmail-compose Booth's Calendar/Recap buttons already use). Wired in
     next to `PhoneInline` in both `CallRow` (Target Prospects) and `RepCallRow` (the older
     Sales Rep Contacts panel).

## For the Ace Endico campaign specifically

The "ACE ENDICO REP customer visits" campaign was already created (via the New Campaign form,
before this field existed), so its definition has no `audience.repsFrom` baked in —
`campaign-defs.js`'s POST is create-only (409 on an existing id, confirmed by reading the file
this session) and can't be edited after the fact. That's fine by design: open the campaign, go
to the new "Rep territory assignments" section, and type `Ace Endico` into the "Distributor —
HubSpot company name" field once. It'll load the same 64 contacts already confirmed live in
HubSpot (company id `324918430431`) via `crm.people`'s company-name join. From there, assign
each rep their state(s) and (optionally) which cities/towns within a state — Target Prospects
above updates automatically, the same render.

## Verified

`eslint` on all six touched files — 0 errors (5 pre-existing `react-hooks/exhaustive-deps`
warnings across the file, including one new one on `RepVisitsPanel`'s `getCrmData` effect,
same shape as three other pre-existing warnings in this file — not a functional issue).
`vite build` — transform stage succeeded (2061 modules, 0 errors); the build then hit the
sandbox's stray `dist/.DS_Store` unlink-permission quirk (documented in earlier handoffs, not a
code issue) — requested delete permission for the repo folder, removed it, and the full build
completed clean (`✓ built in 5.49s`).

No test framework in this repo, so there's no automated coverage for the live HubSpot-match
logic or the auto-derived filter — worth Rick doing one real pass after this deploys: open the
Ace Endico campaign, type the company name in, assign one rep a state, and confirm Target
Prospects above narrows to it.

## Not done — flagged for later

- No bulk "assign these 10 reps to NY" action — each rep is set individually. Fine at Ace
  Endico's scale (a few dozen field reps); worth revisiting if a future distributor's rep list
  is much larger.
- No warning when two reps are assigned overlapping territory (both cover "NY") — the derived
  filter just unions everyone's states, so overlap doesn't break anything, it just means more
  than one rep shows up "responsible" for the same prospects. Left as-is since Rick didn't ask
  for conflict detection and the call console still shows who's assigned.
- The company-name match is a simple normalized substring match (same technique
  `crm-hubspot.js` already uses for its owner join) — a distributor whose contacts have
  inconsistent company-field spelling in HubSpot will need that cleaned up there, same
  limitation the existing CRM console already has.
