# CheeseShop TECH — CRM Connector

**Status:** ✅ **LIVE — direct HubSpot** (`VITE_CRM_BACKEND=hubspot`, verified rendering real accounts
2026-08-15) · **Last updated:** 2026-08-15

> **⚠️ 2026-07-16 — the Make path for CRM was DELETED. This doc previously described it as the way to
> wire CRM data; that is no longer true and following it will waste your time.**
> There is no `netlify/functions/crm.js`, and **`MAKE_WEBHOOK_URL` is referenced nowhere in `src/` or
> `netlify/`** — it is a dead variable. CRM data now comes **straight from the HubSpot API**, server-side,
> via `netlify/functions/crm-hubspot.js`. `VITE_CRM_BACKEND` takes **`mock` | `hubspot`** — *not* `make`.
>
> Make is still live **for campaigns** (`MAKE_CAMPAIGNS_WEBHOOK_URL` → `netlify/functions/campaigns.js`).
> Don't read "Make is dead" from this — only the CRM leg of it is.

Client CRM data flows into the dashboard **directly from HubSpot**, read-only, with the private-app token
held server-side in the Netlify env var `HUBSPOT_TOKEN` (never exposed to the browser). HubSpot is the CRM
of record; the app reads it through one seam (`getCrmData`).

## What's surfaced

Contacts, sales pipeline (by stage), order history, invoice/payment status, and an activity feed —
the fields called out in OM §7. Two pages:

- **Dashboard** (`CrmDashboard`): stat cards (pipeline value, open orders, overdue invoices, contacts),
  pipeline-by-stage bars, recent activity, invoice table.
- **Orders** (`OrdersPage`): full order history table.

## Data shape (what `crm-hubspot.js` returns)

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
Dashboard/Orders → getCrmData(resolved)                      ← src/lib/crm.js (~L184)
                      ├─ VITE_CRM_BACKEND=mock   → MOCK fixture
                      └─ VITE_CRM_BACKEND=hubspot→ GET /.netlify/functions/crm-hubspot?tenant=<id>
                                                     (passcode header replayed via writeAuthHeader)
                                                   → HubSpot API, token server-side only
```
Switch with **`VITE_CRM_BACKEND=hubspot`** (build-time Vite var — **changing it requires a rebuild**, and it
must be set with Netlify's **Builds** scope, not Post processing). The `crm` type per tenant lives in
`config/clients/<id>.json` (`montitrentini` = `hubspot`).

Read behaviour worth knowing before debugging an "empty" dashboard (`crm.js` ~L192-208):
- Reads are **passcode-guarded server-side** since 2026-07-16; the client replays the unlock passcode.
- **Any failure degrades to `emptyDataset()`** — `{ contacts: 0, pipeline: [], orders: [], invoices: [],
  activity: [] }` — so cards hide rather than crash. An empty dashboard is therefore *ambiguous*: it can mean
  a 401, a 5xx, or genuinely no data.
- Failures are **never cached** (5-min TTL applies to successes only), so a transient error can't pin every
  surface to an empty account book. Sign out/in restores a missing passcode header.

### Related functions (all read-only except `crm-push`)
| Function | Role |
|---|---|
| `crm-hubspot.js` | The live read — companies, contacts, email activity. Powers `getCrmData`. |
| `crm-summary.js` | Counts for the Integration-health panel. Needs `crm.objects.{contacts,companies,deals}.read`. |
| `crm-push.js` | **The only HubSpot write path** — booth/enrichment rows → contacts. Dry-run by default; needs `crm.objects.contacts.write`. |
| `crm-outreach.js` | Outreach stage overlay in Netlify Blobs — *not* HubSpot, because HubSpot access is read-only. |

## Access control

CRM data is sensitive: **only `admin` / `client` roles see it** (`canViewCrm`). External collaborators
(pr/influencer/creator) don't get Dashboard or Orders in the nav at all — they see only the Media hub.
If `crm` is `none`, the dashboard shows a "connect a CRM" state instead of erroring.

## ~~Building the Make scenario~~ — REMOVED 2026-07-16 (historical)

**Deleted, not deferred.** This section used to give a two-stage Make build (custom webhook → webhook
response → HubSpot modules) plus a `MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make` cutover. **None of it
applies.** `netlify/functions/crm.js` was removed, `MAKE_WEBHOOK_URL` is dead in code, and `make` is not a
valid value for `VITE_CRM_BACKEND`. The direct-HubSpot read replaced the whole approach — fewer moving parts,
no third-party in the hot path for the CRM of record, and no scenario to keep switched on.

The instructions were removed rather than left struck through: they were step-by-step and copy-pasteable,
which is exactly the kind of stale content that gets followed by accident. Git history has them if the
Make-per-tenant idea ever returns for a client whose CRM has no usable API.

## Going live — ALREADY DONE

CRM is live in production. Nothing here is an open task; kept as the record of what "live" means.

| | |
|---|---|
| Netlify env | `HUBSPOT_TOKEN` (private-app token, server-side only) |
| Build var | `VITE_CRM_BACKEND=hubspot`, **Builds** scope |
| Tenant config | `crm: "hubspot"` in `config/clients/montitrentini.json` |
| Verified | 2026-08-15 — CRM page renders `HubSpot live ✓` with real accounts |

**How to verify it yourself — and the two ways people get a false answer:**

1. ✅ **Open the CRM page and read its status line** (`crm-page.jsx` ~L201): `HubSpot live ✓ N accounts`
   vs the sample-data warning. This is the *only* check that exercises the whole chain.
2. ❌ **Don't** curl `/.netlify/functions/crm-hubspot` and take a 401 as failure — or as success. The read
   gate returns **before** `HUBSPOT_TOKEN` is read, so a valid JSON 401 proves only that the function is
   deployed. A dead credential returns the identical response.
3. ❌ **Don't** grep the deployed bundle for a bare `"hubspot"` literal, and don't reuse an old asset hash —
   a stale `/assets/index-*.js` path returns the **SPA HTML shell with HTTP 200**, not a 404, so the grep
   finds nothing and looks like proof of breakage. Pull the current hash from `index.html` first, then grep
   for `VITE_CRM_BACKEND:` (Vite emits a runtime env object here, not a substituted literal).

Full incident detail: `HANDOFF.md` (2026-08-15 close-out).

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
