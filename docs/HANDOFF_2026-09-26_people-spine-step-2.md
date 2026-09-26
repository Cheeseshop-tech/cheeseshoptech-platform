# Handoff — People spine, step 2: mark `relationship`

**Written:** 2026-09-26, 00:20, end of the session that built the spine
**Contract:** `docs/PEOPLE_DATA_OWNERSHIP.md` · **As-built fields:** `docs/HUBSPOT_PROPERTY_SPEC.md`
**Repo state:** clean, level with `origin/phase-2-6-build` at `3a4d317`

---

## Where things stand

Step 1 is **done**. Five HubSpot properties exist and are API-verified:

| Object | Property | Options |
|---|---|---|
| Company | `relationship` | Prospect · Active customer · Dormant · Lost |
| Company | `outreach_stage` | New · Emailed · Replied · Meeting · Won · Lost · Not a fit |
| Company | `territory` | 10 values, multi-select |
| Contact | `contact_role` | Buyer · Rep · Owner · Operations · Other |
| Contact | `territory` | same 10, identical string-for-string |

**Every one of the 748 companies has `relationship` unset.** That is the whole of step 2.

Do not skip ahead to step 3 (pointing the app at the fields). Guardrail 4 in the ownership doc
exists because `territory-book` shipped a screen over an empty store on 2026-09-22. Populate,
then read.

---

## The job

**Not all 748.** Only 76 companies have any logged engagement at all; the top ~25 is the real
book. Set `relationship` on those, leave the rest unset, and unset stays meaningful — it means
"never touched," which is true and useful.

