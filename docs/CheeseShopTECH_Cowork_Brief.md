# CheeseShop TECH — Platform Architecture & Operations
### Cowork Session Brief — v1.1

**Date:** June 5, 2026
**Prepared by:** Rick Posada, Founder
**Change in v1.1:** Added Section 9 — Domain & Hosting Architecture (Option C decision).

---

## 1. Context & Background

CheeseShop TECH is a niche creative-tech marketing agency building e-commerce storefronts
for perishable and specialty food businesses. The agency is structured as an operating
company under **Posada & Co.** (holding company). **CheeseShopTECH.com is registered**
(Cloudflare) and being stood up. **Monti Trentini USA** is the first active client.

During a strategic planning session, the following evolution was identified:

- Existing tools (price list creator, image library, e-commerce storefront) need to be unified into a single hosted client portal.
- The portal must support multiple clients with isolated data, content, and branding.
- A pluggable CRM connector layer is required — clients use their own CRMs.
- CheeseShop TECH needs operational documentation to support scale.

---

## 2. What We Are Building

This is a **multi-tenant client portal platform** — not a one-off build for Monti Trentini.

CheeseShop TECH owns and operates the infrastructure. Each client gets an isolated
environment with their own content, data, and branding — all running on a shared codebase.

### Three Core Layers

| Layer | Description | Isolation Level |
|---|---|---|
| Content | Copy, product descriptions, brand text | Per client |
| UI | Dashboard shell — CSTECH branded, white-labeled per client | Shared shell / client skin |
| Data | Price lists, image libraries, inventory, orders, CRM | Fully siloed per client |

---

## 3. Proposed Tech Stack

| Component | Tool / Service | Notes |
|---|---|---|
| Hosting | Netlify | One pipeline, multiple subdomains |
| Version Control | GitHub | Single repo, per-client config files |
| Media / Images | Cloudinary | Per-client folder structure, API-automated sync |
| Authentication | Netlify Identity | **Confirmed supported (Feb 2026 reversal)** — fastest path to v1 |
| CRM (Agency) | HubSpot | Rick's own — connected |
| CRM (Clients) v1 | Make (middleware) | Already connected — maps any CRM to dashboard |
| CRM (Clients) v2 | Merge.dev or Unified.to | Single API for top 5 CRMs — migrate after v1 validates |
| Frontend | React | Component-based — supports white-labeling cleanly |
| Per-Client Config | JSON config files | Brand colors, logo, domain, data sources per client |

---

## 4. CRM Connector Strategy

Clients use their own CRMs. The platform needs a standardized connector layer that supports
the top 5 without custom rebuilds.

**Top 5 CRMs to Support**

1. **HubSpot** — agency standard, well-documented API
2. **Salesforce** — enterprise accounts
3. **Zoho CRM** — common in small/mid specialty food businesses
4. **Pipedrive** — sales-focused, common in food import sector
5. **Monday.com CRM** — growing adoption in food brands

**Connector Build Sequence**

- **v1** — Make as middleware (already connected, zero new infrastructure)
- **v2** — Migrate to Merge.dev or Unified.to (one API, all CRMs) post client validation

**What the CRM layer feeds into the dashboard:** customer contact records, order history per
account, sales pipeline visibility, invoice and payment status, communication logs.

---

## 5. Operational Documents to Produce

All versioned in GitHub alongside the codebase (`/docs`).

| # | Document | Purpose | Status |
|---|---|---|---|
| 1 | Platform Architecture Doc | Technical north star — stack, data flow, multi-tenant rules | In this brief + Ops Manual |
| 2 | Client Onboarding Playbook | Repeatable process from intake to launch | In Operations Manual §8 |
| 3 | Best Practices Manual | Brand, photography, content, platform standards | Partially exists — formalize |
| 4 | Platform Build & Maintenance Manual | Technical ops — spin up, deploy, update, backup, security | Operations Manual |

> **Note:** Build Log and Operations Manual now live in `/docs` alongside this brief.

---

## 6. Recommended Build Sequence

