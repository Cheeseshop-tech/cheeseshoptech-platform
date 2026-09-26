# Design — per-type campaign lifecycles

**Date:** 2026-09-26 · **Status:** PROPOSED · **Decision record:** `docs/DISTRIBUTOR_CAMPAIGN_PHASES_2026-09-26.md`
**Depends on:** rep card (`COMMIT REP CARD.command`) shipping first — Setup's core work lives there.

---

## 1. Requirements

### Functional
- F1. A distributor-anchored campaign moves **Setup → Connect → Execute → Complete** (Rick, 2026-09-26).
- F2. Email / social / event / enrichment campaigns keep **draft → building → ready → launched → complete**. No behaviour change for them.
- F3. Leaving Setup is **gated**: required Setup checklist items done ("that gets checked off"). Status stays a human assertion — the 2026-08-03 gate decision stands.
- F4. The detail page's shape follows the campaign's *own* phases (extends `4f0fc5f`, does not replace it).
- F5. The next-action bar walks the campaign's own lifecycle ("Finish setup → Start connecting → Move to execution → Close out").
- F6. Execute captures what Rick named: meetings, sales closed, **new items placed, new customers**.

### Non-functional
- **Correctness under silent failure** is the dominant requirement. Every defect found this week failed silently — a dropped field, an unread property, a status that reverted. Any design here must make misclassification *loud or impossible*.
- **Backward-compatible storage.** Every status already stored in Blobs stays valid. No migration script, no downtime.
- **Scale is trivial**: one tenant, dozens of campaigns, a handful of writes per day. Performance is not a design driver; nothing here needs caching, queues or indexing.

### Constraints
- Solo operator; changes ship via `COMMIT *.command` buttons; `npm run build` is lint-gated.
- Netlify Functions import pure modules from `src/lib/` (proven by esbuild bundle, 2026-09-26).

---

## 2. The core decision: consumers ask *what kind*, never *which string*

Nine files compare `status` against literals. Two ways to add phases:

**A. Add the new strings and teach every consumer.** `isLive` becomes `status === "launched" || status === "connect" || status === "execute"`, and so on in every file. Each new campaign type repeats the exercise, and any consumer someone forgets misclassifies silently.

**B. Every lifecycle step declares a `kind`. Consumers ask about the kind.** ← **chosen**

```
kind       meaning                               asked by
─────────  ────────────────────────────────────  ─────────────────────────────────
planning   being built; not in market            command-center "in flight"
live       in market; the work is happening      isLive, command-center, list badge
closed     finished; archived                    isClosed, commitments, Past campaigns
```

The step ids stay per-type and are stored, because they carry real information (Connect vs Execute is a human assertion that cannot be derived). But **no consumer outside the lifecycle module compares against a step id.** The same indirection that stops `isLive` misfiring stops the next consumer from being written wrong.

Trade-off: one extra concept (`kind`) and one lookup per check, in exchange for adding a campaign type being a registry edit rather than a nine-file hunt. At this scale the lookup cost is zero.

---

## 3. High-level design

```
                    src/lib/lifecycles.js   (NEW — pure, no imports, testable)
                    ┌─────────────────────────────────────────────┐
                    │ LIFECYCLES = {                              │
                    │   generic:     draft · building · ready ·   │
                    │                launched · complete          │
                    │   distributor: setup · connect · execute ·  │
                    │                complete                     │
                    │ }                                           │
                    │ each step: { id, label, kind, gated, blurb }│
                    │                                             │
                    │ lifecycleFor(type)   kindOf(campaign)       │
                    │ ALL_STEP_IDS         normalizeStatus(t, s)  │
                    │ nextStepFor(type, s)                        │
                    └───────┬───────────────────────┬─────────────┘
                            │                       │
        server (validation) │                       │ client (behaviour)
   ┌────────────────────────┴──┐     ┌──────────────┴─────────────────────────┐
   │ campaign-state.js         │     │ campaigns.js   isLive/isClosed → kindOf │
   │   STATUSES = ALL_STEP_IDS │     │                canAdvanceTo → gated     │
   │ campaign-defs.js          │     │ campaign-stages.js  TABLE per lifecycle │
   │   seedStatus = ALL_STEP_IDS│    │ command-center.jsx  → kindOf            │
   └───────────────────────────┘     │ campaigns-page.jsx  → kindOf            │
                                     │ campaign-detail.jsx LaunchGate, badge   │
                                     └─────────────────────────────────────────┘
```

**One module owns the vocabulary.** Server sanitizers and client behaviour import the same registry — the pattern `people-fields.js` established the same day, for the same reason.

---

## 4. Data model

### Lifecycle registry (`src/lib/lifecycles.js`)

| Lifecycle | Step | kind | gated¹ | Next action label |
|---|---|---|---|---|
| **generic** | draft | planning | — | Start building |
| | building | planning | — | Mark ready to launch |
| | ready | planning | ✓ | Launch |
| | launched | live | ✓ | Close out |
| | complete | closed | — | — |
| **distributor** | setup | planning | — | Start connecting |
| | connect | live | ✓ | Move to execution |
| | execute | live | — ² | Close out |
| | complete | closed | — | — |

¹ *gated* = cannot be entered until every required checklist item is done. Same rule `canAdvanceTo` enforces today, now declared per step instead of hard-wired to `"ready"`.
² Execute is **not** checklist-gated in v1: its success measure is still open (see §8). Gating it on an undefined checklist would be a gate that blocks nothing or blocks everything.

`complete` is shared and always `kind: closed` — the one terminal every consumer already understands.

