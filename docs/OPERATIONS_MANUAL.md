# CheeseShop TECH — Operations Manual

**Owner:** Rick Posada · **Version:** 1.0 · **Last updated:** 2026-06-05

The single technical-operations reference for the CheeseShop TECH multi-tenant platform:
how it's built, how to stand up a new client, how to deploy, and how to keep it safe.
Combines the Platform Build & Maintenance Manual and the Client Onboarding Playbook.

---

## Table of Contents

1. Architecture Overview
2. Domain, DNS & SSL (Option C)
3. Repository & Per-Client Config
4. Spinning Up a New Client Environment
5. Deployment Pipeline (GitHub → Netlify)
6. Cloudinary Media Management
7. CRM Connector Setup
8. Client Onboarding Playbook
9. Backup & Recovery
10. Security & Password Management
11. Versioning & Change Control
12. Client Exit & Ownership Transfer (Buyout)

---

## 1. Architecture Overview

CheeseShop TECH is a **multi-tenant** platform: one shared React codebase serves many
clients, each isolated by content, data, and branding.

```
                 Cloudflare (DNS + proxy + WAF + SSL edge)
                                  │
                  *.cheeseshoptech.com  (wildcard, proxied)
                                  │
                            Netlify (host)
                                  │
                    React shell (shared codebase)
                                  │
        ┌─────────────────┬──────────────┬──────────────────┐
   per-client JSON     Cloudinary     Netlify Identity     CRM layer
   (brand/config)    (media folders)   (auth per client)  (Make → Merge.dev)
```

**Isolation model**

| Layer | Isolated by | Mechanism |
|---|---|---|
| Content | Per client | `config/clients/<client>.json` + Cloudinary text/assets |
| UI | Shared shell, client skin | Brand tokens injected from client config |
| Data | Fully siloed | Per-client Cloudinary folder, per-client CRM connection, scoped queries |

**Tenant resolution:** the app reads the **subdomain** (`montitrentini` from
`montitrentini.cheeseshoptech.com`), loads the matching JSON config, and skins the shell.

---

## 2. Domain, DNS & SSL (Option C)

**Architecture:** Cloudflare (registrar + DNS + proxy) → Netlify (host). One proxied
wildcard covers all client subdomains; Cloudflare terminates SSL with an Origin Certificate.

### 2.1 One-time setup

1. **Deploy a site to Netlify first** (the coming-soon page or the React build). Note its
   `your-site.netlify.app` address.
2. In Netlify → **Domain management**, add:
   - `cheeseshoptech.com`
   - `www.cheeseshoptech.com`
   - `*.cheeseshoptech.com` (wildcard domain alias)
3. In **Cloudflare → DNS**, add (proxy ON / orange cloud):
   - `CNAME  @     → your-site.netlify.app`
   - `CNAME  www   → your-site.netlify.app`
   - `CNAME  *     → your-site.netlify.app`
4. **Origin Certificate** (avoids ACME-behind-proxy renewal failure):
   - Cloudflare → **SSL/TLS → Origin Server → Create Certificate**
   - Hostnames: `cheeseshoptech.com` **and** `*.cheeseshoptech.com` (15-yr validity OK)
   - Copy cert + key → Netlify → **Domain management → SSL/TLS → Set custom certificate**
5. Cloudflare → **SSL/TLS → Overview → Full (strict)**.

### 2.2 Per-client (going forward)

- **No DNS work.** The wildcard already resolves `<newclient>.cheeseshoptech.com`.
- Add the client's subdomain to its JSON config and ship.

### 2.3 Constraints & gotchas

- Universal SSL free wildcard is **one level deep** — keep subdomains flat.
- **Never** leave Cloudflare SSL mode on "Flexible" (redirect loops).
- Client-owned vanity domains (`shop.client.com`) → use **Cloudflare for SaaS** (parking lot).

---

## 3. Repository & Per-Client Config

- **Single GitHub repo.** One codebase, many clients.
- **Per-client config** lives in `config/clients/<client>.json`. No client-specific code in `src/`.
- A config defines: subdomain, brand (name, colors, logo), Cloudinary folder, CRM type, enabled modules.
- `config/clients/_template.json` is the canonical schema — copy it to create a new client.

