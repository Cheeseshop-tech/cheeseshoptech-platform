# ADR-002: Territory as a first-class entity

**Status:** Proposed
**Date:** 2026-09-22
**Deciders:** Rick Posada
**Supersedes:** the "no stored territory" decision in `REP_TERRITORY_ASSIGNMENTS_SPEC_2026-09-21.md`
Revision 2, and revises Revision 4's rep-book shape.

## Context

Rick, 2026-09-22:

> we need to keep track of the territories for reporting we need the territory look up and click
> through to the accounts in the territory for customer visit planing. so maybe back up and
> rethink this so we get it right and efficient.

Three new forces, none of which existed when Revisions 1–4 were written:

- **F1 Reporting** — territory becomes a grouping key in reports ("how is Westchester doing").
- **F2 Lookup** — you type or pick a territory and get its accounts.
- **F3 Visit planning** — that account list is a working day: addresses, phones, a route.

Revision 2 decided *not* to store territory at all. Its reasoning was sound and still is: a stored
geometric RULE (states + cities per rep) cannot express "this one account is the scattered
exception" without also over- or under-including its neighbours. So the checkbox tree was demoted
to a bulk-write gesture and only the resulting `accountAssignments` map was kept.

**The flaw that surfaces now:** that decision conflated two different things under one word.

| | Handles scattered accounts? | Can you report on it? |
|---|---|---|
| Territory as a **rule** (states + cities) | ✗ no | ✓ yes |
| Territory as a **named set** (explicit members) | ✓ yes | ✓ yes |
| Territory as **nothing** (today) | ✓ yes | ✗ **no** |

Revision 2 correctly rejected the rule and then threw out the entity along with it. You cannot
report on, look up, or click into something that exists only as transient checkbox state. F1–F3
are un-buildable on the current model — not hard, *impossible* — which is why this needs backing
up rather than another revision.

Current persisted shape, for reference:

```js
repVisits.accountAssignments = { "<companyId>": ["rep@example.com"] }   // per-campaign
```

A flat account→reps map. It has no place to put a territory's name, no id to group a report by,
and nothing to click into.

## Decision

**Make Territory an explicit, named, tenant-wide object whose membership is an explicit list of
account ids — and derive both `rep → accounts` and `account → reps` from it.**

```js
// netlify/functions/territory-book.js   (tenant-wide, one blob)
{
  territories: {
    "terr_westchester": {
      id:        "terr_westchester",
      name:      "Westchester + Fairfield",
      repEmails: ["rep@example.com"],             // crossover: more than one is normal
      accountIds:["<companyId>", "<companyId>"],  // EXPLICIT membership, never a rule
      builtFrom: { states: ["NY"], cities: { NY: ["white plains"] } },  // provenance only
      notes:     "",
      createdAt: "2026-09-22T14:02:00Z",
      updatedAt: "2026-09-22T14:02:00Z",
    },
  },
  updatedAt: "2026-09-22T14:02:00Z",
}
```

Two arrays on one object replace what would otherwise be three separate relations
(territory↔account, rep↔territory, rep↔account-exception):

