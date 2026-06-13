# Integrations Plan — where each kind of data comes from

**Written:** 2026-06-13 · Corrects an earlier assumption (HubSpot was treated as the CRM; it is NOT).

## The system-of-record map (decided with Rick, 2026-06-13)

| Portal surface | Real source | Status |
|---|---|---|
| CRM dashboard + Orders (pipeline, accounts, deals) | **Salesforce** (Monti's CRM; Rick has access) | sample data now — see below |
| Campaigns / social content publishing | **HubSpot** (content/marketing engine, NOT the CRM) | publish in HubSpot; portal surfaces status |
| Pricing & Inventory (availability, lots) | **Google Sheet** "availability of items" (sales@montitrentini-usa.com) | blocked on MT admin share — `DATA_UPDATES.md` |
| Catalog / Media / Proposals images | **Cloudinary** (one `images.json` manifest) | LIVE (F5) |

Key correction: **HubSpot is the social/content publishing engine, not the CRM of record.** The ~131
contacts / 140 companies currently in HubSpot are incidental to a fresh setup; the pipeline lives in
Salesforce. The CRM dashboard must wire to Salesforce, never HubSpot.

## CRM dashboard → Salesforce

- The dashboard + Orders pages are built against a mock (`lib/crm.js`, shape in `CRM_CONNECTOR.md`).
- **No Salesforce MCP connector is available/connected today.** Options to wire it later:
  1. **Salesforce connected app + token** → a Netlify function (`functions/crm-salesforce.js`) reads
     Salesforce (opportunities → pipeline, accounts → contacts/orders), behind the existing
     `getCrmData` seam (`VITE_CRM_BACKEND=salesforce`). Most direct; needs Rick to create the
     connected app + OAuth.
  2. **Wait for a Salesforce connector** in the registry, then read it in-session / via a function.
  3. Interim: keep sample data (the dashboard is demo-ready as-is).
- The Make-scenario path in `CRM_CONNECTOR.md` is now deprecated in favor of a direct Salesforce
  integration (fewer moving parts).

## HubSpot → Campaigns / social content

- HubSpot is for **creating + scheduling social/marketing content** — done in HubSpot's own app.
- The connected HubSpot MCP here is **CRM-read only** (search/read objects, properties) — it can NOT
  publish social content. Social publishing uses HubSpot's Marketing API / native scheduler.
- Platform role: the **Campaigns** module (`campaigns-page.jsx`, `functions/campaigns.js`) surfaces
  campaign **status / results** pulled from HubSpot's marketing API — it does not author posts.
- Build later: a `functions/campaigns-hubspot.js` reading HubSpot marketing campaigns (needs a HubSpot
  private-app token with marketing scopes), behind the existing campaigns seam.

## Recommended sequence (when Rick is ready to build integrations)
1. **Salesforce → CRM dashboard** (the real pipeline; highest sales value). Needs Rick's connected app.
2. **Availability sheet → Pricing/Inventory** (needs MT admin share).
3. **HubSpot → Campaigns status** (after social content is actually being published there).

Until then: all four surfaces run on realistic sample/seam data and are demo-ready.
