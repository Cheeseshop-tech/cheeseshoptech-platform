# Data Updates — current state + the Google Sheets plan

**Written:** 2026-06-13 · For Rick to think against. Nothing built yet beyond what's noted under "today".

## How data updates work RIGHT NOW (honest)

Manual, build-time. The numbers are bundled JSON in `src/data/montitrentini/`, generated from
source spreadsheets by adapter scripts, then committed + deployed:

| Data | File | Source spreadsheet | Freshness |
|---|---|---|---|
| Price list (SKUs, prices, case packs) | `catalog.json` | `2026 03 Price list ALL PRODUCTS.xlsx` | static |
| Availability (stock, lots, expiry, in-transit) | `inventory.json` | `Availability of items and pending orders-2026-06-04.xlsx` | **snapshot dated 2026-06-04** |
| Standing commitments | `commitments.json` | (same availability file) | static |
| Images | `images.json` (F5 manifest) | Cloudinary, via `scripts/sync-images.mjs` | re-syncable |

The old "drag and drop" = dropping the Excel in → adapter → JSON → commit → deploy. So inventory
only changes when someone re-runs that. The UI reads through a swappable seam
(`getPricingData`, `VITE_PRICING_BACKEND=mock`), so the SOURCE can change without touching the UI.

## The goal: pull availability live from Google Sheets

Sheet "availability of items" in **sales@montitrentini-usa.com**. Same pattern as the image sync.
Two ways, pick one:

- **Scheduled / on-demand sync** — a script (`scripts/sync-inventory.mjs`, sibling of `sync-images`)
  reads the Sheet → regenerates `inventory.json` → redeploy. Can run automatically each morning.
  Simplest; no live API in production.
- **Live pull** — a Netlify function reads the Sheet on each load (cached a few minutes), behind the
  existing `getPricingData` seam (`VITE_PRICING_BACKEND=sheets`). Always current, no redeploy when the
  Sheet changes. Closest to "live."

## Decisions for Rick (shape the build)

