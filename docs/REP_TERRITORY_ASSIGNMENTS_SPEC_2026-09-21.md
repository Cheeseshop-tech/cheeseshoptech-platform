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


## Revision 2 — account-by-account assignment (2026-09-21, same day)

Rick, after seeing the checkbox territory builder work: "the mechanism is there to select the
rep and the territory now it need to register and once a territory is opend the accounts un
each territory with addresss phone numbers and email address open up un the rep in drop down
menus. so two steps territory selection the key account selection. often reps will have some
accounts scattered even in other reps territories so the first two steps build the broad shape
state town borough then account will also have a drop down to select responsable rep
assignment. this way the account by account remains flexable."

Ran this through `engineering:system-design` before touching code, since it changes the shape
of the source-of-truth data, not just the UI. Conclusion: a stored geometric filter (state/city
per rep) can never correctly represent "this one account is the scattered exception" without
also either over- or under-including its neighbors — so the filter can't be the source of
truth once individual overrides exist. The fix is to stop storing a filter at all and store the
actual assignment.

**New model — two steps, one source of truth:**

1. **Step 1 (territory, UI-only gesture).** Check state/city/town/borough boxes as before, pick
   a rep, "Lock in territory." This is now purely a BULK-WRITE convenience: it snapshots
   whichever accounts currently match the checked boxes and writes each one's assignment. No
   territory *shape* is stored anywhere — only the resulting assignments.
2. **Step 2 (accounts, the actual data).** The moment any state is checked, every matching
   account opens up right there — name, address, phone, email (all already-live HubSpot company
   fields) — each with its own "Responsible rep" dropdown. Changing one saves immediately,
   independent of step 1, so a rep's scattered account in another rep's state stays correctly
   assigned no matter how the broad territories get redrawn later.

