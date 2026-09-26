# Handoff — code review of the 2026-09-25/26 build

**For:** a reviewer (Claude Code or human) with no context from the session that built this.
**Written:** 2026-09-26, by the session that wrote the code. Treat its self-assessment as a lead,
not a verdict — two of its own claims were found false while writing this document.

---

## 0. Read these first

### 0.1 The Netlify build is BROKEN on origin until one commit lands
`63fe915` shipped `campaign-detail.jsx` and `campaign-state.js` importing `src/lib/lifecycles.js`,
which was never committed. Netlify: `[vite:load-fallback] Could not load src/lib/lifecycles.js`.

**Fix:** run `COMMIT LIFECYCLES.command` (repo root). It adds the missing file with everything it
belongs to, and it now refuses to commit a tree with unresolved imports. **Review against the tree
after that commit, not against origin as it stands.**

Root cause and the process fix: `CLAUDE.md`, the "commit button captures files when it RUNS" trap.

### 0.2 P0 — enrichment scoping loses data (`ef0414c`, LIVE)

`netlify/functions/campaign-enrichment.js` stores rows per campaign (`byCampaign`). On POST it
REPLACES every campaign scope the payload touches. The client (`campaigns-page.jsx` →
`saveEnrichment`) loads the FLAT `entries` view — one row per company, newest wins — and posts that
whole map back.

So: campaign A enriched X and Y; campaign B later enriched X. The flat view holds only B's X.
Any save re-posts Y tagged A, scope A is replaced with `{Y}`, and **A's row for X is gone**,
including its call-note history.

Reproduced against the real helpers, 2026-09-26:
```
before: campaign A holds X, Y
after:  campaign A holds Y
  DATA LOSS: campaign A row for X is GONE ("A: wants Asiago")
```

- **Not worse than before `ef0414c`** — the flat store it replaced lost that row too.
- **But `ef0414c`'s commit message claims** "data loss is stopped and every campaign's record is
  recoverable from byCampaign." **That claim is false.**
- **Why the 29 tests passed:** they exercise `seedScopes`/`flattenScopes` on hand-built scopes.
  None runs the real cycle — flat GET, client edit, full POST. That cycle IS the failure.
- **Reachable:** `ne-contact-enrichment` and `ace-fall-show-2026` both run a call console over
  overlapping NY/NJ accounts.

**Proposed fix (not yet built):** upsert per `(scope, companyId)` instead of replacing whole
scopes — a row the client did not send is never touched. Deletion becomes explicit: a company sent
with a fully-empty record removes it from THAT scope only. Extract the merge into an exported pure
function and test the actual GET → edit → POST cycle, including this exact two-campaign case.

**Deeper issue the fix does not solve:** the UI still shows the flat view, so editing company X
from campaign A's console shows B's row and re-tags it to A on save. That is the planned
"contract phase" (readers move to `byCampaign`), and it is the real fix.

---

## 1. Scope

| | |
|---|---|
| Range | `0ad41b9^..HEAD`, plus the pending `COMMIT LIFECYCLES` commit |
| Commits | 31 committed + 1 pending |
| Size | 83 files, +6655 / −2719 (committed); pending adds ~12 files |
| Branch | `phase-2-6-build` → Netlify staging |

```bash
git log --oneline 0ad41b9^..HEAD
git diff --stat 0ad41b9^ HEAD
```

---

## 2. What changed — six themes

| # | Theme | Key commits | Core files |
|---|---|---|---|
| 1 | Inventory integrity | `0ad41b9`, `bb49128` | `scripts/sync-inventory.mjs`, `netlify/functions/inventory-publish.js` |
| 2 | HubSpot read/write | `b66acba`, `f5f454e`, `e3e494b`, `63fe915` | `netlify/functions/crm-hubspot.js`, `crm-push.js` |
| 3 | People spine | `607fe7f`, `8b51416`, `e3e494b` | `src/lib/people-fields.js`, `docs/PEOPLE_DATA_OWNERSHIP.md` |
| 4 | Campaign storage | `ef0414c` ⚠, `087d142`, `63fe915` | `campaign-enrichment.js`, `campaign-state.js` |
| 5 | Campaign lifecycle UI | `4f0fc5f`, pending | `src/lib/lifecycles.js`, `campaign-stages.js`, `checklist-templates.js`, `campaign-detail.jsx` |
| 6 | Ship tooling | `7fc77ea`, `6dad22f`, pending | `DEPLOY TO STAGING.command`, `scripts/check-imports.mjs` |

Design records, in reading order:
`docs/PEOPLE_DATA_OWNERSHIP.md` → `docs/HUBSPOT_PROPERTY_SPEC.md` →
`docs/CAMPAIGN_FIELDS_SPEC_2026-09-26.md` → `docs/CAMPAIGN_UI_REDESIGN_2026-09-26.md` →
`docs/DISTRIBUTOR_CAMPAIGN_PHASES_2026-09-26.md` → `docs/DESIGN_PER_TYPE_LIFECYCLES_2026-09-26.md`

---

## 3. Review priorities, ranked by blast radius

**1. `campaign-enrichment.js` POST merge** — §0.2. Confirm the diagnosis, then the fix.

**2. `crm-push.js` — writes to HubSpot, the CRM of record. Not undoable from the app.**
- Unset people-spine fields must be OMITTED, never sent as `""` — a push must not blank a value
  set by hand in HubSpot.
- Re-validates against `people-fields.js` even though capture already did. Confirm nothing reaches
  HubSpot unvalidated.
- `relationship` is a separate company PATCH after company resolution — failure is recorded, not
  fatal. Right trade-off?
- **Rep pushes (`63fe915`) update existing contacts' `firstname`/`lastname` from the roster name.**
  Roster names come from HubSpot, so this should be a no-op — but it IS a write of names on every
  territory push. Worth a hard look.
