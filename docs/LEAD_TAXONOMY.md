# Lead & Account Classification — the taxonomy

**HubSpot is the foundation.** This document defines how a lead is classified, using standard
food-industry terms, mapped onto what HubSpot already holds. Created 2026-08-08 from Rick's
requested lead-class list.

---

## The core problem: one list, three different questions

The requested list mixes three things that must not share a field:

| Requested value | What it actually describes |
|---|---|
| Supermarket, Cheese Shop, Boutique Grocery, Independent Market, Restaurant, Deli, E-commerce, Distributor, Media outlet | **What the BUSINESS is** → a Company property |
| Distributor Sales Rep, Broker, Writer, Influencer, Press | **What the PERSON does** → a Contact property |
| Foodservice | **Which route to market** → a Channel, not a business type. Restaurants and Delis *are* foodservice. |

Put all fifteen in one dropdown and you can never answer "show me every supermarket in NJ" — half
your records will be tagged with a job role instead of a business. HubSpot already separates
Companies from Contacts; the taxonomy should use that split rather than fight it.

**A Distributor Sales Rep is a PERSON at a Distributor.** Both facts are true at once, and they
belong on different objects.

---

## ⚠️ Reserved term: "Class of Trade" means PRICING

`client.config.json → pricing.tiers` already defines **class of trade**, it drives the price on
every quote, and it prints on the proforma:

| id | Label | Adjust |
|---|---|---|
| `distributor` | Wholesale / Distributor (price list) | +0% |
| `direct-retail` | Direct to Retail | +15% |
| `direct-consumer` | Direct to Consumer | +35% |

**Do not reuse "class of trade" for the lead classification.** Three price tiers ≠ fifteen business
types, and conflating them would eventually put the wrong markup on a quote. The new field is
**Business Type**. Class of Trade stays as-is and stays about money.

The two relate but are not the same: a Cheese Shop (Business Type) is usually quoted at Direct to
Retail (Class of Trade) — usually, not always, which is exactly why they're separate fields.

---

## What HubSpot holds today

| Object | Property | Values in use | Records |
|---|---|---|---|
| Company | `Channel` | Specialty grocer (60) · Restaurant / Chef (45) · Distributor (39) · Retail chain (32) · Partner / Producer (13) | 189 |
| Contact | `Job title` | free text | — |
| Contact | `Lifecycle stage`, `Lead status` | HubSpot standard | — |

`Channel` is populated and working. **Keep it.** The plan below is additive — no re-tagging of 189
records, nothing breaks on day one.

---

## The design: three fields on two objects

```
COMPANY ─── Channel        (coarse, 7 values — route to market)   ← exists, +2 values
        └── Business Type  (fine, what the business is)           ← NEW
        └── Class of Trade (pricing tier, 3 values)               ← exists, unchanged

CONTACT ─── Contact Role   (what this person does)                ← NEW
```

### 1. Company → `Channel` (existing; add two)

The coarse grouping. Every Business Type rolls up to exactly one Channel.

| Value | Status |
|---|---|
| Retail chain | existing |
| Specialty grocer | existing |
| Restaurant / Chef | existing |
| Distributor | existing |
| Partner / Producer | existing |
| **E-commerce** | ADD |
| **Media / Press** | ADD |

### 2. Company → `Business Type` (new)

Standard industry terms, grouped by the Channel each belongs to.

| Channel | Business Type | Notes |
|---|---|---|
| Retail chain | **Supermarket / Grocery Chain** | Multi-store banner |
| Retail chain | **Club / Mass Retailer** | Costco, BJ's — different buying cycle |
| Specialty grocer | **Independent Grocer** | Single-store, full-line |
| Specialty grocer | **Gourmet / Specialty Market** | "boutique grocery" in standard terms |
| Specialty grocer | **Cheese Shop** | Cheesemonger; the core account |
| Specialty grocer | **Delicatessen** | Deli counter / prepared foods |
| Restaurant / Chef | **Restaurant — Independent** | Chef-driven, 1–2 units |
| Restaurant / Chef | **Restaurant — Chain / Group** | Multi-unit; different decision path |
| Restaurant / Chef | **Hotel / Resort / Caterer** | Banquet and event volume |
| Restaurant / Chef | **Institutional** | School, healthcare, corporate dining |
| Distributor | **Broadline Distributor** | Full-line (Sysco, US Foods, ACE Endico) |
| Distributor | **Specialty / Gourmet Distributor** | Cheese and specialty focused |
| Distributor | **Importer / Wholesaler** | Brings product in, sells on |
| Distributor | **Brokerage** | Represents brands; sells but doesn't take title |
| E-commerce | **Online Retailer / DTC** | Sells direct to consumers online |
| E-commerce | **Marketplace** | Amazon, Goldbelly — platform, not merchant |
| Media / Press | **Media Outlet** | Publication, blog, podcast, TV |
| Partner / Producer | **Producer / Supplier** | Upstream partner, not a customer |

