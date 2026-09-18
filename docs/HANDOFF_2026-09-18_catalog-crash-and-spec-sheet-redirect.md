# Handoff — 2026-09-18 — Buyer Catalog crash + Asiago Vecchio Scheda re-home

**For:** whoever picks this up next (Claude Code, or Rick reading back).
**Branch:** `phase-2-6-build`. **Commits today:** `c9d4324` → `9ad2e30` → `b86be67` →
`158d711` → `6f14080` → `a0615a8`. All pushed; working tree clean.
**Status: everything below is DONE and verified live.**

---

## 1. The live incident — Buyer Catalog was down (FIXED, needs commit + deploy)

**Symptom.** `montitrentini.cheeseshoptech.com` → Product catalog rendered the error boundary:
"Something went wrong on this page." The rest of the portal was fine. Reproduced in a browser;
console said:

```
ReferenceError: resolved is not defined
```

**Cause.** Earlier the same day a render-time gate was added to `buyer-catalog.jsx` so a code
that is not on the price list can never render a buyer-visible card — the fix for phantom item
`04108`. The `useMemo` was written inside `BuyerCatalog({ data, brandName, tenantId,
itemsFolder })`, which has **no `resolved` in scope**; `resolved` is the prop of the *parent*,
`CatalogPage`. JavaScript resolves that as a free variable, so it throws at render, not at
build. `npx vite build` stayed green the whole time. Nothing in the pipeline caught it.

**Fix.** `useMemo` moved up into `CatalogPage` (where `resolved` is the prop); the resulting
`Set` is passed down as a `realSkus` prop. `BuyerCatalog` now defaults it to `new Set()`, so a
caller that omits it degrades to "show everything" instead of throwing on `.size`.

**State: SHIPPED** in `a0615a8` and verified on the deployed site — the Product Catalog renders
107 items across all eight category filters. Confirmed by opening the page, not by reading the
diff (see §4.4 for why that distinction is the whole lesson).

**The lesson worth keeping.** A guard that fails closed took down the page it was guarding.
Two follow-ups are open (§4): the build does not catch free variables, and nothing alerted us —
Sentry recorded the error (the boundary says so) and it sat unnoticed until Rick opened the page.

## 2. The Asiago Vecchio Scheda re-home (DONE — live + committed)

`monti/03073-specsheet` was tagged to item `03073`, the Cut & Wrap 7 oz Exact Weight Wedge
(12/case, 150-day shelf). The document itself describes **1 per carton, 360-day shelf life, EAN
part number 2003003** — that is item `03003`, the 16–18 lb whole wheel.

The document was never wrong. It was filed against the wrong item because the file is named
`03073-specsheet.pdf` and something read the filename as an item number — the same defect class
that invented `04108`.

Re-homed to `03003` via `scripts/reassign-asset-code.mjs`. Live Cloudinary context and the repo
manifest both updated; commits `b86be67`, `158d711`, `6f14080`. **Verified on the live catalog:**
the `03003` card reads "Asiago Vecchio DOP whole wheel · 16-18 lbs · 1 wheel per case · Minimum 10
months aged · 1 spec sheet". The `03073` card carries no spec sheet, as intended.

Consequences:
- `03003` now holds the **first whole-wheel Scheda on file** (all 71 whole-wheel line items had
  none). Mild argument for pulling the whole-wheel tranche request forward.
- `03073` now has a photo and no spec sheet — the honest state. Its own sheet is §1 of
  `docs/CLIENT_DATA_REQUEST_2026-09-18_spec-sheets.md`, reworded from "replacement" to
  "addition" so Monti is not told they sent a bad file.

## 3. New tooling added today