See §4 for the exact creation steps and `src/lib/clientConfig.js` for how configs are loaded.

---

## 4. Spinning Up a New Client Environment

1. Copy `config/clients/_template.json` → `config/clients/<client>.json`.
2. Fill in: `id`, `subdomain`, `brand`, `cloudinaryFolder`, `crm`, `modules`.
3. Create the client's Cloudinary folder (see §6) matching `cloudinaryFolder`.
4. Set up the CRM connection in Make (see §7).
5. (If using Netlify Identity per client) invite the client's users.
6. Commit + push → Netlify auto-deploys. Visit `<client>.cheeseshoptech.com` to verify.
7. Run UAT (see §8) before announcing the URL to the client.

**Definition of done for a new client:** subdomain resolves over HTTPS, brand skin correct,
media loads from the client's Cloudinary folder, CRM data visible in dashboard, login works.

---

## 5. Deployment Pipeline (GitHub → Netlify)

- **Trigger:** push to `main` → Netlify builds and deploys automatically.
- **Build settings:** defined in `netlify.toml` (build command, publish dir, redirects).
- **Branch/preview deploys:** open a PR → Netlify posts a preview URL (Pro plan adds
  automatic wildcard subdomains for previews).
- **Rollback:** Netlify → Deploys → select a previous deploy → **Publish deploy**.
- **SPA routing:** `netlify.toml` redirects all paths to `index.html` so React Router works.

---

## 6. Cloudinary Media Management

- **One folder per client**, named to match `cloudinaryFolder` in the client config.
- Suggested structure: `clients/<client>/{products,brand,raw}`.
- Automate upload/sync via the Cloudinary API — **no manual drag-and-drop** in production.
- Naming: keep original product SKU in the public_id for traceability.
- Transformations (resize/format) applied at delivery via URL params, not by re-uploading.

---

## 7. CRM Connector Setup

**v1 — Make (middleware).** For each client:

1. Create a Make scenario that maps the client's CRM (HubSpot/Salesforce/Zoho/Pipedrive/Monday) → the dashboard data shape.
2. Feed: contact records, order history, pipeline, invoice/payment status, communication logs.
3. Store the client's CRM type in `config/clients/<client>.json` (`crm` field).

**v2 — Merge.dev / Unified.to.** After the pilot validates, migrate to a single unified API
covering all top-5 CRMs to eliminate per-client Make scenarios.