- **Crossover** (Revision 3's requirement): two reps in `repEmails`. Natural.
- **Scattered account**: the account appears in `accountIds` of more than one territory. Both
  derivations stay correct without a special-case exception table.
- `rep → accounts` = union of `accountIds` where the rep is in `repEmails`.
- `account → reps` = union of `repEmails` over territories containing that account.

**`builtFrom` is provenance, not a rule.** It records which checkboxes produced the membership so
the UI can offer *"3 new accounts now match this shape — add them?"*. Membership stays explicit;
the geometry is only ever a suggestion you accept. This is what makes explicit membership
survivable as HubSpot grows — the honest answer to "efficient."

**Rolling up by state** for reports needs no hierarchy in the object: every account already carries
its own state, so `group by account.state` works within or across territories.

## Options Considered

### Option A: Territory as a named object with explicit membership *(chosen)*

| Dimension | Assessment |
|---|---|
| Complexity | Medium — one new store, one new object, derivations memoized |
| Cost | One Netlify Function, modeled on `campaign-rep-calls.js` |
| Scalability | Trivial at this size; see Scale below |
| Team familiarity | High — same blob/sanitizer/auth pattern as three existing stores |

**Pros:** satisfies F1–F3 directly; keeps Revision 2's correctness on scattered accounts; keeps
Revision 3's crossover; territory survives across campaigns, so the map accumulates; `builtFrom`
keeps it fresh without making geometry authoritative.
**Cons:** membership must be maintained — a brand-new HubSpot account belongs to no territory until
someone adds it (mitigated by `builtFrom` refresh and an "unassigned accounts" report).

### Option B: Territory as a stored rule (states + cities per territory)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Nearly free — the shape already exists in the legacy `repVisits.reps[]` |
| Scalability | Fine |
| Team familiarity | Highest — it is literally Revision 1 |

**Pros:** self-maintaining, new accounts join automatically, nothing to keep in sync.
**Cons:** **cannot represent a scattered account** — the exact defect that killed it on 2026-09-21,
and Rick's crossover requirement made it worse, not better. Reverting here would re-break work
that is already shipped and correct.

### Option C: Keep the flat account→reps map, add a `territoryName` string per account

| Dimension | Assessment |
|---|---|
| Complexity | Lowest — one more field on an existing map |
| Cost | Near zero |
| Scalability | Fine |
| Team familiarity | Highest — no new concepts |

**Pros:** cheapest path to a report that groups by territory name.
**Cons:** a territory with no accounts yet cannot exist, so you cannot plan one before filling it;
free-text names drift ("Westchester" vs "westchester" vs "W. Chester") and silently split reports;
nowhere to hang a territory's reps, notes, or `builtFrom`; no id, so renaming a territory orphans
every report that referenced the old string.

### Option D: Territory + Coverage + Exceptions as three separate relations

| Dimension | Assessment |
|---|---|
| Complexity | High — three tables, three sanitizers, three merge paths |
| Cost | Highest |
| Scalability | Fine |
| Team familiarity | Lowest |

**Pros:** the textbook-normalized answer; can express "Tony covers Westchester but only these 3
accounts within it."
**Cons:** that distinction has never come up, and Option A expresses it anyway by making a
territory of those 3. Three relations for one operator and ~40 territories is ceremony, and every
extra relation is another place for the three views of a rep to disagree.

## Trade-off Analysis

The real decision is **B vs A: a rule that maintains itself but cannot be correct, versus a list
that is always correct but must be maintained.** Revision 2 already answered it — correctness wins,
because a mis-assigned account sends a rep to the wrong door. This ADR only adds that the list
deserves a name and an id so it can be reported on and clicked into.

`builtFrom` is what narrows the gap: it buys back most of Option B's self-maintenance (one click to
absorb newly-matching accounts) without letting geometry override an explicit decision. That is the
whole design in one field.

**A vs C** is about whether a territory can exist before it has accounts. It must — F3 is planning a
visit, and planning starts with an empty day you fill. A string on an account cannot be planned.

**A vs D** is complexity for an expressiveness nobody has asked for. Revisit if that changes.

## Scale

Deliberately not engineered for: ~42 reps, an expected 20–40 territories, 189 accounts today and a
5,000 cap. One JSON blob, one fetch, derivations in a `useMemo`. No index, no pagination, no cache
layer. If territories ever pass ~500 or accounts pass the cap, revisit — not before.

## Consequences

**Easier**
- Reporting groups by a stable `territory.id` that survives a rename.
- Territory lookup → account list → visit plan is a direct read, no derivation.
- Territory accumulates across campaigns instead of being rebuilt each time.
- Campaign scope becomes: accounts in territories covered by rostered reps.
- One object answers "who covers this" and "what does this rep cover" — no second map to drift.

**Harder**
- A new HubSpot account belongs to no territory until added. Needs an **"Unassigned accounts"**
  view or it will quietly rot — treat that as part of the build, not a nice-to-have.
- Three views of a rep (roster, calls, territories) must be assembled by one selector. Keep
  `repView()` from Revision 4 as the single place that does it.

**Revisit when**
- A second distributor lands — territory names will collide across distributors; add a scope key.
- Someone asks "who would cover a NEW account in Poughkeepsie" — that is Option B's question, and
  it would justify making `builtFrom` authoritative for *unassigned* accounts only.
- Territories earn a HubSpot push — this is really a company↔owner association.

## Action Items

1. [ ] `territory-book.js` — tenant-wide store, sanitizer modeled on `campaign-rep-calls.js`
       (bounded, `EMAIL_RE`-validated, `logWrite`, last-writer-wins).
2. [ ] `territories.js` lib — `accountsInTerritory()`, `territoriesOfRep()`, `repsOnAccount()`,
       `unassignedAccounts()`. Pure, memoized, no UI.
3. [ ] **Migration read-path**: existing `repVisits.accountAssignments` presents as one derived
       territory per rep ("<Rep> — unsorted"), so nothing is lost and nothing needs converting.
       Write only to the new store.
4. [ ] Territory Book UI — list, create, rename, `builtFrom` refresh, member add/remove.
5. [ ] Territory lookup + click-through view (F2/F3): pick a territory → accounts with address,
       phone, email → the existing `CallRow` console, plus a printable visit list.
6. [ ] Wire Revision 4's roster: campaign scope = accounts in territories of rostered reps.
7. [ ] "Unassigned accounts" report — the maintenance cost of Option A, made visible.
8. [ ] Reporting rollups: accounts per territory, visited vs not, by state.
