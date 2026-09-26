# Customer gap — buyers missing from the CRM

**Date:** 2026-09-26 · **Source:** `Client 2024-2025 and distributions areas.xls`, saved by
Stefano Viero 2025-12-04 · extracted to `docs/CUSTOMER_LIST_2024-2025.csv`

---

## The finding

The producer's own system lists **44 customers with sales in 2024–2025**. HubSpot has a record for
**30** of them. **14 companies that paid Monti Trentini do not exist in the CRM at all.**

Separately, three that DO exist — Baldor, Altomontes, Alma Gourmet — had **zero logged
engagement**, so they were invisible to any ranking built on `num_contacted_notes`.

**Why this matters beyond the fix.** Step 2 was originally scoped as "mark `relationship` on the
~20 accounts with real email traffic." That method was wrong by construction. Engagement counts
measure *how much Rick emails an account*, not *whether it buys*. Customers who order through EDI,
by phone, or through the Stamford/Italy office generate no email in Rick's HubSpot. Working
top-down from engagement would have classified Trader Joe's and H-E-B before three companies that
were actively paying — and would never have reached the other fourteen.

Same shape as every other problem this month: **the data exists, the join doesn't.** Sales live in
the producer's system; engagement lives in HubSpot; nothing connects them.

---

## Missing entirely — no HubSpot record

Verified 2026-09-26 by name-token search against all 748 companies.

| Customer | State | Region | SKUs bought |
|---|---|---|---|
| **SAVORY CHEESE CORP** | New York | Northeast | **21** |
| **I & M IMPORT INC** | California | Northwest | **23** |
| **MOSCHELLAS** | Florida | South | **13** |
| GLOBAL FOOD SERVICES INC. | New Jersey | Northeast | 21 |
| FORNINO | New York | Northeast | 7 |
| ABC PROVISONS, INC | Texas | South | 5 |
| ALANRIC FOOD DISTRUBUTORS INC | New Jersey | Northeast | 2 |
| PDI PERISHABLE DISTRIBUTORS OF IOWA | Iowa | Midwest | 3 |
| JVM SALES | New Jersey | Northeast | 1 |
| GIANGRECO SALES COMPANY | California | Northwest | 2 |
| TORO FOODS | California | Northwest | 11 |
| CARAVAGGIO RESTAURANT | New York | Northeast | 2 |
| OCEANA KB RESTAURANT LLC | Florida | South | 1 |
| TONY'S FOOD MORENO | California | Southwest | 3 |

Three of these bought **more SKUs than most accounts in the CRM**. Savory Cheese Corp at 21 SKUs
and I & M Import at 23 are substantial relationships with no record whatsoever.

**`TONY'S FOOD MORENO` is probably not a separate company** — Tony's Fine Foods has a Moreno Valley
DC. Likely the same customer, two ship-to locations. Confirm before creating a record.

---

## Marked on 2026-09-26

30 accounts set. Source of truth for each is named, not inferred.

**Active customer (27)** — from the sales report unless noted:
Ace Endico · Eataly\* · GFI Foods\* · Prime Line Distributors\* · Flora Fine Foods\* ·
Baldor Specialty Foods · Altomontes · Alma Gourmet · Tony's Fine Foods · Tama Trading ·
A&T Italian Foods · Lettieri & Co. · Di Palo's Fine Foods · Selected Food & Beverage ·
Botticelli Foods · Detwiler's Farm Market · Mr Greens Produce · Albertsons ·
Dekalb Farmers Market · Sistina · Orlando Imports · Gordon Food Service · H-E-B ·
Ferraro Foods · Liaison West Distribution · KeHE · Cow Bell LLC

\* set from Rick's direct statement, not the sales report.

**Dormant (1)**
- **Focus Food Group** — Rick's call.

**Musco Food — corrected to Active customer, and the correction matters.**
First marked Dormant on the reasoning that Eataly was their only Monti outlet and they lost it to
Prime Line. Wrong. Rick, 2026-09-26: *"Musco is actively buying from Italy direct so they are
active just not with the US division since they stopped buying Alpeggio."* They are a live
customer. See the two-channel problem below — Musco is the proof case.

**Prospect (1)** — Wakefern.

**Deliberately left unset:** the house record (`montitrentini-usa.com`), Monti Trentini itself,
Marketly Collective (marketing agency), HubSpot (software vendor). None are buyers; none of the
four `relationship` values describe them. See the open question below.

---

## The two-channel problem — confirmed, not hypothetical

**Monti Trentini sells into the US through two channels, and CST can see only one.**

| Channel | Visible in | Example |
|---|---|---|
| Monti Trentini USA | Cecilia's sales report; some HubSpot email traffic | Ace Endico |
| **Monti Trentini Italy, direct** | **nothing CST holds** | **Musco Food** |

