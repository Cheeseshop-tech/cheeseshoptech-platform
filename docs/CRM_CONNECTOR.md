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

## Going live (also in LAUNCH_AND_MAINTENANCE.md §6)

1. **[Rick]** Build the Make scenario: client CRM → the data shape above; expose it as a webhook.
2. **[Rick]** Store CRM tokens + the Make webhook URL in Netlify env (never committed).
3. **[Claude]** Build `/.netlify/functions/crm` to call the webhook and return the dataset; set `VITE_CRM_BACKEND=make`.
4. For the pilot: wire HubSpot (agency) + Monti Trentini's CRM.
5. Verify: live data in the Monti dashboard; `crm` set correctly in `montitrentini.json`; no secret in the repo.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