1. **How does availability get into the Sheet?** (manual entry / export from another system) — sets freshness.
2. **Sheet columns must map to:** SKU code · cases available · lots (lot# · cases · expiry) · in-transit cases · ETA. Same fields the Excel had — tidy columns make this trivial.
3. **Access (security):** share that ONE Sheet read-only with a Google service account, rather than
   granting Gmail access. Narrow + safe. (Alternative: a Google Sheets/Drive MCP connector — check the
   registry first; may be the fastest path.)
4. **Scheduled vs live** (above).

## Findings 2026-06-13 (connector check)

- **Google Drive IS connected** in Cowork — but to **rick.posada@gmail.com** (personal), NOT
  sales@montitrentini-usa.com where the "availability of items" sheet lives. So the current
  connection can't see that sheet yet.
- **The app's `inventory.json` was originally built from that availability sheet** (Rick) — so the
  sheet's columns already match the inventory shape. The mapping is essentially done; this is mostly
  a plumbing job.

## Two paths (decided: revisit after Rick's break)

- **Path A — Drive connector (no service account, works now).** Share the sheet from
  sales@ → rick.posada@gmail.com (or connect the sales account to Drive). Then Claude reads it and
  regenerates `inventory.json` on demand / on a morning schedule → deploy. Zero GCP, zero cost.
  Recommended for the pilot. NOTE: this is Claude/session-driven, not the live site pulling itself.
- **Path B — service account (Rick chose this earlier; the "graduate" version).** The DEPLOYED site
  pulls the sheet automatically, no session. Setup is in Google Cloud Console (Rick's to do: project,
  enable Sheets API, create service account, download key, share sheet with it); Claude builds the
  script that uses the key. Swaps into the same data seam later — A and B aren't mutually exclusive.

## First step (BLOCKED on Monti Trentini admin)
- **Blocker (2026-06-13):** Rick does NOT have edit/share access to the availability sheet — the
  **Monti Trentini admin must share it** (Viewer) to rick.posada@gmail.com (the connected account).
  This sidesteps the Google OAuth that kept failing (a plain share needs no authorization).
- Once shared: Claude reads it, confirms the column→inventory mapping, builds `sync-inventory.mjs`.
- Start with Path A (today); add Path B (live, hands-off) when ready.

## UNBLOCKED 2026-06-18 — Path A built and verified

The availability sheet was shared (Viewer) to the connected `rick.posada@gmail.com` Drive,
clearing the 06-13 blocker. Path A is now built and tested end-to-end:

- **Source export:** `src/data/montitrentini/source/availability_2026-06-18.csv` — the live sheet's
  first tab (summary cols A–G + lot detail cols I–Q side by side), exported via the Drive connector.
  Banner row carries "Updated on: 18 June 2026 16:47".
- **Transform:** `scripts/sync-inventory.mjs` — CSV → canonical `inventory.json` (schema v1.2).
  Run: `node scripts/sync-inventory.mjs --out inventory.NEW.json` (newest source CSV is auto-picked).
- **Verification (this run):** 112 SKUs, 122 lots parsed (== sheet lot rows), 40 sellable-now SKUs.
  `pricing-core.allocate()` consumes it correctly (FIFO by earliest expiry; fully-reserved lots
  yield 0). Lot math reconciles to the sheet headline (e.g. Grana 1/8 = 4×104 on-hand + 10×104
  in-transit = 1,456).
- **NOT yet promoted:** output written to `inventory.NEW.json`; original `inventory.json` untouched.
  Backup at `archive/backup_2026-06-18_before_inventory_sync/`. To go live: review NEW, then
  `mv inventory.NEW.json inventory.json`, commit, deploy.

### Dating the file — Drive edit log, never the banner (Rick, 2026-08-28)

The sheet's first row carries a hand-typed `Updated on:` banner. **It does not date the file.**
Google Drive's `modifiedTime` does — that is the sheet's real edit log, and it is what
`sync-inventory.mjs --require-drive-meta` writes to `lastUpdated` (with
`lastUpdatedSource: "drive-modifiedTime"`).

Why: the producer issues an official refresh roughly weekly and types the banner then, but
**corrections land between those official updates** without the banner being retyped. So the
banner routinely lags the true edit by a day or more. Dating from the banner means the live
catalog claims stock is fresher (or, per the 2026-07-25 incident, *newer than today*) than it is.

Operational consequences:
- A `SHEET BANNER DISAGREES WITH GOOGLE DRIVE` warning is **expected and routine** — a mid-week
  correction. Note both dates and carry on; it is not an anomaly to escalate.
- Each export writes a sidecar `availability_<date>.meta.json` recording the literal
  `driveModifiedTime`. That sidecar is the audit trail and is committed alongside the CSV.
- If the sidecar is missing/unreadable (exit 4), **stop — do not publish**. Publishing a
  banner-sourced date is the failure this whole guard exists to prevent.

### Mapping (sheet → inventory.json)
| Sheet column | inventory field | Notes |
|---|---|---|
| Item / Description | `code` / `name` | from summary; lot table fills any gaps |
| Cases Available (summary) | `casesAvail` | producer headline (≈ on-hand + in-transit − reserved); lots are the truth |
| Lot# · Receipt Date · Cases · Reserved · Net Available · Expiration | `lots[]` | MM/DD/YYYY receipt ⇒ `on_hand`; `ETA mm/dd` / `AIR FREIGHT` ⇒ `in_transit` |
| (derived) | `casesInTransit` | Σ in-transit lot cases |

### Caveats flagged
- In-transit lots: `expDate=null` (matches v1.2 / allocate excludes in-transit); month-year hint
  preserved in new `expMonth` field (display only).
- Summary "Cases Available" can differ from Σ on-hand lots — this is a **source-sheet** trait, not a
  transform bug (the headline folds in in-transit/reserved).
- Roster vs 06-04 snapshot: dropped `11111` (SAMPLES, synthetic), `02169`; added `30016`/`30017`
  (Apericheese Orange/White). Confirm `02169` is intentionally gone.

### Weekly automation
Sheet refreshes weekly. The "monti-inventory-watch" scheduled task (daily 08:10) detects a new drop,
regenerates, runs the integrity gate, and publishes LIVE (below) — no app rebuild.

## RUNTIME inventory (no rebuild) — 2026-06-18

Inventory used to be **bundled at build time** (`src/lib/pricing.js` imported `inventory.json`), so a
stock change required a full redeploy. It now loads at **runtime** so weekly drops update the live app
with zero rebuild. The bundled JSON stays as an instant, offline-safe fallback.

**Flow:** weekly Cowork sync reads the private sheet (Drive connector) → `sync-inventory.mjs --promote`
(integrity gate + backup + writes `inventory.json`) → `publish-inventory.mjs` POSTs it to
`/.netlify/functions/inventory-publish` → stored in **Netlify Blobs** → `/.netlify/functions/inventory`
serves it to the browser on next load. No GCP, no Netlify token (the write happens inside the site's own
function); auth is one shared secret.

**Pieces added:**
- `netlify/functions/inventory.js` — GET live inventory from Blobs (bundled fallback if empty).
- `netlify/functions/inventory-publish.js` — POST (secret-gated) → validates → writes Blobs.
- `src/lib/pricing.js` — `getPricingData` always returns the bundled base; `fetchInventory()` pulls live.
- `src/lib/use-pricing-data.js` — hook: instant bundled render, then hydrates live stock (Pricing tool shows "· live").
- `scripts/publish-inventory.mjs` — POSTs `inventory.json` to the publish function.
- Flag-gated by `VITE_PRICING_BACKEND` (default `mock` = bundled only; `function` = live). Verified: `vite build` green, 1654 modules.

### One-time activation (Rick)
1. In **Netlify env**: set `INVENTORY_PUBLISH_SECRET` = a long random string; set `VITE_PRICING_BACKEND=function`.
2. Create **`scripts/.inventory-publish.json`** locally (gitignored):
   `{ "url": "https://<your-site>/.netlify/functions/inventory-publish", "secret": "<same secret>" }`
3. `npm install` (picks up `@netlify/blobs`), then **deploy once** (this single rebuild ships the runtime loader + functions).
4. Smoke test: `npm run inventory:publish` → open the Pricing tool, header should read "stock 2026-06-18 · live".

After that, weekly updates are deploy-free: the daily task publishes new stock straight to the live store.
A malformed sheet is blocked twice (sync `--promote` exit 2, and the function's 422) — bad data can't go live.