**Data model, revised:**
```
repVisits: {
  source: string,                              // unchanged
  accountAssignments: { [companyId]: repEmail } // NEW — the only source of truth
  reps: [...]                                   // legacy (first revision), still accepted on
                                                 // read/write so nothing already saved is lost,
                                                 // but no longer written to by the UI
}
```
`companyId` is the live HubSpot company id — stable under any later territory redefinition,
unlike a state/city key. `mergeCampaign()`'s new `accountAssignmentScope()` (`src/lib/
campaigns.js`) turns the assignment map's keys straight into `audience.companyIds` (an EXACT
scope, not an approximation) whenever any account has been assigned — this is a strictly better
fit than the old derived `audience.filter`, since `segmentOf()` already treats `companyIds` as
authoritative over a filter, and an exact id list handles scattered accounts natively (a filter
never could). The old `deriveRepFilter()`/filter-based path is kept as a read-only fallback for
a campaign that was locked in during the first revision and hasn't been touched since — the
instant Rick opens that campaign's Rep Territory Assignments tab again and saves anything, it
migrates onto `accountAssignments` on its own (the panel writes the new shape from then on).

**Per-rep display change:** the "states covered" badge on each rep in the national list is now
DERIVED from the accounts actually assigned to them (counted + state-spread computed on the
fly), not a stored/entered value — it can never drift out of sync with the real assignments the
way a separately-maintained states array could.


## Revision 3 — crossover territory (2026-09-22, shipped)

`accountAssignments` went from `{companyId: repEmail}` to `{companyId: [repEmail]}` — Rick:
"leave the flexability to assign the same terrritory to multiple reps since there are a few
opperating in the same or crossover areas in the same city or town or state." A bare string is
still accepted on read and upgraded to a one-element array in place, so nothing saved needed a
migration pass. "Lock in territory" ADDS a rep to each matched account instead of overwriting
whoever was there, and each account row's checkbox is scoped to one rep.


## Revision 5 — shipped (2026-09-22)

Revision 4's roster and ADR-002's territory book are both built and wired into the campaign
manager. What shipped, and where it differs from the design below:

- **`RepVisitsPanel` and `RepTerritoryCard` are gone**, replaced by `RepRosterPanel`
  (campaign-detail.jsx). Territory *editing* moved out of the campaign entirely, into the
  Territory Book tool — a territory outlives the campaign, so a campaign panel is the wrong owner.
  The campaign panel reads the book and shows what each rostered rep covers.
- **`repRoster`** added to campaign-state.js: `{source, reps: {email: {name, phone, jobtitle,
  addedAt, emailedAt, dropped}}}`, capped at 200, email-validated. Dropping a rep sets `dropped`
  rather than deleting — having emailed someone is a fact about the past.
- **`mergeCampaign(def, state, book)`** takes the book as an optional third argument. Precedence:
  hand-qualified `audience.companyIds` → roster×territory scope → legacy `accountAssignments` →
  legacy region filter. A campaign with no roster behaves exactly as it did before.
- **`rosterEmails()` / `repProgress()`** added to campaigns.js. Progress is derived from facts
  already recorded (roster `emailedAt`, rep-call `outcome`/`territory`, book account count) — four
  independent dots, not a funnel.
- The book loads on its **own** promise in campaigns-page.jsx, outside the `Promise.all` that sets
  `loadOkRef`: a failed book read must not block checklist autosave. No book simply means no
  territory-derived scope.

Verified against the real modules in the browser: a one-rep roster pulls only that rep's
territories (another rep's accounts stay out — the roster filter is what makes a shared book safe),
two reps dedupe a shared account, a dropped rep is excluded, a campaign with no roster still falls
back to its own assignments, hand-qualified ids still win, and a null book leaves the audience
untouched rather than narrowing it to nothing.

Not verified: anything needing live CRM data or Netlify Functions — localhost serves neither.


## Revision 4 — rep-first model (2026-09-22) — DESIGNED, PARTLY SUPERSEDED

> **Superseded in part by `docs/ADR-002_territory-as-first-class-entity_2026-09-22.md`.** The
> roster half below stands as written. The "rep book" storing a flat `assignments` map does NOT:
> a later requirement the same day (territory reporting, lookup, and click-through for visit
> planning) makes Territory a named object with an id, and `rep → accounts` becomes derived from
> it. Read this revision for the roster; read ADR-002 for anything about territory storage.

Rick, on seeing Revision 3 work:

> I think we need to re design this. now its selct aterritory then assign a rep. I want to pick
> the reps list first for the campaign then assign territory second as we go. I want to beable
> to launch the cmpaign with an email then follow up with phone calls. and while I develop my
> communication and relationship with the rep I will build in the accounts and the territories

Revisions 1–3 each improved how a territory becomes an assignment. This one changes what the
campaign is ABOUT: the rep is the unit of work, and territory is something that accrues to a rep
over weeks of phone calls — not a precondition for having them in the campaign at all.

### The finding

`RepVisitsPanel` currently holds FIVE separate "which reps" concepts, and only the last two
survive a reload:

```
activeReps         Set<email>              whose territory card is open      useState — lost
selectedForEmail   Set<email>              who gets the email                useState — lost
selectedRep        email                   whose account list is open        useState — lost
accountAssignments {companyId: [email]}    per-campaign                      PERSISTED
rep-calls entries  {email: {outcome, …}}   tenant-wide                       PERSISTED
```

**The only durable rep↔campaign link is an account assignment.** A rep is therefore in the
campaign only once they have a territory — exactly the order Rick wants reversed. "Pick 12 reps
and email them" is currently un-representable: that list evaporates when the tab closes.

Second asymmetry, and the one that contradicts "while I develop my relationship with the rep I
will build in the accounts and the territories": **rep calls are tenant-wide**
(`campaign-rep-calls.js` keys by tenant, entries by rep email) but **territory and accounts are
per-campaign** (`campaign-state[id].repVisits`). The conversation carries into the next campaign;
the map built out of that conversation does not. The building has to accumulate or it is
busywork.

### Three objects, split by what they are facts about

```
        ┌──────────────────────────────────────────────────────────────┐
        │  REP BOOK          tenant-wide, outlives every campaign      │
        │  what a rep covers: states/cities, account assignments       │
        │  netlify/functions/rep-book.js                       (NEW)   │
        └───────────────┬──────────────────────────────────────────────┘
                        │ assignments
        ┌───────────────┴──────────────┐      ┌──────────────────────────┐
        │  REP CALLS    tenant-wide    │      │  ROSTER   per-campaign   │
        │  the conversation:           │      │  who is IN this campaign │
        │  outcome, territory, note    │      │  + emailedAt per rep     │
        │  campaign-rep-calls.js       │      │  campaign-state.js       │
        │  (EXISTS, unchanged)         │      │  (extend)                │
        └──────────────────────────────┘      └──────────────────────────┘
                        └──────────┬───────────────────┘
                                   ▼
                        repView(email) — one selector, three reads
                                   ▼
                  Target Prospects = accounts assigned to reps IN THIS ROSTER
