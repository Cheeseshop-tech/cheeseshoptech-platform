# Data integrity remediation — living plan

**Status:** open · **Owner:** Rick · **Opened:** 2026-09-25

> This is a LIVING doc, deliberately undated in its filename. Tick items as they ship.
> **Delete this file when the list is empty.** It is not a handoff or a snapshot — do not
> archive it, do not write a successor. The review that produced it is summarized here in
> full; there is no second document to find.

---

## Verdict

Yes on both counts. The drift is real and the accuracy loss is measurable — but neither is
caused by neglect. They are caused by one structural property of how the system grew:

**Gates are attached to paths, not to stores. So every store has one well-guarded path and
several unguarded ones, and the unguarded ones are the short ones.**

Everything below is a consequence of that sentence.

---

## Root cause 1 — the validation gradient is inverted

Validation should get *stronger* as data approaches the buyer. Here it gets weaker:

| Stage | Distance from buyer | Checks |
|---|---|---|
| `sync-inventory.mjs` `validate()` (`:350-396`) | furthest | **8** — SKU/lot floors, expDate present, per-lot case count, in-transit silent-zero guard, item-reference cross-check, diff-vs-previous |
| `publish-inventory.mjs` (`:40-47`) | middle | **0** — parses JSON, POSTs it |
| `inventory-publish.js` `validate()` (`:20-30`) | live store | **3** — schemaVersion, ≥80 SKUs, ≥80 lots |

The strongest gate is furthest from production **and is opt-in**: `--require-drive-meta`
(`sync-inventory.mjs:221-231`) is the only thing that blocks a hand-typed date from reaching
buyers, it appears in no `package.json` script, and its only caller is a scheduled task that
is currently disabled.

Three concrete consequences, all live today:

1. `node scripts/sync-inventory.mjs` with **no flag** writes the canonical `inventory.json`
   with zero validation and no backup (`:45` sets `OUT` to the canonical path, `:460` writes
   it). `validate()` lives inside the `--promote`/`--check` branch at `:430`. One forgotten
   flag replaces the buyer catalog's offline fallback with an unvalidated parse.
2. `publish-inventory.mjs --in <anything>` publishes that file. `src/data/montitrentini/inventory.NEW.json`
   — a scratch artifact dated **2026-07-25**, still git-tracked — passes the server validator.
   Two-month-old stock is one command away from live.
3. Nothing anywhere asserts freshness. No check says "`lastUpdated` is within N days of today."
   A disabled scheduler, a stuck gate, and a healthy pipeline all look identical from the app.

## Root cause 2 — N writers, 1 gate

| Store | Writers | Gated writers |
|---|---|---|
| `inventory.json` | 2 (`sync-inventory.mjs` promote path + default `--out` path) | 1 |
| `images.json` | 3 (`sync-images.mjs`, `match-photos-to-items.mjs:131`, `reassign-asset-code.mjs:144`) | 1 — only `sync-images.mjs` applies `gatedCode()` |
| Cloudinary tags/context | 3 callers of `media-update.js` | 0 complete — `:62-63` **replaces tags and context wholesale**, so any caller that omits a field destroys it |
| Blobs `inventory` | 1 endpoint, any file | weaker than the file path |

The `media-update` case is the sharpest: `gatedCode()` requires the `product-catalog` tag, and
`media-update.js:62` replaces tags wholesale. A Media Hub edit that doesn't re-send `usage`
drops that tag; the next `sync:images` sets `code: null`; the SKU's photo silently vanishes
everywhere. No error, no audit entry. `match-photos-to-items.mjs` has the same shape for
`bgRemoved` — a successful run clears the `bg-removed` tag and images start rendering with a
forced white pad.

## Root cause 3 — knowledge is append-only