### Invariants (enforced by tests, not by convention)
- I1. Every lifecycle ends in exactly one `closed` step, and it is `complete`.
- I2. **A step id used in two lifecycles has the same `kind` in both.** Otherwise `kindOf` would depend on which lifecycle you asked, which is the ambiguity this whole design removes.
- I3. Every lifecycle has at least one `planning` and one `live` step.
- I4. `ALL_STEP_IDS` is the union the server accepts — so no step can exist that the store would silently drop.

### Stored state — **unchanged shape**
`campaign-state.entries[id].status` is still one string. It just may now also be `setup`, `connect` or `execute`. No new fields, no migration.

### Campaign type
Add **`distributor`** to `CAMPAIGN_TYPES`. The pill nav, new-campaign form and server type allow-list all read that registry, so the new pill appears with no further UI work.

---

## 5. Migration and reclassification

`normalizeStatus(type, status)` — pure, total, idempotent:

1. If `status` is a step of the type's lifecycle → return it unchanged.
2. Else map by `kind`: planning → the lifecycle's first planning step; live → its first live step; closed → `complete`.
3. Unknown string → the lifecycle's first step.

This makes **changing a campaign's type safe**: `ace-fall-show-2026` (currently typed `enrichment`, really a distributor show) can be retyped to `distributor`, and its stored `building` resolves to `setup` on read. Nothing is rewritten in storage until Rick next advances it.

**Seeds:** `ace-fall-show-2026` retypes in `src/lib/campaigns.js`. `ne-contact-enrichment` stays `enrichment` — Rick was explicit that Connect is not enrichment.

---

## 6. Display table per lifecycle

`campaign-stages.js` gains a distributor column set. `repvisits` — Rick's "necessary part for every distributor-anchored campaign" — is **primary through Setup and Connect**, not position 7.

| Section | setup | connect | execute | complete |
|---|---|---|---|---|
| Launch readiness (checklist) | **primary** | summary | summary | summary |
| **Rep roster & territory** | **primary** | **primary** | secondary | summary |
| Strategy | secondary | summary | summary | summary |
| Content (sales materials) | **primary** | secondary | summary | summary |
| Documents | secondary | secondary | summary | summary |
| Prospects / calls | secondary | **primary** | secondary | summary |
| Results | hidden | secondary | **primary** | **primary** |
| Updates | secondary | secondary | secondary | secondary |

The existing safety tests carry over and get run per lifecycle: every section reachable at some step, no permanent `hidden`, unknown section defaults to visible.

---

## 7. Error handling — making misclassification loud

| Failure | Today | After |
|---|---|---|
| Unknown status stored | Sanitizer drops it; campaign silently reverts | Sanitizer accepts `ALL_STEP_IDS`; anything else is still dropped, and `normalizeStatus` resolves it on read rather than leaving it undefined |
| Consumer compares a stale literal | Misclassifies silently | Lint-level guard: a test greps `src/` for `status === "launched"`-style literals outside `lifecycles.js` and fails the build |
| Step reused with a different kind | n/a | Invariant I2 test fails |
| Type changed on a live campaign | Status orphaned | `normalizeStatus` maps by kind |

The literal-grep test is the important one. It turns "someone forgot to use `kindOf`" from a silent misfire into a red build — the only defence that works for a consumer written six months from now.

---

## 8. Open questions (block specific parts, not the whole build)

1. **Execute metrics.** Rick named meetings, sales closed, new items, new customers. `RESULT_KEYS` has `meetings` and `won` but nothing for items or customers.
   - *New customers* may be **derivable, not entered**: an account whose `relationship` moved to `Active customer` during the campaign. That joins Execute to the people spine and needs no new input.
   - *New items placed* has **no data source** in the system today. Manual count, or wait for order data?
2. **Connect's success measure** — "rep reached" or "rep introduced to account"? Determines whether Connect → Execute can ever be gated.
3. **Type vs anchor.** `distributor` as a type is cheapest and matches the pill nav. It deepens an existing muddle — `CAMPAIGN_TYPES` already mixes channel (email, social) with mechanic (enrichment, event). Revisit if one campaign ever needs to be *both* an email campaign and distributor-anchored.

---

## 8a. Decided, 2026-09-26

1. **New customers are COUNTED, not entered.** An account in the campaign whose `relationship`
   became `Active customer` during the campaign. Consequence worth stating: "during the campaign"
   needs a *baseline* — which accounts were already active when Setup ended. HubSpot's current
   value alone cannot say when it changed. Step 5 must record a baseline snapshot at the
   Setup → Connect transition; without it the count silently includes customers who were active
   all along.
2. **New items placed: a manual count** on Results, for now. No order data exists to derive it
   from. Replace when it does.
3. **Connect → Execute is ungated** in v1. Rick decides when calling turns into execution.
4. **`ace-fall-show-2026` is retyped to `distributor`.** Its stored `building` resolves to `setup`
   through `normalizeStatus`; nothing in storage is rewritten.

## 9. Build plan

Each step ships alone and is independently revertible.

1. `lifecycles.js` + invariant tests. No consumer changes. *(Zero behaviour change — safe to ship first.)*
2. Server sanitizers accept `ALL_STEP_IDS`. *(Widens validation only.)*
3. `isLive` / `isClosed` / `canAdvanceTo` / `nextActionFor` → `kindOf` + lifecycle. Command-center and campaigns-page off literals. Literal-grep guard test.
4. Distributor type + stage table + retype `ace-fall-show-2026`.
5. Execute metrics — after §8.1 is answered.

## 10. What to revisit as it grows

- **Phase history.** Only `closedAt` is recorded. When did Setup finish, how long did Connect take? A transition log (`{from, to, at}`) is cheap now and impossible to reconstruct later.
- **Per-phase checklists.** One checklist per type today, gated as a block. Distributor Setup / Connect / Execute likely each want their own.
- **Channel × mechanic.** If a campaign needs two axes, split `type` into `channel` and `mechanic`. Not before a real campaign demands it.
