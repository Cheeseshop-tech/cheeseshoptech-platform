# Campaign lifecycle UI — diagnosis and proposed shape

**Date:** 2026-09-26 · **Status:** DESIGN, nothing built · **Trigger:** Rick, 2026-09-26

> *"we dont have an enrichment campaign and we dont have a way to create one or to graduate a
> campaign through the progressive stages. when we create a campaign the landing page has check
> point in the launch preparedness but once all are checked and approved it remains a long list
> still visible and you have to scroll past it to get to the next stage functions. lets break here
> and give this part some thought so we can fully develop UI."*

---

## What is actually true

Verified against the code, 2026-09-26.

| Claim | Verdict | Reality |
|---|---|---|
| "we don't have an enrichment campaign" | **False** | Two exist: `ne-contact-enrichment` (`campaigns.js:268`, status `building`) and `ace-fall-show-2026` (`:333`). Enrichment is a first-class pill with a count badge. |
| "no way to create one" | **False** | `new-campaign-form.jsx:110` maps the FULL type registry — all four including Enrichment, with an extra `serves` field only it gets (`:173-188`). Server accepts all four (`campaign-defs.js:45`). |
| "checklist stays visible, scroll past it" | **TRUE** | Exactly as described. |

**Why Rick believes the first two.** The landing tab is hardcoded to Email
(`campaigns-page.jsx:51`, `CAMPAIGN_TYPES[0].id`). Enrichment is the third pill. Nothing else
hides those campaigns — no date filter (`start`/`end` are display-only), no tenant gate, no
archive. Only `status === "complete"` moves a campaign out of the pills, into Past campaigns.

**Do not file this as "Rick didn't look."** He commissioned this feature, he has used it for
months, and he believes two of its capabilities do not exist. That is a UI verdict, not a user
error. A feature you cannot find is a feature you do not have.

---

## The root cause, one sentence

**The detail page is the same shape at every status.**

Nine sections, fixed order, fully expanded, identical whether the campaign is a draft or finished.
Only THREE things in the whole view react to status:

- `campaign-detail.jsx:181` — the status badge's tone and label
- `:264` — one description string on Results
- `:2781-2794` — Results shows an empty state until `launched`

Everything else — an 18-row checklist for an email campaign (`campaigns.js:93-109`), the strategy
block, content, documents, prospects, rep roster — renders at full height on day one and on the
day you close it out.

### Current render order

| # | Section | Lines | When it actually matters |
|---|---|---|---|
| — | Header + `LaunchGate` | `174-201` | always |
| 1 | Updates | `203-205` | always (thin) |
| 2 | **Launch readiness** | `207-212` | **building / ready only** |
| 3 | Strategy | `214-216` | draft / building |
| 4 | Content & approvals | `218-223` | building |
| 5 | Documents | `225-230` | building |
| 6 | **Prospects / Call console** | `232-241` | **launched — the actual work** |
| 7 | Rep roster & territory | `243-252` | building |
| 8 | Sales Rep Contacts | `254-262` | conditional already |
| 9 | Results | `264-266` | launched / complete |

The thing you do every day — the call console — is **position 6 of 9**, below four sections that
stopped being relevant the moment the campaign launched. The 18-row checklist you finished weeks
ago sits at position 2, permanently, in full.

`Section` (`:275-288`) is a plain Card. No disclosure state, no `open` prop, nothing collapses.
`ChecklistPanel` (`:1425-1455`) renders every group and every row unconditionally; a done row is
strikethrough (`:1464`) but still full height.

### The second problem: status is a chore, not a consequence

`canAdvanceTo()` (`campaigns.js:1146-1153`) gates `ready` and `launched` on every required item
being done. When the gate clears, `LaunchGate` turns the card green, changes the label to "Clear
to launch", and **un-disables a pill Rick then has to click**.

So the system knows the campaign is ready and waits to be told. That is the same shape as the
deploy script that knew nothing had shipped and printed "Pushed" — a system with the answer,
declining to act on it.

The checklist-as-real-gate decision (2026-08-03) is right and should stay. The problem is not that
a human confirms; it is that the confirmation is a small pill among five, in a card you have
already scrolled past.

---

## Proposed shape

### 1. Sections get a display mode per status

One table, not a rewrite. Each section declares how it renders at each status:

- **`primary`** — expanded, floated to the top. The work of this stage.
- **`secondary`** — expanded, normal position. Still in use.
- **`summary`** — collapsed to a single line with its state (`Launch readiness — 18 of 18 ✓`).
  One click reopens it. Nothing is ever removed, only folded.