Musco is the proof case. They appear in the US report with a single SKU, last contact August, and
every signal available to CST says *lapsed*. They are in fact actively buying — from Italy.

**Consequences, in order of how much they hurt:**

1. **The sales report has a known hole.** The pending request to Cecilia returns the US division's
   book. Every Italy-direct account will look absent or lapsed in it, exactly as Musco did. Do not
   treat that report as the complete customer list — it is one channel of two.
2. **An account can look dead through every instrument CST has and be alive.** No amount of better
   CRM hygiene fixes this. The data is not in the building.
3. **Only Stefano can close it.** There is no system to query. The gap is filled by asking him.

**Definitional consequence, decided 2026-09-26:** `relationship = Active customer` means *a
customer of Monti Trentini*, not *a customer of the US division*. It is channel-agnostic. If
"how do they buy" ever needs recording, that is a separate field — never a second meaning loaded
onto this one. (This is the same discipline that split `relationship` from `outreach_stage`.)

---

## Data quality found along the way

1. **`Cow Bell LLC` had no name in HubSpot** — only the domain `cowbellpdx.com`. Named during this
   pass. A paying customer was sitting in the CRM as an anonymous domain.
2. **Stefano's `Sales Region` has the same spelling drift we fixed in `territory` last night** —
   `NORTHEAST`/`NORTH EAST`, `SOUTHWEST`/`SOUTH WEST`, `NORTHWEST`/`NORTH WEST` all appear in one
   file. Do not import these values raw.
3. **Gordon Food Service – Miami, Florida is tagged `NORTH WEST`.** Plainly wrong in the source.
4. **His regions are not our territories.** He uses US macro-regions; `territory` is
   Northeast-granular (NY Metro, New Jersey, Philadelphia, PA, New England, Upstate NY…). They do
   not map cleanly and must not be force-fitted.
5. **Probable duplicates spotted in HubSpot:** Citarella Gourmet Market ×5 records ·
   Cavaniola's ×2 · Burrini's Old World Market ×2 · `selectedfood.com` (unnamed) alongside
   `Selected Food & Beverage` (`selectedfoods.com`) · `Altomontes` alongside `Alto-Imports`, both
   Doylestown PA · `67` and `67 Gourmet`. Not addressed today.
6. **Rick's Oct 2025 email said "Alma Gourmet Savory"** as one name. It is two companies — Alma
   Gourmet and Savory Cheese Corp, the latter with 21 SKUs and no CRM record.

---

## Open

- [ ] **Create records for the 13 genuinely missing customers** (14 minus Tony's Moreno, pending
      confirmation). Each needs name, domain, state, channel — then `relationship = Active
      customer`.
- [ ] **Get the current sales report from Cecilia** — 2025 full year + YTD 2026, all customers, no
      named list. This file is from Dec 2025 and Musco already proves entries go stale. Anything on
      the old list but not the new one becomes Dormant. Draft written 2026-09-26, not sent.
- [ ] **Get the Italy-direct customer list from Stefano.** No longer a "check whether this is a
      problem" item — Musco confirms it is. This is the higher-value ask of the two, because
      Cecilia's report cannot cover it and nothing in CST can infer it. Without it, `relationship`
      is knowably incomplete for one entire channel.
- [ ] **Decide how non-buyers are marked** (house, producer, agency, software vendor). Currently
      unset, which makes "unset" mean both "never touched" and "not a buyer." Rick's instinct
      2026-09-26 was to use `channel`; `channel` is defined as "Class of Trade / Sales Channel,"
      which fits brokers and rep groups but not an agency or a software vendor.
- [ ] **Sheet 2 of the source file holds 105 item codes** — a cross-check against `catalog.json`'s
      active SKU roster. Not done. Belongs with the product-identity work, not here.

---

## The durable lesson

Record this next to guardrail 2 in `docs/PEOPLE_DATA_OWNERSHIP.md`:

> **Engagement is not revenue.** Any ranking built on `num_contacted_notes`,
> `notes_last_contacted`, or touch counts measures Rick's email habits, not the customer
> relationship. It is a reasonable prompt for *what order to think about accounts in*. It is never
> evidence of *what an account is*. The buyer list comes from the producer's sales system.

And its sharper corollary, learned an hour later from Musco:

> **Absence of evidence is not evidence of absence.** An account invisible across every instrument
> CST holds — no email, no orders in the US report, months of silence — may simply be buying
> through a channel CST cannot see. Before marking anything Dormant or Lost, ask whether the
> silence means "gone" or "elsewhere." When the answer isn't known, ask Stefano rather than guess.
> A confidently wrong `Lost` is worse than an honest blank.
