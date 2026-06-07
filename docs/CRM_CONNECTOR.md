# CheeseShop TECH — CRM Connector

**Status:** Phase 6 (dashboard + data layer built against a mock; Make wiring deferred to launch) · **Last updated:** 2026-06-05

Client CRM data flows into the dashboard via a **Make scenario** — zero new infrastructure (OM §7).
Make maps the client's CRM (HubSpot / Salesforce / Zoho / Pipedrive / Monday) into the dashboard's
data shape; the app reads it through one seam.

## What's surfaced

Contacts, sales pipeline (by stage), order history, invoice/payment status, and an activity feed —
the fields called out in OM §7. Two pages:

- **Dashboard** (`CrmDashboard`): stat cards (pipeline value, open orders, overdue invoices, contacts),
  pipeline-by-stage bars, recent activity, invoice table.
- **Orders** (`OrdersPage`): full order history table.

## Data shape (the contract Make must produce)

```json
{
  "contacts": 38,
  "pipeline": [{ "stage": "Lead", "count": 12, "value": 48000 }],
  "orders":   [{ "id": "SO-1042", "account": "Eataly Flatiron", "channel": "distributor", "total": 8400, "status": "Open", "date": "2026-06-02" }],
  "invoices": [{ "id": "INV-880", "account": "Eataly Flatiron", "amount": 8400, "status": "Sent", "due": "2026-06-20" }],
  "activity": [{ "who": "Eataly Flatiron", "what": "Reorder inquiry", "when": "2h ago" }]
}
```
Pipeline stages: `Lead → Qualified → Sample sent → Negotiation → Won`. Order status: `Open|Shipped|Delivered`.
Invoice status: `Draft|Sent|Paid|Overdue`.

## Architecture / seam

```
Dashboard/Orders → getCrmData(resolved)              ← src/lib/crm.js
                      ├─ mock backend (now)
                      └─ real (later): GET /.netlify/functions/crm?tenant=<id>
                                        → Make webhook → client CRM (secrets server-side only)
```
Switch with `VITE_CRM_BACKEND=make`. The `crm` type per tenant lives in `config/clients/<id>.json`
(`montitrentini` = `hubspot`).

## Access control

CRM data is sensitive: **only `admin` / `client` roles see it** (`canViewCrm`). External collaborators
(pr/influencer/creator) don't get Dashboard or Orders in the nav at all — they see only the Media hub.
If `crm` is `none`, the dashboard shows a "connect a CRM" state instead of erroring.

## Building the Make scenario — HubSpot (staged, 2026-06-06)

The pipe: `Dashboard → /.netlify/functions/crm?tenant=montitrentini` → the function POSTs
`{ "tenant": "montitrentini" }` to `MAKE_WEBHOOK_URL` → **Make scenario** responds with the data
shape above → dashboard renders. Build it in two stages so the plumbing is proven before the HubSpot
mapping.

### Stage 1 — prove the pipe (sample data, ~15 min)
1. **Make.com** (free account ok) → **Create a new scenario**.
2. Module 1: **Webhooks → Custom webhook** → **Add** → name it `monti-crm` → **copy the webhook URL**.
3. Module 2 (after it): **Webhooks → Webhook response** → Status `200`, add header `Content-Type:
   application/json`, **Body** = the sample JSON below.
4. **Save**, toggle the scenario **ON** (and "Immediately as data arrives").
5. **Netlify** → `cheeseshoptech-platform` → Environment variables: `MAKE_WEBHOOK_URL=<the copied URL>`
   and `VITE_CRM_BACKEND=make` → **redeploy**.
6. Open the Monti **Dashboard** → pipeline/orders/activity should now come from Make. ✅ pipe proven.

Sample JSON body for the Webhook response:
```json
{
  "contacts": 38,
  "pipeline": [
    { "stage": "Lead", "count": 12, "value": 48000 },
    { "stage": "Qualified", "count": 7, "value": 63000 },
    { "stage": "Sample sent", "count": 5, "value": 81000 },
    { "stage": "Negotiation", "count": 3, "value": 72000 },
    { "stage": "Won", "count": 4, "value": 96000 }
  ],
  "orders": [
    { "id": "SO-1042", "account": "Eataly Flatiron", "channel": "distributor", "total": 8400, "status": "Open", "date": "2026-06-02" }
  ],
  "invoices": [
    { "id": "INV-880", "account": "Eataly Flatiron", "amount": 8400, "status": "Sent", "due": "2026-06-20" }
  ],
  "activity": [
    { "who": "Eataly Flatiron", "what": "Reorder inquiry — Asiago DOP", "when": "2h ago" }
  ]
}
```

### Stage 2 — real HubSpot data (incremental)
Insert HubSpot modules between the webhook and the response, replacing the hardcoded body:
- **HubSpot → Search Deals** → group by deal stage → build the `pipeline` array (map HubSpot's stage
  names to `Lead/Qualified/Sample sent/Negotiation/Won`; `value` = sum of deal amounts per stage).
- **HubSpot → Get Contacts** (or a count) → `contacts`.
- Orders/invoices/activity: from HubSpot if tracked there, else another source (or leave as recent
  deals/notes for v1). Use Make's **Array aggregator** to assemble each list.
- The **Webhook response** body becomes the assembled JSON. Verify the dashboard after each addition.

## Going live (also in LAUNCH_AND_MAINTENANCE.md §6)

1. **[Rick]** Build the Make scenario: client CRM → the data shape above; expose it as a webhook.
2. **[Rick]** Store CRM tokens + the Make webhook URL in Netlify env (never committed).
3. **[Claude]** Build `/.netlify/functions/crm` to call the webhook and return the dataset; set `VITE_CRM_BACKEND=make`.
4. For the pilot: wire HubSpot (agency) + Monti Trentini's CRM.
5. Verify: live data in the Monti dashboard; `crm` set correctly in `montitrentini.json`; no secret in the repo.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