- Company resolution uses `companyDomain` taken from the rep's work email. Verify it cannot attach
  a rep to the wrong company.
- Dry-run by default; nothing here was executed against the live portal (§5).

**3. `campaign-state.js` sanitizer.** Everything not allow-listed is silently dropped — the
failure class this whole build kept hitting. `STATUSES = ALL_STEP_IDS`; new `fields[]`;
`cleanRosterRep()` extracted with `territory[]` + `keyAccounts[]`. Is anything the UI sends still
dropped? **Does the client post the whole `entries` map here too?** If so, two tabs editing
different campaigns are last-writer-wins at document level — probably pre-existing, same shape as
§0.2.

**4. `src/lib/lifecycles.js`.** The `kind` abstraction (planning / live / closed) and the gate as a
LINE (`requiresReadiness`). The first draft had a hole — Execute reachable straight from Setup,
skipping the gate — caught and tested. Look for others. `normalizeStatus` must be total and
idempotent.

**5. `mergeCampaign` (`campaigns.js`).** Status now normalized per type. `templateFor` must be a
real import, not only a re-export — a missing local binding would throw on every campaign load.
Fixed and bundle-verified; confirm.

**6. `ace-fall-show-2026` retyped `enrichment` → `distributor`.** Verified on its SEED only: status,
ticks, call console, gate, close-out all correct, and the other four seeds unchanged. Its **live
Blobs state was never read** (§5). If Blobs holds a status or tick id this did not anticipate,
behaviour is untested.

**7. Tooling.** `check-imports.mjs` regex — multi-line imports, `export * from`, dynamic imports.
Confirmed to catch the real break and pass the last good commit, but not fuzzed.

---

## 4. Specific questions — where the author is least sure

1. **Accessibility regression, likely real.** `4f0fc5f` reorders sections with CSS `order` on a
   flex column. Visual order ≠ DOM order, so keyboard tab order and screen readers follow the old
   sequence. Acceptable, or re-render in sorted order?
2. **Distributor is the FIRST pill** (the landing tab). A UX call made without asking Rick,
   reasoned in `lifecycles.js`. Flag if it should not stand.
3. **`isEnrichment` keeps its name** in `campaign-detail.jsx` but now means "has a call console".
   Kept to avoid touching eight call sites. Rename?
4. **`CHANNELS` is still hand-copied** in `campaign-defs.js`. The same fix as the type list
   applies; deliberately left out of scope.
5. **Every commit button before `COMMIT LIFECYCLES` lacks `set -o pipefail`** and so cannot detect
   a failed commit. Still in the repo root. Retire or patch?
6. **The literal-status guard** (`scripts/test-lifecycles.mjs` §9) has one known false-positive
   shape: a field merely ENDING in `status` compared against a step name. Acceptable?

---

## 5. What was verified — and what was NOT

| Verified | How |
|---|---|
| 7 test suites green | `npm test` — lifecycles 165, stages 102, fields 38, repcard 30, scoping 29, + notes, freshness |
| Lint | `npm run lint` — 0 errors, 28 warnings, all pre-existing |
| Each touched file compiles | esbuild, per file |
| Each touched function bundles | esbuild `--bundle` — proves `netlify/functions` → `src/lib` imports resolve |
| **The whole app bundles** | esbuild on `src/main.jsx`, 4.9 MB — every cross-file import resolves |
| Ace retype, runtime | real seed through `mergeCampaign`, three stored-state scenarios |
| Import checker | catches the `63fe915` break; passes `HEAD~1` |

| **NOT verified** | Why |
|---|---|
| **`vite build` itself** | the authoring sandbox cannot empty `dist/` (FUSE mount). Netlify is the first real build. |
| **Any UI in a browser** | **none of the UI changes have been seen rendered.** Pickers, rep card, folding sections, next-action bar — all compile, none observed. |
| Any live HubSpot write via the new paths | no dry run executed against the portal |
| Live Blobs state | no read access from the sandbox |
| The enrichment POST cycle | the gap that hid §0.2 |

**The rendered UI is the largest unverified surface.** A reviewer with a browser should open a
distributor campaign, a generic email campaign, and the rep card before anything else.

---

## 6. How to verify

```bash
npm test                                  # 7 suites
npm run lint                              # expect 0 errors
node scripts/check-imports.mjs --head     # committed tree is complete
npm run build                             # the check the author could not run
```

In the browser, after deploy:
1. Campaigns lands on **Distributor Campaigns**; Ace Fall Show is there.
2. Ace: status **Setup**; rep roster near the top; header says **Start connecting** (disabled,
   naming what is outstanding); Call console and prospect list still present.
3. Any email campaign: looks and behaves as before.
4. Rep roster → **Open card**: territory checkboxes, key-account search, "Review & push" bar.
5. Push dry run shows **Role / Territory / Account** per row before anything is written.

---

## 7. Deferred, known debt

- **§0.2 enrichment fix** — next commit after `COMMIT LIFECYCLES`.
- **Enrichment contract phase** — readers move to `byCampaign`; the real fix for §0.2's display side.
- **Execute metrics** — "new customers" counted automatically needs a baseline snapshot at
  Setup → Connect, or it counts customers who were active all along. Design §8a.
- **Discoverability** — remember the last pill; land on the pill with work in it.
- **`territory-book` retirement** — nothing should read it once the HubSpot picker is proven.
- **`MAX_PAGES = 10`** in `crm-hubspot.js` silently caps the account book at 1000. Currently 748.
- **14 paying customers have no HubSpot record** — `docs/CUSTOMER_GAP_2026-09-26.md`.
- **Italy-direct customers are invisible** to every data source CST holds — same doc.
