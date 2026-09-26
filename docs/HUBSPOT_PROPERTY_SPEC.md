# HubSpot people-spine properties — build sheet

**Contract:** `docs/PEOPLE_DATA_OWNERSHIP.md` · **Built by:** Rick, by hand, in the HubSpot UI
**Status:** BUILT AND VERIFIED 2026-09-25. All five exist in HubSpot with every option's internal
value equal to its label. Re-verify by API before trusting this file — it describes reality as of
that date, not a guarantee.

---

## The rule that governs this whole sheet

> **An option's INTERNAL VALUE is write-once.** You set it when you add the option; after Save it
> can never be changed. The label can be renamed forever — the value cannot. The code reads
> values, not labels.
>
> So: **type the internal value explicitly on every option.** Do not let HubSpot derive it from
> the label. That derivation is what produced an option stored as `Not a fit` but displayed as
> `Lost` on the first build.

Same rule at the property level: the property's internal name is derived from the label you type
(`Contact Role` -> `contact_role`), and the app reads internal names. Type the labels exactly.

---

## Navigation (this is where the first attempt went wrong)

Clicking a property's **name** opens a read-only preview. That is not the editor.

1. Settings (gear, top right) -> left sidebar **Properties**
2. Set **Select an object** — Company or Contact. *Check this every single time;* the create
   dialog has its own Object field that defaults to Company, which is what misplaced
   `contact_role` on the first build.
3. **Hover the property's row** -> click **Edit** (appears on hover)
4. Click the **Field type** tab — the options table lives here and nowhere else
5. Delete: tick the option's checkbox -> **Delete** at the top of the table
6. Add: **+ Add option** -> type the **label** -> type the **internal value** -> Save

**Load options** (copy an option list from another property) exists on that tab but is not
available on this portal's plan. Type the lists by hand instead — which is why the Territory
warning below matters.

---

## Step 1 — permanently delete the four broken properties

Archiving is not enough: an archived property keeps its internal name, so recreating it would
error or give you a `_1` suffix the code doesn't know.

For each of `outreach_stage`, `territory` (Company), `contact_role`, `territory` (Contact):

1. Archive it
2. Open the **Archived properties** view (filter at the top of the Properties list)
3. **Permanently delete** it

Safe to do: none of these are attached to a record, workflow, list, or form. Verified 2026-09-25.

**Do NOT delete `relationship`.** It was built correctly — 4 options, right values. Leave it alone.

---

## Step 2 — rebuild

### Company properties (Object = Company)

#### Outreach stage
- **Label:** `Outreach stage` — lowercase "stage", deliberate; yields `outreach_stage`
- **Field type:** Dropdown select · **Group:** Company information
- **Options — label and internal value identical, in this order:**
  ```
  New
  Emailed
  Replied
  Meeting
  Won
  Lost
  Not a fit
  ```
- Seven values. `Lost` and `Not a fit` are SEPARATE — a deal you lost is not an account that was
  never a fit. The first build collapsed them and that is why this property is being replaced.
- **Not the same thing as Relationship.** An account can be `Won` here and `Active customer`
  there. One is where a sales process ended; the other is what the account is to you now.

#### Territory
- **Label:** `Territory` · **Field type:** Multiple checkboxes · **Group:** Company information
- **Options — label and internal value identical, in this order:**
  ```
  NY Metro
  New Jersey
  Philadelphia
  PA
  New England
  Upstate NY
  Mid-Atlantic
  Southeast
  FL
  National
  ```
- Multi-select because crossover is normal — an account can be covered by reps in two areas.
- `Mid-Atlantic` is hyphenated. `FL`, not `Florida`. These are the as-built spellings, verified by
  API 2026-09-25 — copy them, do not "correct" them.

### Contact properties (Object = Contact)

#### Contact Role
- **Label:** `Contact Role` · **Field type:** Dropdown select · **Group:** Contact information
- **Options — label and internal value identical:**
  ```
  Buyer
  Rep
  Owner
  Operations
  Other
  ```
- `Rep` means a distributor's salesperson who sells on Monti's behalf — the distinction Campaign
  Manager routing depends on. Note the capitalization: `Rep`, not `REP`.

#### Territory
- **Label:** `Territory` · **Field type:** Multiple checkboxes · **Group:** Contact information
- **Options:** the same ten, same order, spelled identically to the Company list above.

> **This is the one that fails silently.** The rep-to-account join is a plain string match. If
> Company stores `Southeast` and Contact stores `South East`, nothing errors — the join just
> returns nothing, forever. With Load options unavailable, copy-paste the ten values from this
> file. Do not retype them from memory.

### Already built, do not touch

#### Relationship (Company)
`relationship` · Dropdown select · `Prospect` · `Active customer` · `Dormant` · `Lost`

What this account is to us RIGHT NOW. This is the field that decides whether an account's email
traffic is operational or CRM-relevant.

---

## Step 3 — verify

Ask Claude to re-read both objects through the HubSpot API. The check that matters is not "do the
properties exist" but **"do the two Territory option lists match string-for-string."**

Expected end state:

| Object | Property | Internal name | Type | Options |
|---|---|---|---|---|
| Company | Relationship | `relationship` | select | 4 |
| Company | Outreach stage | `outreach_stage` | select | 7 |
| Company | Territory | `territory` | checkbox | 10 |
| Contact | Contact Role | `contact_role` | select | 5 |
| Contact | Territory | `territory` | checkbox | 10 |

---

## History

- **2026-09-25, first build.** All five created by hand. Four option strings drifted: `FLorida`
  (Company Territory), `South East` (Contact Territory), `REP` (Contact Role), and an Outreach
  stage option stored as `Not a fit` but labeled `Lost`, with no separate `Lost` — six options
  where seven were needed. `contact_role` was also first created on Company by mistake and
  archived. Patching was attempted first and abandoned: the internal value of an existing option
  cannot be edited, and this portal's plan does not expose Load options.
- **2026-09-25, rebuild.** `outreach_stage`, `territory` (Company), `contact_role` and `territory`
  (Contact) were permanently deleted and recreated; `relationship` was left untouched. One typo
  (`Southeas`) was caught by API verification mid-rebuild and fixed. Final state verified: all
  five properties, every option's internal value equal to its label, both Territory lists
  identical string-for-string.
- **Territory is 10 values, not the 8 originally specified.** `Philadelphia / PA` and
  `Southeast / FL` were split into separate options during the first build. Finer-grained and
  better; adopted deliberately. `scripts/create-crm-properties.mjs` was updated 2026-09-25 to
  match the as-built ten.
- **Why not a script.** `crm.schemas.companies.write` / `crm.schemas.contacts.write` are not
  grantable on this portal's private app, so `scripts/create-crm-properties.mjs` returns 403. The
  UI is the only write path for schema. That script stays in the repo as the canonical machine-
  readable definition of these properties even though it cannot run.