> **"Foodservice" is deliberately absent.** It isn't a business type — it's the channel group
> covering Restaurant, Hotel, Caterer, and Institutional. Filtering "all foodservice" is a
> Channel query. Keeping it as a Business Type would create a bucket that overlaps four others,
> and everything would end up dumped in it.

### 3. Contact → `Contact Role` (new)

What the **person** does. This is where the roles from the requested list belong.

| Contact Role | Why it matters |
|---|---|
| **Buyer / Category Manager** | The decision-maker at retail and distribution — the most valuable role to capture, and it wasn't on the list |
| **Owner / Principal** | Decision-maker at an independent |
| **Chef / Culinary** | Specs product but often can't purchase |
| **Store / Department Manager** | Cheese or deli counter lead |
| **Distributor Sales Rep (DSR)** | Sells *your* product to *their* customers — a multiplier, not an end customer. Standard industry acronym. |
| **Broker** | Represents the brand into accounts |
| **Journalist / Writer** | Editorial coverage ("Press" as a person) |
| **Influencer / Creator** | Social/content coverage |
| **Other** | Escape hatch — keep it, and review what lands here quarterly |

**The DSR distinction is commercially important.** A DSR isn't a lead in the usual sense — they're
distribution leverage. One DSR relationship can open dozens of accounts, so they should be
reportable separately from end customers rather than inflating the lead count.

---

## Term standardization (requested → standard)

| You said | Use | Why |
|---|---|---|
| Supermarket | Supermarket / Grocery Chain | Standard channel term |
| Cheese Shop | Cheese Shop | Already standard in specialty |
| Boutique Grocery | Gourmet / Specialty Market | "Boutique" isn't a recognised trade class |
| Independent Market | Independent Grocer | Standard term for single-store retail |
| Restaurant | Restaurant — Independent / — Chain | The split changes the sales motion |
| Deli | Delicatessen | Standard |
| E-commerce | Online Retailer / DTC + Marketplace | A marketplace and a merchant behave differently |
| Foodservice | *(Channel, not a Business Type)* | It contains Restaurant, Hotel, Caterer, Institutional |
| Distributor | Broadline / Specialty / Importer | Standard foodservice distinction; drives pricing and expectations |
| Distributor Sales Rep | Distributor Sales Rep (DSR) | Standard acronym; **Contact Role, not Business Type** |
| Broker | Brokerage (company) + Broker (person) | The firm and the person are different records |
| Writer | Journalist / Writer | **Contact Role** |
| Influencer | Influencer / Creator | **Contact Role** |
| Media outlet | Media Outlet | **Business Type** |
| Press | *(resolved)* | The person is a Journalist/Writer; the company is a Media Outlet |

---

## Setting it up in HubSpot

1. **Companies → add `Business Type`** — single-select dropdown, options above. Internal name
   `business_type`. Do **not** use HubSpot's built-in `Type` property (its defaults are
   Prospect/Partner/Reseller/Vendor and mean something else).
2. **Companies → extend `Channel`** — add `E-commerce` and `Media / Press`.
3. **Contacts → add `Contact Role`** — single-select, options above. Internal name `contact_role`.
4. **Backfill Business Type from Channel** where it's unambiguous — the 39 Distributors and 32
   Retail chains can be bulk-set to a sensible default and refined later. The 60 Specialty grocers
   need a human pass, since that bucket splits four ways.
5. **Leave `Class of Trade` alone.** It stays a pricing concept.

Optional later: HubSpot can auto-set Channel from Business Type with a workflow, so a rep only
ever picks the specific one.

## Wiring it into the portal

- `crm-hubspot.js` reads `CHANNEL_PROPERTY = "channel"` — add `business_type` to the company
  `properties` array, and `contact_role` to the contact fetch, then surface both like `channel`.
- Booth to Meeting: the capture sheet gains a **Business Type** picker (company) and a
  **Contact Role** picker (person), both writing through `crm-push`.
- The show report can then answer *"how many cheese shops did we meet, and how many were DSRs?"* —
  which the current single `channel` field cannot.