`docs/` has 124 markdown files, 20,973 lines, against 28,701 lines of code — a 0.73:1 ratio.
**60% (74 files) haven't been touched in 30+ days. 47.6% carry a date in the filename**, i.e.
they are snapshots, not references. September produced 24 dated docs in 25 days; July produced
22 in the whole month. The rate is accelerating.

There is no index. `CLAUDE.md`'s routing table names ~20 of 124 docs; the other **84% are
reachable only by guessing a filename**.

This matters more here than in a normal codebase because **`CLAUDE.md` is the first thing every
agent session reads.** Of six factual claims spot-checked in it, two are clean, one is partial,
three are wrong:

| Claim | Reality |
|---|---|
| `CLAUDE.md:100-102` — improvement review "inert until Rick creates the sidecar" | Sidecar created 2026-09-18 23:27. Task has run weekly since; committed today (`8adf706`). |
| `CLAUDE.md:54-55` — `imageForCode` has four consumers: Catalog, Proposals, Pricing, Studio Director | **Catalog and Studio Director are not consumers.** `buyer-catalog.jsx:96` builds its own map; `studio-director.js:18` uses `pickAsset()`. `quote-builder.jsx:919` is a 5th consumer not listed. |
| `CLAUDE.md:135-137` — only `imageForCode()`/`codeImageUrl()` resolve a SKU's photo | **Three independent resolution paths in production.** |
| `CLAUDE.md:150` — "write path is the Media Hub UI only, never a direct Cloudinary API/MCP call" | `docs/HANDOFF_2026-09-17_agent-cloudinary-writes-bypass-audit-log.md:3` — *"Status: ⚠️ KNOWN GAP, not fixed."* ~54 deletions + 5 uploads already bypassed it. Prose-only rule, no enforcement. |

That is the drift engine: stale context → agent builds on a wrong assumption → agent writes a
new doc recording what it did → doc count rises, average accuracy falls → next agent is worse
informed. It compounds, and it compounds faster the more you build.

---

## A. Accuracy — what is actually wrong right now

**No two of the four SKU rosters agree.** Exact set arithmetic:

| Pair | Overlap | Only in A | Only in B |
|---|---|---|---|
| catalog (108) vs inventory (114) | 96 | 12 | 18 |
| catalog (108) vs item-reference (114) | 97 | 11 | 17 |
| inventory (114) vs item-reference (114) | 112 | 2 | 2 |
| catalog (108) vs pricelist-live (95) | 95 | **13** | 0 |

- **`item-reference.json` — the inventory validator's own reference — is hand-maintained and
  already 4 codes out of step** with the sheet it gates (`05035`, `20568` missing; `0911`,
  `20567` gone). Drift there produces a warning (`sync-inventory.mjs:390`), not a failure, so
  the gate erodes quietly.
- **`catalog.json` carries 13 codes the self-declared CANONICAL price list does not.** The
  pricelist's `authority` field says it "outranks catalog.json on any disagreement about item
  number, name, pack, or price." Both cannot be right; nothing checks.
- **`01174` is one item number for two different products at two different prices.** The price
  list prints "Smoked Provolone **Wedge**" at `exwPiece 3.79` and "Smoked Provolone **Disc**" at
  `3.52`, sharing item number *and* UPC. `catalog.json:1986` carries only the Wedge. **Anyone
  quoting the Disc quotes 7.6% high**, and `imageForCode("01174")` can't tell them apart either.
  This is a live commercial error, not a theoretical one. → **verify with Stefano.**
- **`04108` is a live join key for a product that does not exist** — the invented SKU documented
  at `reassign-asset-code.mjs:17-19`. Still in `images.json`.
- **27 codes have 2–3 assets, and `imageForCode()` returns the first match** (`images.js:48-52`).
  Which photo wins is decided by Cloudinary listing order. The `kind !== "document"` filter added
  2026-09-18 stops spec sheets winning; nothing orders the remaining photos.
