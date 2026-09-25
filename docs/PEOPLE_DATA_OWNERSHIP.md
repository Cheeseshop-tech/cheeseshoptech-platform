# People data — ownership map

**Status:** agreed 2026-09-26 · **Owner:** Rick · **Companion to:** `docs/DATA_OWNERSHIP_MAP.md`
(which covers PRODUCT data). This one covers PEOPLE: accounts, contacts, reps, territories.

> Read this before adding any field, store, or screen that touches a customer, a prospect, a
> distributor or a rep. It is a CONTRACT, not a narrative — if reality stops matching it, change
> the code or change this file, but never let them disagree quietly.

---

## Why this exists

CST has one product spine (`catalog.json` is the SKU roster; Cloudinary owns identity and copy)
and it has stayed coherent for months. It had **no people spine**, and the outreach side grew as
five partial overlays instead:

| Store | Populated, measured 2026-09-26 |
|---|---|
| HubSpot | 748 companies / 836 contacts — the only complete one |
| `crm-outreach` | **3 of 748** |
| `territory-book` | **0** |
| `campaign-enrichment` | 19 |
| `campaign-rep-calls` | 9 reps |
| `booth-history` | local to a device until synced |

The symptom, in Rick's words: *"it's fractured this solid design by just patchwork."* The concrete
failure that forced this document: on 2026-09-26 nothing in the system could answer **"is Eataly a
customer or a prospect?"** — not a missing feature, a missing model.

## The decision

**HubSpot is the organizer. CST owns the mirror.**

Rick, 2026-09-26: *"I don't want another app to own the beating heart, however using it as the
core database organizer is fine. I just want backups of HubSpot data to be owned by CST as a
knowledge base, so if we want to migrate to another solution we can."*

The mirror is what makes HubSpot a choice instead of a dependency.

### The one rule

> **An app store is either a staging buffer that promotes to HubSpot, or it is CST process state.
> Nothing else owns a fact about a person or an account.**

That sentence is the whole document. Everything below applies it.

---

## The four entities

| Entity | What it is | Lives as |
|---|---|---|
| **Account** | a business — retail, restaurant, foodservice, manufacturer, distributor | HubSpot Company |
| **Person** | a human at an Account | HubSpot Contact |
| **Rep** | a Person who works for a DISTRIBUTOR and sells on Monti's behalf | HubSpot Contact, `contact_role = Rep` |
| **Territory** | the named area a Rep covers | a shared value on both Account and Rep |

Relationships: Account *has* People · Distributor *employs* Reps · Rep *covers* Accounts (by
shared territory) · Campaign *targets* Accounts and Reps.

---

## Field map

### Account (HubSpot Company)

| Field | Owner | Written by | Read by | Notes |
|---|---|---|---|---|
| `name`, `domain`, `address`, `city`, `state`, `zip`, `phone` | HubSpot | Rick / import | CRM console, Booth, Campaigns | standard |
| `channel` | HubSpot | Rick | CRM filters, Campaign segmentation | **exists** — Distributor · Restaurant/Chef · Specialty grocer · Retail chain · Partner/Producer · Cheese shop |
| `instagram_url`, `facebook_url` | HubSpot | Rick / enrichment | Campaigns, social | **exists** |
| **`relationship`** | HubSpot | Rick | **everything** | **NEW.** Prospect · Active customer · Dormant · Lost |
| **`outreach_stage`** | HubSpot | app (promoted) | CRM funnel | **NEW.** New · Emailed · Replied · Meeting · Won · Lost · Not a fit |
| **`territory`** | HubSpot | Rick | Campaigns, routing | **NEW.** Multi-select — crossover is normal (ADR-002) |
| `notes_last_contacted`, `num_contacted_notes`, `hs_last_logged_call_date` | HubSpot | automatic | CRM account card | **already live** — HubSpot's own roll-up |

### Person (HubSpot Contact)

| Field | Owner | Written by | Read by | Notes |
|---|---|---|---|---|
| `firstname`, `lastname`, `email`, `phone`, `jobtitle`, `company` | HubSpot | Rick / enrichment / booth | everything | standard; `crm-push` writes these |
| **`contact_role`** | HubSpot | Rick / enrichment | Campaigns, routing | **NEW.** Buyer · Rep · Owner · Operations · Other |
| **`territory`** | HubSpot | Rick | routing | **NEW.** Reps only. Same vocabulary as Account |