**Agency CRM:** HubSpot (Rick's own) — connected, used for CheeseShop TECH's own pipeline.

---

## 8. Client Onboarding Playbook

Run in order. Do not skip the pre-onboarding checklist.

1. **Pre-onboarding checklist** — confirm all assets exist before build starts:
   logo (vector), brand colors, product photography, price list, CRM access/credentials.
2. **Brand intake** — capture brand voice, colors, fonts, do/don't list.
3. **CRM connection setup** — identify client CRM, build Make scenario (§7), test data flow.
4. **Cloudinary folder setup** — create per-client folder structure (§6), upload assets.
5. **Content migration** — product descriptions, copy, price lists into the platform.
6. **UAT (user acceptance testing)** — client signs off on a preview URL before launch.
7. **Handoff & training** — walk the client through the dashboard; record a short Loom.
8. **Post-launch support window** — define duration and scope (what's covered, response time).

**Definition of done:** client has signed off on UAT, URL is live over HTTPS, training
delivered, support window agreed in writing.

---

## 9. Backup & Recovery

- **Code:** GitHub is the source of truth; every deploy is recoverable via Netlify deploy history.
- **Config:** per-client JSON is versioned in the repo — recoverable via Git history.
- **Media:** Cloudinary retains originals; keep a periodic export of the originals folder.
- **CRM data:** lives in the client's own CRM (system of record) — the platform reads, not owns.
- **Recovery drill:** quarterly, restore a previous Netlify deploy to a preview and verify a client renders correctly.

---

## 10. Security & Password Management

- **Secrets** (API keys: Cloudinary, Make, CRM tokens) → Netlify **environment variables**, never committed. `.gitignore` excludes `.env`.
- **Auth:** Netlify Identity per client; enforce strong passwords; review user lists per client quarterly.
- **Access:** least privilege — each client's users see only their tenant.
- **Cloudflare:** keep proxy on (WAF/DDoS); SSL/TLS Full (strict).
- **Registrar:** keep Cloudflare auto-renew ON for `cheeseshoptech.com` — a lapse takes the whole platform down.
- **Credential store:** use a password manager for all platform/admin credentials; do not store in docs or chat.

---

## 11. Versioning & Change Control

- All docs in `/docs` are versioned in GitHub with the code.
- **Build Log** (`BUILD_LOG.md`) records every decision/action — append, newest on top.
- Bump the doc version + "Last updated" date on any material change.
- One change = one commit with a clear message; significant decisions also get a Build Log entry.

---

## 12. Client Exit & Ownership Transfer (Buyout)

The clean, repeatable process for handing a client full ownership of *their* site. A
documented exit path is a **sales asset** — it removes lock-in fear and lets prospects say
yes — and a **revenue event** (the buyout fee). Pricing lives in
`PRICING_AND_ENGAGEMENT_MODEL.md`; this section is the technical/operational mechanics.

### 12.1 The IP boundary (non-negotiable)

- **CheeseShop TECH platform core = owned IP, never transferred.**
- A buyout delivers a **single-tenant fork** of that client's own site only.
- The fork is licensed to the client for their own use, **no resale, no sublicensing**.
- The multi-tenant codebase, shared components, and other tenants' anything stay with CSTECH.

### 12.2 Design-for-extraction (do this during the build, not at exit)

Make every client carve-out a packaging job, not a rebuild:

- **Provision in the client's own accounts** wherever the asset is ultimately theirs — their
  Cloudinary (sub-)account, their CRM (already theirs), their domain. Less to migrate later.
- Keep **all client-specific values in `config/clients/<client>.json`** — zero client logic in shared code.
- Keep client data **fully siloed** (media folder, CRM connection, auth users) per the isolation model (§1).
- Maintain a per-client **asset register** (accounts, credentials owner, integrations) from day one.

### 12.3 Buyout carve-out checklist

When a buyout is triggered:

1. **Fork** the repo → new single-tenant repo `client-<name>-site` (private).
2. **Bake in** the client's config; **strip** multi-tenant routing, other tenants' configs, and platform-only modules.
3. **Reduce** to a standalone app (own build, own env). Confirm it runs with no dependency on the platform repo.
4. **Media:** transfer/duplicate the client's Cloudinary folder into their account; repoint asset URLs.
5. **Domain:** cut over from `client.cheeseshoptech.com` to the client's own domain (their DNS/registrar).
6. **Hosting:** transfer the Netlify site to the client's Netlify team (or redeploy the fork to their account).
7. **Auth:** export Netlify Identity users; re-provision on their instance.
8. **Secrets:** rotate ALL API keys/tokens; new values issued under the client's own accounts. Revoke old ones.
9. **CRM:** confirm the connection now runs against the client's own credentials end-to-end.
10. **Repo ownership:** transfer the new repo to the client's GitHub org; remove CSTECH admin access per the agreed timeline.
11. **Docs:** deliver a client-specific runbook (deploy, update, backup, support contacts).
12. **Decommission:** after sign-off, remove the tenant from the platform (config, routing, folders) and archive a final backup.

### 12.4 Transition window & post-buyout

- Include a defined **transition window** (e.g. 30 days: "we fix what breaks") in the buyout.
- Offer an **optional ongoing support contract** afterward — many clients buy out for control but still want CSTECH on call.
- After the window, any work reverts to per-task or a new retainer.

### 12.5 Definition of done (buyout)

Client owns the repo, hosting, domain, media, and auth under their own accounts; all CSTECH
secrets rotated and old access revoked; runbook delivered; tenant decommissioned from the
platform; final backup archived; license terms signed.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
