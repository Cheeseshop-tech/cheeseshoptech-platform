# Integration Wiring Brief — going from mock → live

**Status:** Draft 2026-06-17 · **Owner:** Rick Posada · Practical companion to `INTEGRATIONS_PLAN.md`,
`CRM_CONNECTOR.md`, `STOREFRONT_STRATEGY.md`. What the Integration-health panel (`agency-console.jsx`)
reports, what each seam needs to go live, who provides what, and the order to do it.

## How a seam goes live
Each seam is a **build-time switch** (`VITE_*_BACKEND`) that flips from `mock` to a real adapter, plus a
**Netlify function** holding any secret server-side (values never reach the browser). Pattern already proven by
Media (Cloudinary): function + env var + flag. **Rule: build additively, start read-only, one seam at a time,
rollback = `git revert`.** Each live integration needs a credential **Rick** provides.

## Status + go-live requirements

| Seam | Now | Flag → live value | To go live | Rick provides | Effort / risk |
|---|---|---|---|---|---|
| **Media** (Cloudinary) | ✅ live | `VITE_MEDIA_BACKEND=cloudinary` | done | — | — |
| **Passcode gate** | ✅ configured | `VITE_AUTH_MODE=passcode` | done | — | — |
| **CRM** (HubSpot) | 🔸 mock | `VITE_CRM_BACKEND=hubspot` | new `netlify/functions/crm.js` calling HubSpot API; map objects → app shape; read-only first | **HubSpot Private App token** (Netlify env `HUBSPOT_TOKEN`) | Medium / medium |
| **Campaigns** (Make) | 🔸 mock | `VITE_CAMPAIGNS_BACKEND=make` | Make.com scenario(s) + webhook; function to trigger/report | Make account + webhook URL/key | Medium-high / medium |
| **Storefront** (Shopify) | 🔸 mock | `VITE_STORE_BACKEND=shopify` | real Shopify store + Storefront/Admin API; product/cart wiring | Shopify store + API tokens | High / medium |
| **Pricing data** | 🔸 mock | `VITE_PRICING_BACKEND=function` | optional: serverless pricing endpoint (works today via the `images.json`/manifest + pricing-core) | — | Low / low |

## Recommended order
1. **CRM / HubSpot — read-only (do first).** Highest value: it's the spine of the "Content Engine plugged into
   the CRM" pitch, and Monti's HubSpot already holds 632 contacts. Pull contacts/companies/deals into the
   dashboard. Low blast radius if read-only.
2. **CRM / HubSpot — write (next).** Log activities/notes from the app once read is solid.
3. **Campaigns / Make.** When campaign volume justifies automation (social publishing still needs a scheduler
   or Marketing Hub — HubSpot Starter can't publish social).
4. **Storefront / Shopify.** Only when DTC e-commerce opens (ties to the SEAFRIGO DTC question on the Monti side).
5. **Pricing function.** Optional/last — the manifest path works today.

## Decision to make before CRM build
**Direct HubSpot vs Make middleware.** The seam's `liveWhen` currently says `make`, but a **direct HubSpot
Private App** is simpler for v1 (one function, one token, fewer moving parts). Recommend **direct HubSpot first**;
add Make later only if you need multi-app orchestration. *(Note: the HubSpot MCP connector Claude uses in Cowork
is separate — that's for Claude to act; this seam is for the running app/dashboard.)*

## Credentials checklist (Rick gathers before we wire)
- [ ] **HubSpot Private App token** — HubSpot → Settings → Integrations → Private Apps → create app → scopes:
      `crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.deals.read` (read-only to start).
      → set as Netlify env `HUBSPOT_TOKEN` (secret). (Add write scopes later for step 2.)
- [ ] (Later) **Make.com** account + scenario webhook.
- [ ] (Later) **Shopify** store + Admin API access token.

## Safety
No tests in the repo; Netlify keeps the last good deploy if a build fails. Each seam = additive (new function +
flag), read-only first, secrets server-side only, rollback one `git revert` away. We touch one seam per pass and
verify before depending on it.
