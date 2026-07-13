# SDD — Template tenant · Client onboarding kit · Agent roster

**Round opened:** 2026-07-02 · **Surface:** Cowork · **Branch:** `phase-2-6-build`
**Companion docs:** `PLATFORM_SIDES_SPEC.md` §2 (onboarding flow this implements),
`HOUSE_CONSOLE_SPEC.md` (importer/checklist build order), `CONTENT_ENGINE_WIRING_SPEC.md`
(Studio Director — the Content agent's substrate).

---

## Part 1 — Template tenant ("the clone")

**Goal:** every app Monti has, as a content-free tenant that (a) is the literal copy-source for
new clients and (b) renders live in the platform so empty states can be QA'd and shown to
prospects.

### 1.1 What ships
| Piece | Path | Role |
|---|---|---|
| Full clone config | `config/clients/_template.json` | Upgraded from bare stub → full Monti-shaped config: all modules, all six tools, home block, empty presentations. Placeholder `id`/`subdomain` — still skipped by registry + validator (by design). |
| Empty data set | `src/data/_template/*.json` | One empty-but-**schema-valid** file per canonical seam: `client.config.json`, `catalog.json`, `inventory.json`, `commitments.json`, `images.json`, `brand-kit.json`, `attention.json`, `signals.json`, `market-news.json`. These files ARE the target shapes the onboarding kit maps into. |
| Live demo tenant | `config/clients/demo.json` + `demo:` entries in the seam libs (`pricing.js`, `images.js`, `brandKit.js`, `attention.js`, `signals.js`, `market-news.js`) pointing at `_template` data | `?client=demo` / `demo.cheeseshoptech.com` → the whole portal with zero content. Doubles as the prospect showroom. |

### 1.2 New-client procedure (after this round: ~15 min, zero component code)
1. `cp config/clients/_template.json config/clients/<id>.json` → set id, subdomain, brand, crm.
2. `cp -r src/data/_template src/data/<id>` → set `clientId`/`tenant` fields.
3. Register `<id>` in the six seam maps (mechanical — same one-line pattern each).
4. `npm run validate:clients` → commit → Cloudflare CNAME → passcode env var.
5. Fill data via the onboarding kit (Part 2). Apps light up as files fill.

---

## Part 2 — Client onboarding intake kit

**Goal:** the client's team hands us data in formats we can pipe straight into the tenant files,
without us re-keying anything. One template per department, one instruction sheet for the whole
team. Lives in `onboarding-kit/` (client-facing) + `docs/CLIENT_ONBOARDING_GUIDE.md` (internal).

### 2.1 Who fills what
| Audience | Deliverable | Format | Feeds |
|---|---|---|---|
| Inventory / ops manager | `01_Product_Catalog_and_Pricing.xlsx` | xlsx (one row per SKU: item number, name, category, pack, weight, UPC, FOB price, shelf life, origin, tier pricing) | `catalog.json` + `client.config.json` pricing block (items importer, House Console #2) |
| Inventory / ops manager | `02_Inventory_Availability.xlsx` | xlsx (SKU, lot, expiry, cases on hand, incoming ETA) — same shape `sync-inventory.mjs` already parses | `inventory.json` (weekly cadence, Netlify Blobs path — no rebuild) |
| Inventory / ops manager | `03_Standing_Orders_Commitments.xlsx` | xlsx (customer, SKU, cadence, cases/period, reorder floor) | `commitments.json` |
| Design team | `04_Brand_Asset_Checklist.md` | checklist + file-format rules (SVG/AI logo, hex/PMS colors, licensed fonts, brand guide PDF, photography ≥3000px with the 12-tag usage taxonomy pre-mapped) | `brand-kit.json` identity/imagery + Cloudinary folder (bulk-tag tool, House Console #3) |
| Marketing dept | `05_Marketing_Content_Worksheet.docx` | Word worksheet (voice: hook/motto/values/avoid-list; story blocks by audience; campaign calendar; existing collateral inventory) | `brand-kit.json` voice/storyBlocks + Campaigns |
| Everyone | `00_README_Client_Team.md` | cover sheet: who fills what, accepted formats, naming rules, where to send | — |

### 2.2 Format rules (stated on every template)
Spreadsheets: **.xlsx** (or Google Sheets export) — never PDF price lists; one row per SKU; no
merged cells; headers untouched. Logos: **SVG or AI** + transparent PNG. Photos: original
resolution, **JPG/PNG/TIFF**, named `<itemnumber>_<descriptor>` when product-linked. Documents:
**.docx** on the provided worksheet — not free-form.

### 2.3 Import path today vs. later
Today: Claude-assisted — client file lands, we run/extend `scripts/sync-inventory.mjs` (built) and
a new `scripts/import-catalog.mjs` (this round if time allows; otherwise next). Later: House
Console items-importer UI + onboarding checklist (build order #2/#4) makes it self-serve.

---

## Part 3 — Agent roster (scope expansion)

**Concept:** each agent = a skill/prompt layer over an existing deterministic engine + tenant
data seams. Agents never own data; they read the canonical files and write through existing
update paths. Build order follows data-readiness — an agent without its data seam is a demo, not
a tool.

### A1 — Content / Design Engine Agent
- **Substrate:** Studio Director (CONTENT_ENGINE_WIRING_SPEC §3). **Stage 0 (deterministic
  slot-resolver) must be built first** — it was already teed up as the highest-leverage build.
- **Reads:** `brand-kit.json` (paint + voice + story blocks), `signals.json` (angles),
  `images.json`/Media Hub (imagery), `catalog.json` (products).
- **Does:** composes on-brand slides/social/sell-sheets from a one-line brief; enforces voice
  avoid-list; proposes variants per Theme Engine register; routes output → Content Library.
- **Data gap:** none — all seams live. **First agent to ship.**

### A2 — Pricing & Quoting Agent
- **Substrate:** `pricing-core.js` (deterministic math stays in the engine; agent explains,
  validates, drafts).
- **Reads:** `catalog.json`, `client.config.json` (tiers/freight/fees), `inventory.json` (lots).
- **Does:** natural-language quote requests → proforma drafts; enforces house rules (shelf-life
  <4 mo flag, $135 processing under 1,500 lb, $0.30/lb trucking floor, class-of-trade margins);
  flags margin erosion before a quote leaves.
- **Data gap:** real class-of-trade %s still pending Sales Management (placeholders in config).

### A3 — Inventory & Replenishment Agent
- **Substrate:** `forecast-core.js` (movement report) extended with reorder logic.
- **Reads:** `inventory.json` (lots/expiry), `commitments.json` (standing demand), movement.
- **Does:** weekly replenishment brief — reorder points per SKU, expiry-risk list (sell-through
  vs. shelf-life), container/consolidation suggestions; drafts the reorder for approval.
- **Data gap — the big one:** **sales history.** Commitments give committed demand, not actuals.
  Needs an order-history feed (Shopify orders seam and/or a monthly sales export template — add
  `06_Sales_History.xlsx` to the onboarding kit). Forecasting without history = guessing.

### A4 — Sales Projection & Production Planning Agent
- **Substrate:** A3's forecast + goals layer.
- **Reads:** sales history (same gap), pipeline (HubSpot deals — currently empty), campaign
  calendar, sales goals (new small file: `goals.json` per tenant — targets by channel/quarter).
- **Does:** goal → projected demand curve → production/purchase requirements back to the
  producer (client-facing: "to hit $X in Q4, order Y wheels by August"); ties campaign lift
  assumptions into the curve.
- **Deps:** A3 shipped, HubSpot deals wired, `goals.json` defined. **Build last, worth most.**

### A5 — Campaign Planning Agent
- **Reads:** `signals.json`, `market-news.json`, `goals.json`, campaign history, brand-kit voice.
- **Does:** quarterly campaign calendar proposals (angle, audience, channel, SKUs, target lift);
  hands briefs to A1 for asset production; closes the loop by reading campaign results back into
  A4's lift assumptions.
- **Deps:** A1 (asset production path) + goals. Ships alongside A4.

### Build order
1. **Studio Director Stage 0** → **A1 Content Agent** (all data ready today).
2. **A2 Pricing Agent** (engine ready; placeholder %s acceptable to start).
3. **Sales-history intake** (kit template 06 + Shopify orders seam) → **A3 Replenishment**.
4. **`goals.json` + HubSpot deals** → **A4 Projection/Production** + **A5 Campaign Planning**.

---

## Round status
- [x] SDD (this doc)
- [ ] Part 1 — `_template.json` upgrade + `src/data/_template/` + `demo` tenant wired
- [ ] Part 2 — `onboarding-kit/` (00–05) + `docs/CLIENT_ONBOARDING_GUIDE.md`
- [ ] Part 3 — discussion → agent build rounds (separate sessions per agent)