| Thing | What it is |
|---|---|
| `scripts/reassign-asset-code.mjs` | Re-homes one asset onto a different item number through the Media Hub's authenticated, audit-logged path (`media-list` read → `media-update` write). Refuses any destination code `catalog.json` does not carry. Reads current state first, because `media-update` replaces tags and context wholesale — skipping that read silently strips approval state and usage tags. Dry-runs by default; `--apply` writes. |
| `scripts/validate-item-standards.mjs` | `npm run validate:items`; `--live` hits the real Media Hub item store. Rule 1 (a code is real only if the price list carries it) + Rule 2 (spec-line format). |
| `VALIDATE ITEMS LIVE.command` | Passcode read with `read -r -s` so it never reaches chat, repo, or shell history. |

## 4. Open items

1. **A free variable should not reach production.** There is no linter in the pipeline. ESLint
   with `no-undef` (or `eslint-plugin-react-hooks`) in CI would have caught this at the commit.
   Worth costing out — this class of bug is invisible to `vite build` by design.
2. **Sentry recorded the crash and nobody knew.** The error boundary says "the error has been
   recorded". Check whether Sentry alerting is actually wired to somewhere Rick sees.
3. **A smoke check before declaring done.** Today's work was verified by reading files and
   diffs; the page itself was never opened until Rick found it broken. Opening each touched
   route once would have caught it in seconds.
4. **`.command` buttons that fail silently.** Two separate incidents today: a `set -e` abort that
   looked like success, and a commit guard that checked only *unstaged* changes and so reported
   "nothing to do" while a staged change sat waiting. Both now print a real error and both are
   logged. Any new button should follow that pattern.
5. **Still pending from before today:** the Media Hub write queue (create `20579` / delete `tbd`;
   name or delete the `04108` and `01114` records; re-tag `30014-back`/`30015-back`), the
   spec-sheet request to Stefano (drafted, not sent), and `20579` + `40184` on the availability
   sheet.

## 5. Process note

Most of today's lost time was not the code. It was asking Rick to double-click `.command`
windows that closed and took their output with them, so failures had to be guessed at. The
redirect button now tees everything to `_archive/logs/` (gitignored). **Any button that can
fail should log.** That single change turned a twenty-minute loop into one read.

---

## 6. Start here (for Claude Code)

Read in this order, then pick from §4:

1. `docs/PRODUCT_ID_AND_IMAGE_TRUTH_2026-09-18.md` — why item number is the only join key.
2. `docs/PRODUCT_NAMING_STANDARD_2026-09-18.md` — names vs. descriptors; Rick's four standards.
3. `docs/GAP_LISTS_2026-09-18.md` — what is missing per item.
4. `docs/CLIENT_DATA_REQUEST_2026-09-18_spec-sheets.md` — the Monti ask, drafted, **not sent**.
5. `scripts/validate-item-standards.mjs` — the gate. Run `npm run validate:items` before creating
   any code, tag, or item record anywhere.

**Non-negotiables in this repo** (learned the hard way, some of them today):

- **A filename is not an item number.** `catalog.json` is the only authority on whether a code is
  real; the live customer price list is the authority behind it. Phantom `04108` and the
  misfiled `03073` Scheda both came from parsing a number out of a filename.
- **Never regenerate `src/data/montitrentini/items-seed.json`.** It carries hand-curated per-SKU
  names and the 2026-08-28 aging pass that `build-items-seed.mjs` cannot reproduce. Edit it
  surgically. Running the generator once already destroyed curated data this month.
- **Media asset edits route through the Media Hub**, never a direct Cloudinary API or MCP call —
  only that path is authenticated and audit-logged. `media-update` REPLACES tags and context
  wholesale, so always read current state first or you will silently strip approval and usage.
- **Every code change gets a `COMMIT <FEATURE>.command` button**; never leave Rick to hand-commit.
  Archive the button to `_archive/one-time-scripts/` once it has run.
- **Any button that can fail must `tee` to `_archive/logs/`** and print a real error instead of
  closing on a keypress. Both of today's dead ends were invisible failures.
- **Open the page before saying it works.** `vite build` passing proves nothing about render.