### Why `relationship` and `outreach_stage` are two fields

They answer different questions and conflating them is what made the email feed unfilterable.
Eataly is **Won** in the funnel *and* an **Active customer** you talk to weekly — one is where a
sales process ended, the other is what the account is to you now. An account can also be
`Prospect` + `Meeting`, or `Active customer` + `New` (a live customer you are pitching a second
line to). Neither field implies the other.

**`relationship` is the one that decides whether traffic is operational.** Active customer
conversations — PO confirmations, price approvals, onboarding, WEBID threads — are operations, not
CRM. `Prospect` is CRM. **Exception that must be honoured:** a Person in an ACTIVE CAMPAIGN is
always CRM-relevant, whatever their Account's `relationship` — that is the "campaign tracking
crosses over to existing distributor relationships and their sales staff" case.

---

## What moves out of the app stores

| Store today | Becomes | Why |
|---|---|---|
| `crm-outreach` (status, note) | **buffer** → promotes `outreach_stage` to HubSpot; keeps working notes | status is a durable fact |
| `campaign-enrichment` | **buffer** → `crm-push` already promotes buyer/email/phone | proven working 2026-09-26 |
| `territory-book` | **retire** → territory becomes a HubSpot property on Account + Rep | 0 records; never consumed |
| `campaign-rep-calls` | **process state, stays** — but `bad-number` / `do-not-contact` promote | outcomes are facts; the call pass is process |
| `booth-history` | **buffer, unchanged** → `crm-push` on sync | already correct |
| `campaign-state`, `quotes`, checklist ticks | **process state, stays** | CST's own workflow, not customer facts |

`src/lib/territories.js` keeps its rep↔account derivation — it reads the HubSpot property instead
of the Blobs store. Campaign Manager's imports do not change.

---

## The mirror (CST knowledge base)

Same pattern as the inventory sync, which is already trusted:

```
scheduled task → HubSpot export → src/data/montitrentini/crm-snapshot/YYYY-MM-DD.json → git commit
```

- **Full snapshot, not incremental.** 748 companies + 836 contacts is a couple of MB. Simple beats
  clever, and a full snapshot is restorable on its own.
- **Committed to git** — history, diffs and portability for free. Week-over-week diffs are
  themselves a sales signal (who changed stage, who went dormant).
- **Includes the CST-added properties**, or the mirror is worthless for migration.
- **Weekly + on demand**, and it emails on failure. Every publish pipeline gets that now.

---

## Guardrails — what NOT to do

1. **Do not add a sixth store for a person-fact.** If it is a fact about a human or a business, it
   goes to HubSpot. If it is CST workflow, it stays app-side. There is no third category.
2. **Do not infer `relationship` from touch counts.** A prospect worked hard in a campaign looks
   exactly like an old customer. Guessing here was explicitly rejected 2026-09-26.
3. **Do not read people data from a Blobs store that HubSpot also holds.** One home per fact.
4. **Do not build a screen before the field it reads is populated.** `territory-book` shipped
   2026-09-22 with zero records because the thing meant to fill it was never built. That is the
   pattern this document exists to stop.

---

## Sequence

Each step is usable on its own. Do not start the next until the current one is done.

- [ ] **1. Create the four HubSpot properties** — `relationship`, `outreach_stage`, `territory`
      (Company); `contact_role`, `territory` (Contact). Rick, in HubSpot settings. ~15 minutes.
- [ ] **2. Mark the accounts that generate traffic.** Not all 748 — the ~20 with real email
      volume. Claude generates the ranked shortlist; Rick sets `relationship` on each.
- [ ] **3. Point the app at the new fields.** `crm-hubspot.js` requests them; the CRM console and
      the email feed filter on `relationship` + campaign membership instead of the interim
      house-domain rule.
- [ ] **4. Build the mirror.** Scheduled export + commit + failure email.
- [ ] **5. Retire `territory-book`** once territory lives on the HubSpot records.

Only after all five: revisit rep routing / the Move List, which is what wanted Territory Book in
the first place.
