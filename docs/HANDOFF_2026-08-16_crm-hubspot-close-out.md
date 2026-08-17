# HANDOFF — CRM / HubSpot close-out, booth sync hardening, company matching

**Date:** 2026-08-16 · **Branch:** `phase-2-6-build` · **All work pushed to origin.**
**Status:** CRM reads are **LIVE and verified**. Writes are **BLOCKED on one missing HubSpot scope**
(confirmed by a live 403, not inferred).

---

## 0. FOR COWORK — start here

**Do not start by re-verifying the CRM read path.** It is live, it renders real accounts, and the
July blocker in `HANDOFF.md` is closed. A prior session lost hours re-debugging it as a token
problem. See §3 for the four checks that produce convincing FALSE readings.

**The one thing blocking progress is not code.** It is a scope on a HubSpot private app, and only
Rick can add it (§4.1). Until it lands, `crm-push` cannot write and no amount of code changes will
help. Everything else below is either done or waiting on that.

### ⚠️ Cowork sandbox rules — these differ from Claude Code
- **Git is READ-ONLY here.** Always `GIT_OPTIONAL_LOCKS=0 git status`. **Never `git add` / `git commit`
  / `git push` from the Cowork sandbox.** The mount lets it create files under `.git/` but not delete
  them, so even a plain `git status` can strand a `.git/index.lock` that then blocks Rick's own
  pushes. (`CLAUDE_CODE_BRIEF.md` §2.6; root cause in `HANDOFF.md`, 2026-07-01.)
- **To land code:** hand it to Claude Code, or have Rick double-click **`FIX GIT LOCK AND PUSH.command`**
  (repo root — clears any stranded lock and pushes).
- **`npm run build` may not be trustworthy in the sandbox** — `node_modules` is Linux-only here, which
  is why the pricing tool sat unbuilt for weeks (`CLAUDE_CODE_BRIEF.md` §5.1). Treat a sandbox build as
  a smoke test; real verification happens in Claude Code.
- **Cowork's advantage is the MCP connectors.** The entire live-portal audit in §2 and §5 was done
  through the HubSpot MCP connection, not the codebase. Use it — but know its limit: it authenticates
  as a **separate OAuth connection**, so it can read CRM records and **cannot** tell you anything about
  the private app's scopes. That is why §4.1 is a UI task.

### Repo facts
- Path: `/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build`
  — note the **double space** in the second folder name. Quote it. `~/Downloads/Publix` is not the repo.
- **There is no test suite.** Nothing here is covered by tests.
- `netlify/functions/*` are **server-side**; `src/*` is the browser bundle. A `VITE_*` var is
  build-time and needs a redeploy; `HUBSPOT_TOKEN` is read per-request and does not.
- `BUILD_LOG.md` is append-only history. Do not "correct" it.

---

## 1. What shipped (all on origin)

| Commit | What |
|---|---|
| `3b877d0` | Docs reconciled with the live direct-HubSpot path |
| `e07e08a` | Booth sync failure handling — five silent/misleading failure modes |
| `b1331cd` | This handoff + date corrections |
| `ecc9c73` | `crm-push` company resolution, match-first |

All four are deployed and verified live in the production bundle.

---

## 2. Verified, with method

| Fact | How |
|---|---|
| CRM live, real accounts | Rick loaded the CRM page → `HubSpot live ✓` |
| Portal **246062426** | Browser session **and** independently via the HubSpot MCP connection |
| `VITE_CRM_BACKEND:"hubspot"` | In the deployed bundle; survived an unrelated rebuild ⇒ set at site level |
| `crm-hubspot` deployed | Returns JSON 401, not the SPA HTML shell |
| `crm-push` deployed | `POST {}` → **HTTP 400 JSON** (the "no cleared rows" guard) |
| Token is VALID | Live sync returned **403**, not 401 — authenticated, just not authorized |
| **`crm.objects.contacts.write` is MISSING** | Live sync: `Failed on the write (/crm/v3/objects/contacts/493472041685)` |
| Leaked private-app token revoked | Now returns 401 (was 200) |
| The two tokens are **separate apps** | Rotating one with immediate expiry left production working |

### Live portal contents (read via MCP, 2026-08-16)
- **821 contacts**, **650 companies**, **0 deals**
- **156 contacts (19%) have no associated company.** 99 of those carry a company name.

`0 deals` is **expected**. `crm-summary.js` reads deals and will legitimately report zero. Not a bug.

---

## 3. Checks that produce FALSE readings — all four cost real time

1. **A 401 from `crm-hubspot` proves DEPLOYMENT ONLY, not that the token works.** `requireReadAuth`
   returns at ~L36, *before* `process.env.HUBSPOT_TOKEN` is read at ~L38. A dead credential returns
   an identical 401. Same for `crm-push`'s 400 — an early guard, no HubSpot call. **The only proof a
   credential works is the CRM page's own status line, or a real sync.**
2. **A stale asset hash returns the SPA shell with HTTP 200, not a 404.** Grepping an old
   `/assets/index-*.js` finds nothing and looks like proof the config vanished. Get the current hash
   first: `curl -s https://montitrentini.cheeseshoptech.com/ | grep -oE '/assets/index-[A-Za-z0-9._-]+\.js'`
3. **A changed bundle hash does NOT mean your code deployed.** This produced a false "deploy landed"
   during this session. Netlify serves the previous deploy until the new one publishes, and an
   unrelated rebuild changes the hash too. **Grep the live bundle for a distinctive string from your
   own change**, and sanity-check the byte size moved — the false positive was byte-identical.
