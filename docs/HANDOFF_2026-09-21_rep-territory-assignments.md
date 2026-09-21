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
     new fetch), a national rep list (read-only display), and a **territory builder**: state
     checkboxes built live from `crm.companies`' own state→city breakdown (expandable to
     city/town/borough checkboxes for that state — only real places with accounts show up), a
     live preview list of matching accounts right below the checkboxes, an "assign to" rep
     dropdown, and a "Lock in territory" button that merges the checked boxes into the chosen
     rep's `states`/`cities` (union, not replace — a rep can be built up across more than one
     lock-in pass) and saves through the normal autosave. **Revised same day** after Rick's
     first-pass feedback: "I need som boxes... so wne the boxes get check and I lock in
     territory the list for the focused territory is right below the rep list then once
     teritory is matched it populates in the rep dropdown" — the original per-rep free-text
     "States covered" input (`RepRegionRow`) was replaced entirely by this checkbox-and-lock-in
     flow; no other file needed to change since the underlying `repVisits.reps[].states/cities`
     shape is identical.
   - `EmailInline` (new, shared): wraps `composeUrl()` from `src/lib/crm.js` (same
     tenant-identity-aware Gmail-compose Booth's Calendar/Recap buttons already use). Wired in
     next to `PhoneInline` in both `CallRow` (Target Prospects) and `RepCallRow` (the older
     Sales Rep Contacts panel), and in the national rep list rows in `RepVisitsPanel`.

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

`eslint` on all six touched files — 0 errors both before and after the territory-builder
revision (7 `react-hooks/exhaustive-deps` warnings total in campaign-detail.jsx, all the same
pre-existing shape — missing `resolved` dep on a data-fetch effect, `companies` derived inline
— already present elsewhere in this file before this feature). `vite build` — transform stage
succeeded both times (2061 modules, 0 errors); the build then hit the sandbox's stray
`dist/.DS_Store` unlink-permission quirk (documented in earlier handoffs, not a code issue) —
requested delete permission for the repo folder once, removed it, and the full build completed
clean (`✓ built in 5.36s` on the final revision).

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

## Revision 2 addendum — account-by-account assignment (2026-09-21, same day)

Second same-day revision, after Rick saw the checkbox territory builder working and asked for
the next layer: per-account rep assignment, since "reps will have some accounts scattered even
in other reps territories." Ran `engineering:system-design` first — see the spec's "Revision 2"
section for the full reasoning; short version: a stored region filter can't represent a
scattered exception, so account-level assignment (keyed by stable HubSpot company id) is now
the one source of truth, and territory checkboxes became a bulk-write convenience into it
rather than a stored rule.

### What changed

1. **`netlify/functions/campaign-state.js`** — `repVisits` now also accepts
   `accountAssignments: {companyId: repEmail}` (capped at 5,000 entries, every value validated
   as email-shaped). The old `reps[]` field is still accepted (read AND write) so a campaign
   saved under the first revision isn't silently wiped — it just stops being written to once the
   UI saves anything new.
2. **`src/lib/campaigns.js`** — new `accountAssignmentScope(accountAssignments)`: returns the
   assignment map's keys as an exact company-id list, or `null` if empty. `mergeCampaign()` now
   prefers this (as `audience.companyIds`, `exact: true`) over the old `deriveRepFilter()`-based
   approximation; the old path only fires as a fallback for a campaign with legacy `reps[]` data
   and no `accountAssignments` yet. `deriveRepFilter()` itself is untouched/still exported (kept
   for that fallback and for anything else that might read it).
3. **`src/components/campaigns/campaign-detail.jsx`** — `RepVisitsPanel` restructured into
   explicit Step 1 / Step 2:
   - Step 1 (territory checkboxes + "Lock in territory") is unchanged in appearance but now
     bulk-writes `accountAssignments` directly instead of merging into a per-rep states/cities
     record.
   - Step 2 (new): the instant any state is checked, the matching accounts render right there —
     name, `addressOf()`-formatted address, `PhoneInline`, `EmailInline` — each with its own
     "Responsible rep" `<select>` defaulting to that account's current assignment (or
     "Unassigned"). Changing it calls `assignAccount(companyId, repEmail)`, which patches
     `accountAssignments` immediately, independent of step 1 — this is the actual mechanism for
     the "scattered account" case.
   - The national rep list's per-rep badge is now derived (`repStats`, a `useMemo` over
     `accountAssignments` joined against live company data) — count + state spread computed
     from real assignments, not a separately-entered value.
   - Rendering is capped at 300 rows per open territory (`PREVIEW_RENDER_CAP`) with a "narrow
     with a city checkbox" hint beyond that, so opening an entire large state doesn't stall the
     page.

### Verified

`eslint` on all three touched files — 0 errors (9 warnings total in campaign-detail.jsx, all
the same pre-existing `react-hooks/exhaustive-deps` shape already present before this feature
— missing `resolved`/`companies` deps on effects and memos that derive from props, same pattern
`ProspectPanel` already had). `vite build` — clean, 2061 modules, 0 errors, `✓ built in 5.62s`.

No test framework in this repo. Worth Rick doing one real pass after this deploys: open the Ace
Endico campaign (or wherever the first revision's territory was already locked in), check that
those accounts either show up already assigned under Step 2, or re-lock the territory once to
populate `accountAssignments` for the first time — then try moving one account to a different
rep and confirm Target Prospects above still shows it correctly.