- **51% of catalog SKUs (55 of 108) have no coded photo** in the manifest.
- **Case count is stored in 4 places; product name in 6–7**, with four independent
  implementations of the same "items name wins, catalog is fallback" precedence rule
  (`use-items-doc.js:3`, `proposals.js:135`, `studio-director.js:85`, `pricing-tool.jsx:37`).

**Adding one SKU end-to-end touches 10 files** across 4 systems, in a load-bearing order that
is written down nowhere. `npm run validate:items` — which `CLAUDE.md:149` presents as *the* gate
— reads 4 of those 10. It covers 40%.

## B. Operational — two things to act on today

1. **`monti-inventory-watch` is disabled** (`enabled: false`, last ran 2026-09-24). The only
   pipeline that touches the buyer-facing catalog is not running. Docs still assert it is:
   `docs/DATA_UPDATES.md:124` and `docs/DASHBOARD_AUTO_UPDATE_ARCHITECTURE.md:67`.
2. **`weekly-improvement-review` is enabled, ran today, and depends on it.** Its SKILL.md:18
   computes shelf-life "from the live inventory, *kept current by the daily monti-inventory-watch
   task*." That premise is false. It publishes expired/urgent/at-risk counts with a green exit 0
   from whatever is on disk. **Wrong data, published successfully, by a healthy automation.**
   That is the worst failure shape in the system, and it is running weekly.

**Inventory is the only one of five publish pipelines with no failure email.** The other four
(market news, signals, priority, improvement review) email on failure. Inventory — highest
stakes — reports to a chat transcript. It sat blocked for two consecutive days (23rd, 24th)
and the only reason it surfaced is that you happened to read the transcript.

Precedent, from the repo's own notes: `daily-news-watch/SKILL.md:29` — the market news card
*"silently stopped updating on 2026-09-01 for exactly this reason, for 17 days, unnoticed."*
The fix was the email step. Inventory never got it.

Also: `inventory.js:44-47` turns a Blobs failure into **HTTP 200** with a silent fall back to
the bundled file, and `_sentry.js:67` only captures on `>= 500`. A Blobs outage is invisible.

---

## C. Remediation, ranked by (damage prevented ÷ effort)

### Do this week

- [ ] **Re-enable `monti-inventory-watch`, or decide out loud that it's manual.** If manual,
      fix the two docs that claim otherwise and the improvement-review premise.
- [ ] **Add a failure email to the inventory task**, copying the block from
      `daily-news-watch/SKILL.md:134-156`. One paste. Closes the "blocked for two days,
      nobody knew" hole.
- [ ] **Delete `src/data/montitrentini/inventory.NEW.json`.** July scratch file, git-tracked,
      passes the live validator. Flagged in `BUILD_LOG.md:1226` two months ago.
- [ ] **Make the unvalidated write impossible.** In `sync-inventory.mjs`, refuse to write when
      `OUT` resolves to the canonical path unless `--promote` was passed. Three lines.
- [ ] **Fix the three wrong `CLAUDE.md` claims** (improvement-review inert; `imageForCode`
      consumer list; "only `imageForCode` resolves photos" — state plainly that there are three
      paths and one is the target). Highest-leverage edit in the repo: every agent reads it first.

### Do this month

- [ ] **Move `validate()` behind the publish endpoint.** Import the same checks into
      `inventory-publish.js` so the server gate is not weaker than the local one, and have it
      reject `lastUpdatedSource !== "drive-modifiedTime"`. That rule currently exists only as
      English prose in a SKILL.md. Un-inverts the gradient.
- [ ] **Add a freshness assertion** — publish fails if `lastUpdated` is older than 10 days or in
      the future. Catches disabled schedulers, stuck gates, and typo'd banners with one check.
- [ ] **Make `gatedCode()` the only way to set `code`/`sku` in the manifest.** Have
      `match-photos-to-items.mjs` and `reassign-asset-code.mjs` call it. Removes the
      appear/disappear-on-next-sync class.