The ranking below is by `num_contacted_notes` (HubSpot's own roll-up), pulled live 2026-09-26.
**It is a prompt for Rick's judgment, not an answer.** Guardrail 2: `relationship` is never
inferred from touch counts — a prospect worked hard in a campaign looks identical to an old
customer. The counts only decide *what order to think about them in*.

### The list

| # | Account | Notes | Last contact | Channel |
|---|---|---|---|---|
| 1 | **(unnamed — id `324917772989`)** | 498 | 2026-09-25 | — |
| 2 | Ace Endico | 357 | 2026-09-24 | Distributor |
| 3 | Marketly Collective | 164 | 2026-09-16 | — |
| 4 | Monti Trentini | 164 | 2026-09-25 | Partner / Producer |
| 5 | GFI Foods | 99 | 2026-09-16 | Distributor |
| 6 | Eataly | 89 | 2026-09-25 | — |
| 7 | Musco Food | 35 | 2026-08-26 | Distributor |
| 8 | Prime Line Distributors | 25 | 2026-09-25 | Distributor |
| 9 | Focus Food Group | 19 | 2026-09-22 | Cheese shop / Boutique |
| 10 | Wakefern | 9 | 2026-06-24 | — |
| 11 | Flora Fine Foods | 8 | 2026-09-21 | Cheese shop / Boutique |
| 12 | USS | 7 | 2026-09-18 | Distributor |
| 13 | HubSpot | 6 | 2026-05-03 | — |
| 14 | SK Food Group | 6 | 2026-09-14 | Cheese shop / Boutique |
| 15 | Lettieri & Co. | 6 | 2026-09-22 | Cheese shop / Boutique |
| 16 | TryAngle Foods | 6 | 2026-09-24 | Cheese shop / Boutique |
| 17 | DeCicco & Sons Markets | 5 | 2026-06-18 | Regional Supermarket |
| 18 | H-E-B | 5 | 2026-09-18 | National Chains |
| 19 | Trader Joe's | 5 | 2026-09-25 | National Chains |
| 20 | Botticelli Foods | 4 | 2026-09-22 | Manufacturers |
| 21 | Selected Food & Beverage | 4 | 2026-09-21 | Distributor |
| 22 | Uncle Giuseppe's | 3 | 2026-07-28 | Regional Supermarket |
| 23 | Albertsons | 3 | 2026-06-18 | National Chains |
| 24 | Angela's Pasta & Cheese Shop | 2 | 2026-07-07 | Specialty grocer |
| 25 | The Bier & Cheese Collective | 2 | 2026-07-06 | Cheese shop / Boutique |

Record URL pattern: `https://app.hubspot.com/contacts/246062426/record/0-2/<id>`

### Four rows that are questions, not accounts

Deal with these first — they distort everything below them.

1. **`324917772989` — 498 notes, no `name`, no `channel`.** The single most-engaged record in the
   CRM and it has no name. Either a broken record or something mis-created. Open it before
   anything else.
2. **Marketly Collective (164)** and **HubSpot (6)** — almost certainly HubSpot's seeded sample
   records, not real accounts. If so they need deleting, not classifying. Check before touching.
3. **Monti Trentini (164)** — the client, not an account. It is `Partner / Producer` in `channel`.
   Decide deliberately whether the brand itself carries a `relationship` at all; "Active customer"
   would be wrong and would pollute any filter built on this field.

Roughly 4 of the top 6 rows are not prospects. Worth knowing before drawing conclusions from
this ranking.

### The one distinction that matters

`relationship` is what decides whether an account's email traffic is **operational** or **CRM**.
Rick's own framing, 2026-09-25:

> "Customer onboarding conversations like the current Prime Line / Eataly conversations with Tess
> the buyer at Eataly and Dennis the owner at Prime Line, then the PO and price confirmations from
> ACE and new item onboarding — all operational. The CRM needs to focus on prospecting new
> conversations and contact enrichment and campaign tracking."

So: Ace Endico, Eataly, Prime Line → `Active customer`, and their traffic leaves the CRM feed.
The exception that must survive into step 3: **a Person in an active campaign is always
CRM-relevant regardless of their account's `relationship`** — that is the "campaign tracking
crosses over to existing distributor relationships and their sales staff" case.

---

## How to set them

Two options; pick one and stick to it.

- **In HubSpot directly** — open each record, set Relationship in the left property panel. 25
  records, a few minutes. No tooling risk.
- **Via Claude** — the HubSpot connector's `manage_crm_objects` can write these. Faster, but every
  write should be read back. Claude has write scopes for companies and contacts (proven
  2026-09-25 with note `402503194324` on Lou Dipalo).

---

## Tooling — verified working as of this handoff

| Need | Tool | State |
|---|---|---|
| Read/write HubSpot records | HubSpot connector (`search_crm_objects`, `manage_crm_objects`, `get_properties`) | **Working.** Used throughout this session |
| Create HubSpot **properties** | — | **Impossible.** `crm.schemas.*.write` is not grantable on this portal. UI only |
| Repo reads | `git --no-optional-locks ...` | **Required** — a bare `git status` leaves a lock Claude cannot remove. See the TRAP note in `CLAUDE.md` |
| Commit / deploy | `COMMIT <FEATURE>.command` → `DEPLOY TO STAGING.command` | Working; deploy now refuses to report false success |

Plugin MCPs needing OAuth (Asana, Linear, Figma, GitHub, Gong, Apollo, Clay, …) are **not needed
for this step** — HubSpot is the only system involved. Don't spend morning time connecting them.

---

## After step 2

In order, from `PEOPLE_DATA_OWNERSHIP.md`. One at a time.

3. Point the app at the fields — `crm-hubspot.js` requests them; the CRM console and email feed
   filter on `relationship` + campaign membership instead of the interim house-domain rule
   (`HOUSE_DOMAINS` in `crm-hubspot.js`, shipped 2026-09-25 as a stopgap — retire it here).
4. Build the mirror — scheduled HubSpot export → `src/data/montitrentini/crm-snapshot/<date>.json`
   → git commit, with failure email. This is what makes HubSpot a choice rather than a dependency.
5. Retire `territory-book`.

Only after all five: rep routing / the Move List.

---

## Two open items from this session, neither blocking

- **`MAX_PAGES = 10` in `crm-hubspot.js` silently truncates the account book at 1000 companies.**
  Currently 748, so invisible — until it isn't.
- **Data hygiene:** `channel` has drifted to 13 values with 124 companies unset; 23 accounts have
  `state = "New York"` instead of `NY`. Neither blocks step 2. Both are the same disease the
  `relationship` rebuild just cured on a smaller scale.