| Phase | Deliverable | Outcome |
|---|---|---|
| Cowork | Architecture doc + all four ops docs scoped | North star locked before code starts |
| Domain | Option C wiring on Cloudflare + Netlify | URL claimable + wildcard ready for all clients |
| Design | Dashboard UI shell + white-label system | Visual system ready for client skinning |
| Code — Auth | Netlify Identity login per client | Secure portal access |
| Code — Shell | Unified React dashboard with navigation | All tools in one place |
| Code — Cloudinary | Automated media sync per client folder | No manual upload steps |
| Code — CRM v1 | Make connector for HubSpot + one client CRM | Data flowing into dashboard |
| Deploy | montitrentini.cheeseshoptech.com live | Monti Trentini pilot validated |
| CRM v2 | Migrate to Merge.dev / Unified.to | Scalable connector for all future clients |

---

## 7. Sequencing Discipline

**Ship first, iterate after.** A strict definition of done must be established for each phase
before new features or workstreams are added. Monti Trentini is the pilot — every decision
must also work for client #2 and #3.

**Post-launch parking lot** (do not build until v1 pilot is live and validated):

- Cold-chain logistics partnership integration
- Commission agreement automation
- AI image enhancement pipeline (Photoroom / Adobe Firefly)
- Full Services page on CheeseShopTECH.com
- Import traffic monitoring
- **Cloudflare for SaaS** (client-owned vanity domains) — see Section 9

---

## 8. Cowork Session Agenda

Complete each before starting the next.

| Order | Task | Output |
|---|---|---|
| 1 | Lock Platform Architecture | Architecture document v1 |
| 2 | Scope Client Onboarding Playbook | Section outline + v1 definition of done |
| 3 | Formalize Best Practices Manual | Pull from existing work + fill gaps |
| 4 | Scope Build & Maintenance Manual | Section outline + ownership assignments |

---

## 9. Domain & Hosting Architecture — DECISION (added v1.1)

**Situation:** `cheeseshoptech.com` is registered at **Cloudflare** (registrar + DNS) and is
**not yet on any host**. No email/MX records exist on the domain. The platform serves a
subdomain per client (`montitrentini.cheeseshoptech.com`, etc.).

**Options evaluated:**

| Option | Mechanism | Verdict |
|---|---|---|
| A — Cloudflare DNS, basic | Netlify issues a separate cert per subdomain, added manually | Rejected — manual step every onboarding |
| B — Delegate DNS to Netlify | Netlify auto-provisions wildcard cert | Rejected — gives up Cloudflare proxy/WAF/analytics |
| **C — Cloudflare wildcard + proxy** | One proxied `*.cheeseshoptech.com`; Cloudflare terminates SSL via Origin Cert to Netlify | **SELECTED** |
| C+ — Cloudflare for SaaS | Custom hostnames for client-owned domains | Deferred to parking lot |

**Decision: Option C.** It removes Option A's per-client cert work (one wildcard covers every
client) **and** keeps Cloudflare's full security stack (Option B's downside). This is the
standard architecture for a platform serving many client subdomains.

**Key facts that informed the decision:**

- **Netlify Identity is staying** — Netlify reversed the deprecation on Feb 19, 2026. v1 auth choice is safe.
- **Universal SSL covers `*.cheeseshoptech.com` for free**, but only **one subdomain level deep** — so keep the subdomain scheme flat (`client.cheeseshoptech.com`, not `x.client.cheeseshoptech.com`).
- A **Cloudflare Origin Certificate** (apex + wildcard, up to 15-yr validity) uploaded to Netlify avoids the Let's-Encrypt-behind-proxy renewal failure.
- **Cloudflare for SaaS** (C+) is the future layer when a client wants their own vanity domain (`shop.montitrentini.com`). First 100 custom hostnames free, then ~$0.10/hostname/mo. Not needed for subdomains under our own zone.

> Step-by-step wiring lives in the **Operations Manual §2 (Domain, DNS & SSL)**.
> The decision and its rationale are logged in the **Build Log**.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