```

The roster is per-campaign because "who am I working this month" is a campaign decision.
Everything LEARNED about a rep is tenant-wide, because it stays true next month.

### The load-bearing line

Sharing the book across campaigns is only safe because the roster scopes it:

```js
export function accountAssignmentScope(assignments, roster) {
  const inRoster = new Set(Object.keys(roster || {}));
  const ids = Object.entries(assignments || {})
    .filter(([, emails]) => emails.some((e) => inRoster.has(e)))
    .map(([companyId]) => companyId);
  return ids.length ? ids : null;
}
```

Without the roster filter a shared book pulls every rep's accounts into every campaign's Target
Prospects. With it, the book is shared and the campaign stays scoped.

### Progress is derived, never stored

Same rule this codebase already applies to the launch gate ("status stops being a label you set
and becomes a fact"). Four facts per rep, each one recorded by an action Rick takes anyway:

| Dot | True when | Source |
|---|---|---|
| ✉ Emailed | `roster[email].emailedAt` set | the compose action stamps it |
| ☎ Called | `outcome !== "not-called"` | campaign-rep-calls (exists) |
| 🗺 Territory | `territory` text non-empty | campaign-rep-calls (exists) |
| 🏪 Accounts | ≥1 account assigned | rep book |

Deliberately NOT a linear funnel. A rep can hand over their territory in the first email reply,
or take three calls and never name one. Four independent dots describe that; a staged pipeline
would impose an order the work doesn't follow, and the status field would start lying.

### Data model

Extend `campaign-state.js` with a new key beside `repVisits`:

```js
repRoster: {
  source: "Ace Endico",                  // moved from repVisits.source
  reps: {
    "rep@example.com": {
      name: "", phone: "", jobtitle: "", // snapshot; the source list may change under us
      addedAt:   "2026-09-22T14:02:00Z",
      emailedAt: "2026-09-23T09:10:00Z", // null until actually sent
      dropped:   false,                  // out of THIS campaign, history intact
    },
  },
}
```

Sanitize like the existing `repVisitsReps` block: cap 200, validate with `EMAIL_RE`, `str()`
every field, drop entries with no email.

New `netlify/functions/rep-book.js`, tenant-wide, modeled on `campaign-rep-calls.js` (same auth
guards, same `logWrite`, same last-writer-wins):

```js
{
  assignments: { "<companyId>": ["rep@example.com"] },   // SAME shape, moved up a level
  profiles:    { "rep@example.com": { states: [], cities: {}, updatedAt } },
  updatedAt
}
```

`assignments` keeps the companyId→[reps] direction on purpose. Revision 2 chose it so a rep's
scattered accounts inside a neighbour's territory can be expressed, and Revision 3's
"· also: [other reps]" line falls out of it for free. rep→accounts is derived in a memo, never
stored twice.

**Migration: none.** Read the union — rep book first, the campaign's own
`repVisits.accountAssignments` as fallback — and write only to the book. Every existing campaign
keeps working and upgrades on first write. Exactly how Revision 3 handled string→array.

### UI — same two steps, the nouns swap

**Step 1 — Roster** (was: pick a territory). Source box → matched reps → check each one in.
Persisted immediately. Header reads `12 reps · 8 emailed · 3 called · 2 mapped`.

**Step 2 — Work the roster** (was: assign a rep). One row per rostered rep, sorted by what needs
doing next:

```
☑ A. Rep        ✉ 9/23   ☎ —        🗺 —                    🏪 0
                [ Log call ]  [ Territory ]  [ Accounts ▸ ]
☑ B. Rep        ✉ 9/23   ☎ cleared  🗺 Westchester+Fairfield 🏪 14
                [ Log call ]  [ Territory ]  [ Accounts ▸ ]
```

`Accounts ▸` opens the Revision 3 `RepTerritoryCard` unchanged, as a drawer for that one rep —
it stops being the front door. "Lock in territory" still bulk-writes, now into the rep book.

**Launch bar:** `Email roster (12) ▸` → all or subset → existing compose → stamps `emailedAt`.
**Call queue:** a chip filtering to rostered reps where `emailed && !called`, oldest email first.
That chip is the "follow up with phone calls" requirement in its entirety.

### Trade-offs

| Decision | Chosen | Cost |
|---|---|---|
| Rep book tenant-wide vs per-campaign | tenant-wide | one new function + store; REQUIRES the roster scope rule or campaigns bleed together |
| Progress derived vs stored status | derived | can't say "emailed but bounced" without adding a `bouncedAt` fact |
| Roster persisted | yes | one more sanitizer block, bounded at 200 |
| Three stores vs one merged rep object | three | a rep is assembled from three reads; mitigated by a single `repView()` so no component does it twice |
| Territory tree demoted to a per-rep drawer | yes | bulk-assigning ten reps in one sitting costs more clicks — accepted, because the work arrives one phone call at a time, not in bulk |
| companyId→[reps] key direction | kept | rep→accounts needs a derived memo; keeps scattered accounts and "also:" free |

Every piece is additive. If the rep book proves wrong, the fallback read path means per-campaign
assignments still work and nothing has to be un-migrated.

### Build order

1. `repProgress()` + `repView()` + roster-scoped `accountAssignmentScope()` in `campaigns.js`.
   Pure functions, no UI, testable alone.
2. `repRoster` in `campaign-state.js` (sanitizer + merge).
3. Roster UI (Step 1) writing that key. **Shippable here** — this alone kills the evaporating-list
   problem; the rest of the panel keeps working untouched.
4. `rep-book.js` + union read + write-through.
5. Rewire `RepTerritoryCard` into the per-rep drawer; delete the top-level tree.
6. Call-queue chip + `emailedAt` stamping.

Steps 1–3 ship without 4–6. Step 5 is the only one that deletes anything.

### Revisit when

- **A second distributor lands.** `source` is already free text, but the tenant-wide book will
  need a distributor key or two same-named reps at different companies collide.
- **The book earns a HubSpot push.** It is really a company↔owner association; once trusted it
  should write back the way `crm-push.js` does.
- **Territory becomes a standing rule again.** Only if someone asks "who would cover a NEW
  account in Poughkeepsie" — nobody has, which is why the id list won in Revision 2.