- [ ] **Make `media-update.js` merge tags rather than replace**, or require callers to send a
      complete tag set and reject partial ones. Removes the silent photo-unlink class.
- [ ] **Resolve `01174`.** Two products, one number, one UPC. Commercial, not technical — needs
      Stefano. Until then nothing in code enforces the `blocked` flag the price list already carries.
- [ ] **Pick one owner for price and enforce it.** Either `catalog.json` stops carrying prices
      and derives from the pricelist, or the pricelist is demoted. Today both claim authority
      and 13 codes disagree. One script that diffs them and exits non-zero would do until then.
- [ ] **`--max-warnings=0` on lint.** `exhaustive-deps` is currently `warn` and the build stays
      green — despite `eslint.config.js:7-9` naming it as covering the crash class it was
      written for.

### Do when it stops being fun

- [ ] **Docs amnesty.** Move `docs/design-references/` (153 vendored files, 51% of the folder)
      out of `docs/`. Prefix the 74 stale files `ARCHIVED_` or delete them. Add `docs/INDEX.md`.
      Afterward ~47 fresh docs remain and can be trusted — which is the whole point.
- [ ] **Update `DATA_OWNERSHIP_MAP.md`** (72 days stale, names the wrong pricing authority, and
      mentions the canonical pricelist zero times). It is the doc that exists to answer "which
      file owns this fact," and it currently answers wrong.
- [ ] **One command to add a SKU**, or at minimum a checklist in the repo, since it's 10 files
      in a specific undocumented order.

---

## Trade-offs — what I am deliberately NOT recommending

- **Not a database.** JSON-in-git gives free history, diffs, and offline fallback, and the
  volume (108 SKUs) doesn't justify the operational weight. The problem is uncontrolled writes,
  not the storage medium.
- **Not CI.** There is no `.github/` and no `.husky/`, and for a single maintainer that is a
  defensible choice — CI you don't watch is theater. Making the *scripts* refuse to do the wrong
  thing is strictly better than a pipeline that emails about it afterward.
- **Not a rewrite or a consolidation of the four data sources.** The four-way split has real
  reasons (different editors, different authorities, different update cadences). The cost isn't
  the split — it's that two of the four have their rationale recorded *only inside their own
  JSON `_comment`/`authority` string*, and that nothing checks them against each other.
- **Not more documentation.** The doc-to-code ratio is already 0.73:1. Code comments are 25%
  density and current; `docs/` is stale. Knowledge has already migrated into the code. Follow it
  — don't fight it.

## What to revisit as this grows

- **Second tenant.** `src/lib/pricing.js:7,11` statically imports
  `@/data/montitrentini/catalog.json` and `@/data/demo/catalog.json` into the bundle. That breaks
  as a multi-tenant model the moment tenant #2 is real.
- **`schemaVersion` is asserted in exactly one place** (`inventory-publish.js:23`).
  `_template/inventory.json` ships `"1.0"`, which that assert would 422 — so a new tenant seeded
  from the template cannot publish. Fix when you onboard, not before.
- **Typed image series.** `docs/IMAGE_PIPELINE_SPEC.md:94` still reads "(not started)" and is
  41 days old. Fine — but `CLAUDE.md:56` presents it as the active plan of record. Either start
  it or mark it deferred; right now it reads as in-flight to every agent.

## What is genuinely working

Worth saying, because the list above is long. **Zero dead code. Zero orphaned TODOs. 25% live
comment density.** The `prebuild` lint gate exists and catches the exact class that caused the
last crash. ADRs started three days ago. `DATA_OWNERSHIP_MAP.md` flags its own prior staleness
and its own known duplication — that is unusually honest engineering.

And **the guards worked.** The in-transit silent-zero guard blocked two bad promotes on the 23rd
and 24th and refused to ship a catalog claiming nothing was on the water. That guard was written
for the `#60` marker and caught a `60*` marker it had never seen. The system caught its own
regression. The only thing missing was a way to tell you.
