# Integrations Plan — where each kind of data comes from

**Written:** 2026-06-13 · Corrects an earlier assumption (HubSpot was treated as the CRM; it is NOT).

## The system-of-record map (decided with Rick, 2026-06-13)

| Portal surface | Real source | Status |
|---|---|---|
| CRM dashboard + Orders (pipeline, accounts, deals) | **Salesforce** (Monti's CRM; Rick has access) | sample data now — see below |
| Campaigns / social content publishing | **HubSpot** (content/marketing engine, NOT the CRM) | publish in HubSpot; portal surfaces status |
| Pricing & Inventory (availability, lots) | **Google Sheet** "availability of items" (sales@montitrentini-usa.com) | blocked on MT admin share — `DATA_UPDATES.md` |
| Catalog / Media / Proposals images | **Cloudinary** (one `images.json` manifest) | LIVE (F5) |

> **⚠️ REVERSED 2026-06-17 — the section below is historical. Salesforce was DROPPED; HubSpot IS the CRM
> of record**, and the CRM dashboard reads it directly and live (see `docs/CRM_CONNECTOR.md`,
> `INTEGRATION_WIRING_BRIEF.md`, and the note at the top of `src/lib/crm.js`). There is no
> `crm-salesforce.js` and `salesforce` is not a valid `VITE_CRM_BACKEND` value — it takes `mock | hubspot`.
> Kept for the reasoning trail, not as a plan. Do not build from it.

Key correction *(as understood 2026-06, since reversed)*: **HubSpot is the social/content publishing engine,
not the CRM of record.** The ~131 contacts / 140 companies currently in HubSpot are incidental to a fresh
setup; the pipeline lives in Salesforce. The CRM dashboard must wire to Salesforce, never HubSpot.

## ~~CRM dashboard → Salesforce~~ (superseded — CRM reads HubSpot directly)

- ~~The dashboard + Orders pages are built against a mock~~ — they now read live HubSpot via
  `netlify/functions/crm-hubspot.js`.
- ~~**No Salesforce MCP connector is available/connected today.** Options to wire it later:~~
  1. ~~**Salesforce connected app + token** → a Netlify function (`functions/crm-salesforce.js`) reads
     Salesforce (opportunities → pipeline, accounts → contacts/orders), behind the existing
     `getCrmData` seam (`VITE_CRM_BACKEND=salesforce`).~~ Never built.
  2. ~~**Wait for a Salesforce connector** in the registry.~~
  3. ~~Interim: keep sample data.~~
- ~~The Make-scenario path in `CRM_CONNECTOR.md` is now deprecated in favor of a direct Salesforce
  integration.~~ Both were abandoned: Make's CRM leg was deleted 2026-07-16 and Salesforce was never
  started. The live answer is **direct HubSpot**.

## HubSpot → Campaigns / social content

- HubSpot is for **creating + scheduling social/marketing content** — done in HubSpot's own app.
- The connected HubSpot MCP here is **CRM-read only** (search/read objects, properties) — it can NOT
  publish social content. Social publishing uses HubSpot's Marketing API / native scheduler.
- Platform role: the **Campaigns** module (`campaigns-page.jsx`) holds campaign definitions and
  results itself — seeded in code (`src/lib/campaigns.js`) plus a native in-app write path
  (`netlify/functions/campaign-defs.js`, Blobs). `functions/campaigns.js` (a Make.com proxy this
  section used to point at) was retired 2026-09-20 — never built, and redundant with the native
  write path. If HubSpot marketing data is worth pulling in later, build it as a fresh seam against
  whatever's live then, not a revival of the old Make path.

## Recommended sequence (when Rick is ready to build integrations)
1. **Salesforce → CRM dashboard** (the real pipeline; highest sales value). Needs Rick's connected app.
2. **Availability sheet → Pricing/Inventory** (needs MT admin share).
3. **HubSpot → Campaigns status** (after social content is actually being published there).

Until then: all four surfaces run on realistic sample/seam data and are demo-ready.
