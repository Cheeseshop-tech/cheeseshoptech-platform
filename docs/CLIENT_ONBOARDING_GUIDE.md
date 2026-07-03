# Client onboarding guide (internal)

**The house-side runbook.** Client-facing kit = `onboarding-kit/` (files 00–06). This doc maps
each returned file to the tenant data layer and lists the exact steps. Companion:
`ONBOARDING_AND_AGENTS_SDD.md` (this round's spec), `PLATFORM_SIDES_SPEC.md` §2 (the 5-step
flow this implements), `HOUSE_CONSOLE_SPEC.md` (the future self-serve UI for steps 3–5).

## Step 0 — Stand up the tenant (~15 min, config only)

1. `cp config/clients/_template.json config/clients/<id>.json` — set `id`, `subdomain`, `brand`
   (name/colors/fonts), `crm` (`hubspot` or `none`), `cloudinaryFolder: clients/<id>`, home copy.
2. `cp -r src/data/_template src/data/<id>` — set `clientId`/`tenant` fields in each file.
3. Register `<id>` in the six seam maps (one import + one BUNDLES line each — copy the `demo:`
   pattern): `src/lib/pricing.js`, `images.js`, `brandKit.js`, `attention.js`, `signals.js`,
   `market-news.js`.
4. `npm run validate:clients` → commit via commit-script → push.
5. Cloudflare: CNAME `<subdomain>` → `cheeseshoptech-platform.netlify.app` (DNS-only).
   Netlify: add domain alias + set `PORTAL_ADMIN_PASSCODE_<TENANT>`.
6. Verify: `https://<subdomain>.cheeseshoptech.com` renders the empty portal (compare against
   `?client=demo` — the reference empty state).

## Step 1 — Send the kit

Send `onboarding-kit/` (all seven files) to the client lead with the owner table in
`00_README_Client_Team.md`. Ask for 02 (inventory) weekly from week one — the habit matters
more than the first file.

## Step 2 — Ingest as files return (any order)

| Returned file | Target | How |
|---|---|---|
| 01 Catalog & Pricing | `src/data/<id>/catalog.json` products[] + `client.config.json` pricing block | Claude-assisted transform (products sheet → product/sku records; Pricing Rules sheet → tiers/volumeBreaks/freight). Future: `scripts/import-catalog.mjs` + House Console importer. |
| 02 Inventory | `src/data/<id>/inventory.json` | Save export to `src/data/<id>/source/availability_<date>.csv` → adapt `scripts/sync-inventory.mjs` (Monti column map is client-specific; generic template = SKU Summary + Lot Detail sheets). Weekly: publish via Netlify Blobs path (no rebuild — see `scripts/publish-inventory.mjs`). |
| 03 Commitments | `src/data/<id>/commitments.json` | Claude-assisted transform; ambiguous rows → `_needsReview`. |
| 04 Brand assets | Brand Kit identity/imagery + Cloudinary `clients/<id>/` | Upload originals to Cloudinary folder → `npm run sync:images` → tag per 12-tag taxonomy (bulk-tag tool). Colors/logo/type → `brand-kit.json` identity. Kit hex overrides config colors once set. |
| 05 Marketing worksheet | `brand-kit.json` voice + storyBlocks | Transcribe voice fields; each audience pitch → a storyBlock with `audience` tags. |
| 06 Sales history | `src/data/<id>/source/sales_history.*` (kept raw) | No app surface yet — this is the forecasting foundation for the Replenishment/Projection agents (SDD Part 3, A3/A4). Store raw, never trim. |

## Step 3 — Verify the lights come on

Per file ingested: Pricing & Inventory quotes a real SKU end-to-end (01+02) · expiry flags fire
on short-dated lots (02) · proposal builder renders on-brand with real imagery (04+05) ·
`?client=<id>` home stats are non-zero. Then hand the client their URL + passcode.

## Known gaps (build items)

- `scripts/import-catalog.mjs` — not built; 01 ingestion is Claude-assisted for now.
- Generic inventory parser — `sync-inventory.mjs` is Monti-column-mapped; generalize when
  client #2's format lands.
- House Console checklist UI (build order #4) — makes this doc self-serve.
- Contact address in `00_README_Client_Team.md` is Rick's personal email pending the
  **sending-address decision** — swap to the business address once it exists.