- **`hidden`** — not applicable yet (Results before launch).

| Section | draft | building | ready | launched | complete |
|---|---|---|---|---|---|
| Updates | secondary | secondary | secondary | secondary | secondary |
| Launch readiness | secondary | **primary** | **primary** | summary | summary |
| Strategy | **primary** | secondary | summary | summary | summary |
| Content & approvals | hidden | **primary** | secondary | summary | summary |
| Documents | hidden | secondary | secondary | summary | summary |
| Prospects / Call console | hidden | secondary | secondary | **primary** | summary |
| Rep roster & territory | hidden | secondary | secondary | secondary¹ | summary |
| Results | hidden | hidden | hidden | **primary** | **primary** |

Read the `launched` column: the call console is at the top, results next to it, and the four
build-time sections are four collapsed lines. That is the page Rick wants and cannot currently get
to.

**`summary` never hides data.** A collapsed section shows its own state — how many checklist items
are done, how many documents, how many prospects cleared. Folded, not gone.

¹ **Rep roster stays expanded after launch** (decided 2026-09-26). On an enrichment campaign the
roster is live working data, not build-time setup: reps get added and their territories fill in
during the calls. Folding it would hide a surface still being written to.

### 2. One "next action" bar, unmissable

Replace the five-pill row with a single stated next step, in the header where the eye lands:

```
draft      →  [ Start building ]
building   →  4 required tasks outstanding        (disabled, lists them on hover)
building   →  [ Mark ready to launch ]            (when the gate clears)
ready      →  [ Launch ]
launched   →  [ Close out ]  + live results
```

Status stays a human assertion — that is the 2026-08-03 decision and it is correct. What changes
is that the system stops being coy about knowing the answer. The five-pill row moves into an
"override" affordance for the rare backwards move.

### 3. Discoverability

- **Remember the last pill.** Landing on Email every time is why Enrichment feels absent.
- **Land on the pill with work in it**, not `CAMPAIGN_TYPES[0]` — the type with a campaign at
  `building` or `launched` beats one with nothing.
- **Give the empty pill an empty state that points outward**: "No social campaigns. You have 2
  enrichment and 3 email campaigns."
- The "+ New campaign" tab already offers all four types. Once the pills are honest, it will look
  like it does.

---

## What this is NOT

- **Not a rewrite.** The sections, the panels, the state shape and the gate logic all stay. This
  adds a display-mode table and a `<Section collapsed>` prop.
- **Not auto-advancing status.** The gate stays human. Only the prompt changes.
- **Not hiding anything.** `summary` folds; it never removes. Every section is one click away at
  every status.
- **Not touching campaign-state's shape.** No migration, no backfill.

---

## Decided, 2026-09-26

1. **Folding: automatic, with remembered overrides.** A section folds itself when its stage
   passes. The moment Rick manually opens or closes one, that choice sticks for that campaign and
   the automatic rule stops fighting him. Tidy by default, never argues twice.
   *Storage:* per-campaign, app-side UI state. This is presentation, not a fact about a campaign —
   it belongs with `campaign-state` only if it must survive a device change; otherwise keep it
   out of the store entirely. Decide at build time, default to NOT storing it.

2. **Advancement: one loud next-action button.** Status stays a human assertion — the 2026-08-03
   "the checklist is a real gate" decision stands. What changes is that the system stops being coy
   about knowing the answer. The header shows exactly one stated next step, and when it is blocked
   it says what is blocking it rather than greying out silently. The five-pill row becomes a
   secondary override for backwards moves.

3. **Rep roster stays EXPANDED after launch.** Rick, 2026-09-26: live working data. For an
   enrichment campaign the roster grows as reps are reached and their territories fill in during
   the calls — it is not build-time setup. Table updated: `launched` = secondary, not summary.

4. **Scope: detail page only in the first build.** Display modes + the next-action bar. Ship,
   use it on a real campaign, then decide about list cards and pill defaults.
   **Explicitly deferred:** remembering the last pill, landing on the pill that has work, empty
   states that point outward. These fix the "we don't have an enrichment campaign" perception and
   should happen — just not in the same pass.

## Still open

- **Is "Updates" a section or a header element?** It is a thin log currently occupying the
  full-width slot at position 1.
- **Does `complete` need rethinking?** Today it moves a campaign out of the pills entirely into
  Past campaigns. That is the one real way a campaign can seem to vanish, and it is worth checking
  that the archive is discoverable before treating it as correct.
- **Does the campaign LIST card get the same treatment?** Deferred with scope above.
