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
Sheet refreshes weekly. A scheduled watch re-exports + regenerates + diffs and reports for review
(test-before-replace); it does not auto-promote or deploy. See scheduled task "Monti inventory watch".
