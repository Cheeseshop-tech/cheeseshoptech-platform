# CheeseShop TECH — Pricing & Engagement Model

**Owner:** Rick Posada · **Version:** 1.0 (draft) · **Last updated:** 2026-06-05
**Stage:** Consult / strategy. Numbers below are **placeholders** — set real figures with your
own cost basis and market. This doc defines the *structure*, not final prices.

> **IP boundary (carried from the Build Log):** CheeseShop TECH is the platform (owned IP).
> Clients are tenants. A buyout transfers only a **single-tenant fork** of the client's own
> site — never the platform core. All terms below assume this.

---

## 1. Why this model

Three revenue moments + a clean exit. Each stage builds client confidence and stacks revenue:

1. **Build** — one-time, gets them launched.
2. **Operate** — recurring (or per-task), the durable revenue engine.
3. **Buyout** — one-time exit that *also* removes the prospect's #1 objection ("am I locked in?").

The documented exit is itself a **sales tool**: clients commit faster when they know they can
leave cleanly and own their site outright if they choose.

---

## 2. Build Fee (one-time)

Covers scoping, brand intake, build, integrations, content migration, UAT, and launch.

- **Tier by complexity, not a flat number** — a 20-SKU shop ≠ a 500-SKU shop.
- Suggested tiering levers: # of products, # of integrations (CRM, payments, etc.), volume of content migration, custom design needs.

| Tier | Scope (example) | Build fee (placeholder) |
|---|---|---|
| Starter | Single storefront, ≤50 SKUs, 1 CRM, standard skin | `$___` |
| Growth | ≤250 SKUs, 1–2 integrations, light custom design | `$___` |
| Premium | 250+ SKUs, multiple integrations, custom modules | `$___` |

- Payment: e.g. 50% to start, 50% at launch.
- **Out-of-scope changes** during build → change order at the per-task rate (§3).

---

## 3. Operate Fee (recurring + à la carte)

Admin + webmaster duties: hosting oversight, updates, security, backups, monitoring, and changes.

### 3a. Monthly retainer (preferred — recurring revenue)

| Plan | Includes (example) | Monthly (placeholder) |
|---|---|---|
| Care | Hosting/uptime oversight, security, backups, up to **2 hrs** changes | `$___/mo` |
| Care+ | Above + up to **5 hrs** changes, priority response, monthly check-in | `$___/mo` |
| Managed | Above + up to **10 hrs**, proactive optimization, quarterly review | `$___/mo` |

- Unused hours: define policy (don't roll over, or roll over 1 month max).
- Overage: billed at the per-task / hourly rate.

### 3b. Per-task menu (for clients who won't retain)

Fixed prices for defined tasks beat hourly — clients like a known number; it protects margin.

| Task (example) | Price (placeholder) |
|---|---|
| Add / edit a product | `$___` |
| Banner / homepage content swap | `$___` |
| Price-list update | `$___` |
| New page build | `$___` |
| Ad-hoc hourly (undefined work) | `$___/hr` |

> **Pricing discipline:** set per-task rates *above* the retainer-equivalent so the retainer
> is always the better deal. The menu should nudge clients toward recurring.

---

## 4. Buyout / Migration Fee (one-time exit)

Transfers a **single-tenant fork** of the client's site into their full ownership and control
(mechanics: Operations Manual §12).

**Price it against the recurring revenue you give up — not just the labor.**

```
Buyout fee  =  migration labor  +  (N months × monthly operate fee)
```

- Suggested `N` = **12–24 months**. This compensates lost recurring revenue and makes buyout a
  deliberate decision, not a way to dodge the monthly fee.
- **Migration labor** = the §12 carve-out work (fork, strip, account/domain/media/auth transfer, secrets rotation, runbook, training).
- **License:** perpetual license to the single-tenant fork for the client's own site; **no resale/sublicense**. Platform core excluded.

**What's included in a buyout:**
- Single-tenant repo (transferred to client's GitHub)
- Hosting transferred / redeployed to client's account
- Domain cutover to client's own domain
- Media in client's own Cloudinary
- Auth users re-provisioned; all secrets rotated to client
- Client-specific runbook + training
- **Transition window** (e.g. 30 days "we fix what breaks")

**After the window:** optional ongoing support contract, or per-task. (Many buy out for
control but keep CSTECH on call — that's continued revenue.)

---

## 5. Contract structure (brief for legal)

- **MSA (Master Services Agreement)** — governs the overall relationship, IP ownership, liability, the IP boundary.
- **Per-client SOW (Statement of Work)** — build scope, deliverables, timeline, fees.
- **Operate addendum** — retainer plan or per-task terms, response times, scope of "admin/webmaster."
- **Exit / buyout terms — put them in the ORIGINAL contract**, not negotiated at exit:
  - the buyout formula (§4), what's included, the transition window
  - the single-tenant license terms + the platform-core exclusion
  - access-revocation timeline and data-handling on decommission
- **IP/licensing clause (critical):** CheeseShop TECH retains all platform IP; client receives
  a limited license to their single-tenant fork only.

> **Reminder, Rick:** define buyout terms up front. Negotiating an exit while a client is
> already leaving is the worst possible time — pre-agreed terms keep it clean and protect the
> platform IP.

---

## 6. Open decisions (set in the new Project)

- [ ] Real numbers for every `$___` placeholder (from your cost basis + market).
- [ ] Build-fee tier definitions (the exact SKU/integration thresholds).
- [ ] Retainer hour buckets + overage policy.
- [ ] Buyout multiplier `N` (12 vs 18 vs 24 months).
- [ ] Post-buyout support contract offering + pricing.
- [ ] Discount policy (annual prepay on retainer? multi-year?).

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
