# Distributor-anchored sales campaign — the phase model

**Date:** 2026-09-26 · **Status:** MODEL CAPTURED, nothing built · **Source:** Rick, verbatim below

> *"keep in mind the progression from creating the campaign to selecting the reps for the
> distributors when we're thinking about a distribution sales campaign. We're selecting the reps.
> We're selecting their key customers and territories. And this is progressing... we have this
> state where we build the campaign. So that gets checked off. And then the UI should advance from
> one function to another, or maybe we should call it phases. So there's the setup phase for the
> campaign, which includes selecting the reps and the accounts and territories. It also includes
> creating the sales materials and embedding them into the app. And then building the strategy...
> but we have to be able to progress from one phase to another phase. So we can't lose the part
> where we are selecting the reps and their territories. That's a necessary part for every
> distributor-anchored campaign. And then move on from that into the actual — where we're making
> the phone calls, connecting the reps. And then the next part is when we're doing the follow
> through and execution is the creating the meetings and closing the sales and adding items and
> new customers."*

---

## The three phases

| Phase | Contains | Gate to next phase |
|---|---|---|
| **1 · Setup** | Campaign strategy · Sales materials created and embedded in the app · **Select the distributor's reps** · **Select each rep's key customers** · **Assign each rep's territory** | Setup checklist checked off |
| **2 · Connect** | The phone calls — connecting reps to their accounts | Reps connected to their accounts |
| **3 · Execute** | Meetings booked · Sales closed · New items added · New customers added | Campaign closed out |

**Rep selection is a first-class part of Setup, not an optional section.** Rick: *"we can't lose
the part where we are selecting the reps and their territories. That's a necessary part for every
distributor-anchored campaign."* Today it renders at position 7 of 9 ("Rep roster & territory").

**Connect is not enrichment.** Rick corrected himself mid-sentence. Enrichment fills missing contact
data on accounts (buyer name, email, phone). Connect puts a distributor's reps in front of the
accounts they should be selling to. Different job, different success measure.

---

## How this relates to what was built earlier the same day

`4f0fc5f` shipped a status-driven display table (`src/lib/campaign-stages.js`) keyed on the
existing lifecycle `draft → building → ready → launched → complete`.

**That lifecycle is a generic launch gate, designed around email campaigns.** An email campaign
really is "launched" once — the send goes out. A distributor campaign is not launched; it moves
through work phases, each with a different primary surface.

What carries over cleanly:
- The display-mode table idea (`primary / secondary / summary / hidden`) — it is the right
  mechanism; it was keyed on the wrong axis for this campaign type.
- The next-action bar — "Finish setup", "Start connecting", "Close out" are exactly the kind of
  single stated step it was built for.
- The checklist-as-real-gate (2026-08-03) — Setup's checklist is precisely that gate.

What does not:
- A single lifecycle shared by every campaign type. Email and distributor campaigns progress
  differently and the page should follow the type's own phases.

---

## Facts established while scoping the rep card

From a code audit, 2026-09-26. These constrain any build.

**1. "Top 3 accounts" cannot be computed — they must be selected.**
No revenue, order, or deal data exists anywhere in the code (grep for `annualrevenue`,
`num_associated_deals`, `total_revenue`: zero hits). The only per-account ranking available is
email engagement (`num_contacted_notes`), and `docs/CUSTOMER_GAP_2026-09-26.md` proved that
misleading the same morning: three paying customers had zero engagement. Rick's own phrase —
*"selecting their key customers"* — is the correct design. The rep card is a picker, not a
ranking.

**2. A rep's territory currently lives in three places that disagree.**

| Store | Shape | State |
|---|---|---|
| `territory-book` | named territories holding rep emails + account ids | Authoritative in code; **0 records**; slated for retirement (`PEOPLE_DATA_OWNERSHIP.md:108`) |
| `campaign-rep-calls.territory` | **free-text string**, unvalidated, ≤200 chars | The only territory data that actually exists (9 records); not joinable |
| HubSpot `Contact.territory` | 10-value multi-select, `src/lib/people-fields.js` | The agreed home. **Written, never read** — `crm-hubspot.js` does not request it |

A territory dropdown has to read ONE of these. The ownership contract says HubSpot. Building the
picker on `territory-book` means building on a store with zero records that is being retired.

**3. Rep → account linkage today is one hop removed.**
A rep has no direct list of accounts. It is `rep → territory (territory-book) → accounts`. The
legacy direct edge (`repVisits.accountAssignments`, `{companyId: [repEmail]}`) is still sanitized
and still read as a fallback scope, but nothing writes it.

**4. A rep card already half-exists.** `RepRosterPanel` (`campaign-detail.jsx:631-1047`) has a
per-rep row with an expander (`openRep`). The expander holds three controls: call outcome, a
free-text territory box, and notes. No account list, no territory picker, no assignment control.
`territory-tool.jsx:506-580` has a working rep picker and account-by-area tree — assignment UI
that already exists on a different screen.

---

## Decided, 2026-09-26

1. **Each campaign type gets its own phases.** Distributor campaigns move
   Setup → Connect → Execute → Complete; email campaigns keep draft → launched. The display table
   in `src/lib/campaign-stages.js` gets keyed by type rather than replaced. *Not built yet — the
   rep card goes first, because it belongs in Setup however phases are modeled.*

2. **A rep's key customers are specific to THIS campaign.** "Which accounts we're working through
   this rep, in this push." Stored with the campaign as process state
   (`campaign-state.repRoster.reps[email].keyAccounts`). A different campaign with the same rep
   picks its own set. They never go to HubSpot.

3. **A rep's territory reads and writes HubSpot `Contact.territory`.** The 10-value vocabulary in
   `src/lib/people-fields.js`. Staged on the roster, promoted through the existing `crm-push` path,
   and read back so a rep who already has a HubSpot territory shows it. This retires the free-text
   territory box and — once nothing reads it — `territory-book`.

4. **The rep card builds territory + key accounts first.** The two things Rick named. Call outcome,
   notes and draft email stay where they are.

## Still open

- **Is Connect's success measure "rep reached" or "rep introduced to account"?** Determines what
  the Connect phase's checklist actually checks. Settle when building phases.