4. **A passing `crm-push` dry run does NOT prove write permission.** Dry run only searches. Only a
   real commit proves it — which is exactly how the 403 in §4.1 was finally found.

---

## 4. Open items

### 4.1 ⛔ ~~BLOCKER — add two scopes~~ **SUPERSEDED 2026-08-17 — THIS SECTION IS WRONG**
> The scopes were already present on BOTH private apps. The real cause is that `HUBSPOT_TOKEN`
> belongs to neither of them. See `HANDOFF_2026-08-17_hubspot-403-root-cause.md`.
> Do not spend time adding scopes — it cannot fix this.

<details><summary>Original (incorrect) section, kept for the record</summary>

A live sync of 9 captures returned:

> HubSpot refused the push (403). Nothing was written. 9 still queued on this device. Failed on the
> write (`/crm/v3/objects/contacts/493472041685`). Add the scope on the SAME private app whose token
> is in HUBSPOT_TOKEN, then Commit changes.

The failure is a PATCH on an existing contact — the write itself. Search and auth both succeeded.

**Fix:** HubSpot → Settings → Integrations → Private Apps → open each app's **Auth** tab and match
the token prefix **`pat-na2-2aed1d25`** (this app is anonymous to us; that is why the error says "the
SAME private app"). On it, add **both**:
- `crm.objects.contacts.write` — what failed
- `crm.objects.companies.write` — needed by §5's company creation, or the next run fails here instead

Then **Commit changes** and re-run Sync. **No redeploy needed** — scopes are HubSpot-side and the
token is read per-request. Adding scopes does not rotate the token.

Nothing was written and nothing was stamped `pushedAt`, so a retry pushes all 9 cleanly with no
duplicate notes.

</details>

### 4.2 Duplicate captures observed in the booth list · **[triage]**
The pre-sync list showed `Bruce Birenbaum / Nassau Candy` twice, and
`Sheryl Benward / Paul Ferrari` alongside `Sheryl Benward / Paul Ferran` — same company, one
character apart, almost certainly an OCR variant from a rescan. Same email ⇒ `crm-push` upserts
safely; differing or missing email ⇒ two contacts for one person. **Worth a dedupe pass in the booth
UI** (`splitPushable` could flag near-duplicate name+company pairs before sync).

### 4.3 Live two-row test — before any trade show
Push two captures where the second fails. Confirm the first is marked synced and is **not** re-sent
on retry. The partial-push fix in `e07e08a` was reasoned from `crm-push`'s response shapes, not
executed. Same for the company-create path in `ecc9c73`.

### 4.4 Orphan contacts — 156, analysed, list produced
Not a hypothetical: 19% of live contacts. Breakdown and the reasoning are in §5. The actionable
output is a **48-record call list** (company known, named owner, phone on file, missing only an
email) plus 13 more where the number comes off the company record. **53 have no company name at all**
and cannot be settled by a call — their email handle usually *is* the company
(`sproutmarketbk@gmail.com`, `wineandcheeseco@gmail.com`), so that is desk research, a different job.

⚠️ `Joel Cezl` carries `jobtitle: "FORMER EMPLOYEE — no longer at Stew Leonard's, per Richard
2026-07-22"`. Any bulk campaign over orphans **must** read `jobtitle` or it will call him again.
Two records (`rick.posada@gmail.com`, `mrsposada2007@gmail.com`) are internal test data.

### 4.5 Optional — consolidate onto the named private app
Retire the anonymous `…2aed1d25` in favour of `CheeseShop TECH-read-only`. Not urgent. Note: rotating
the app that owns `…2aed1d25` **will** drop production — have the replacement ready to paste first.

---

## 5. Design notes worth not re-deriving

**Company matching is MATCH-FIRST for a reason** (`crm-push.js`, `findCompany`). Auditing the live
portal showed the obvious implementation would have corrupted a 650-company CRM:
- The companies mostly **already exist** — every orphan sampled was on file with a domain. The 19% is
  a **linking** failure, not a missing-company problem.
- **Exact-name matching is not enough.** 29 contacts carry the company text `Baldor`; the record is
  `Baldor Specialty Foods`. `Di Palo Fine Foods` is filed as `Di Palo's Fine Foods`.
- **Email domains are useless as a key here** — 12/12 sampled orphans were on gmail/hotmail/aol.
  Keying on email domain would create a company named after a free provider.

Order is domain → unambiguous name → create. An ambiguous match is **deliberately left unlinked**:
a wrong link silently attributes a buyer to the wrong account, which is worse than no link and much
harder to notice. The domain comes from the card's printed website, which the OCR always read but the
capture never persisted until `ecc9c73`.

**Enrichment is keyed by `companyId`** (`campaign-enrichment.js`: `entries = { [companyId]: {...} }`).
So an orphan contact **cannot enter the enrichment queue until it is linked** — linking is the
precondition for enrichment, not an alternative to it. Do not overload that store with a
person-keyed variant; its own header explains why it was split from `crm-outreach.js` rather than
bending one schema around two jobs.

**Only the CRM leg of Make is dead.** `MAKE_CAMPAIGNS_WEBHOOK_URL` → `campaigns.js` is still live.
Do not read "Make is gone" and rip out working campaign wiring.

---

## 6. Security rule, learned the hard way
**Never paste a live token into a chat or transcript.** A token pasted this session had to be rotated.
Tokens go straight into the Netlify env UI. Claude does not handle credential values.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
