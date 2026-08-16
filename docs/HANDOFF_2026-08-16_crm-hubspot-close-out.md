# HANDOFF — CRM / HubSpot close-out + booth sync hardening

**Date:** 2026-08-16 · **Branch:** `phase-2-6-build` · **Commits:** `3b877d0` (docs), `e07e08a` (booth fix)
**Status:** CRM is **LIVE and verified**. Two commits sit **unpushed** on the branch.

---

## 1. TL;DR for whoever picks this up

The session started from a handoff claiming an **unresolved blocker on live CRM data**. That blocker
**did not exist** — it had been fixed weeks earlier and the note was never closed. Significant time went
into re-debugging it as a HubSpot *token* problem, which it also never was.

**CRM reads live HubSpot today and renders real accounts.** The remaining work is not about reads at all;
it is about the **write** path (booth captures → HubSpot contacts), which has one unverified permission and
one structural gap.

**The recurring failure mode in this repo is stale documentation that reads as current.** Three separate
docs instructed work that had already been deleted or completed. If you find yourself following a numbered
procedure here, verify the code still matches it **before** acting.

---

## 2. Verified this session (with method, so you can re-check)

| Fact | How it was verified |
|---|---|
| CRM live, renders real accounts | Rick loaded the CRM page → `HubSpot live ✓` |
| Portal is **246062426** | Confirmed twice — browser session, and independently via the HubSpot MCP connection |
| `VITE_CRM_BACKEND:"hubspot"` in prod bundle | Grepped the deployed bundle; **survived an unrelated rebuild**, so it is set at site level |
| `crm-hubspot` function deployed | Returns JSON 401, not the SPA HTML shell |
| Leaked private-app token revoked | Old value now returns **401** (was 200) |
| The two HubSpot tokens are **separate apps** | Rotating one with immediate expiry left production working |

### Live portal contents (2026-08-16, read via MCP)
- **821 contacts**, **650 companies**, **0 deals**
- **156 contacts (19%) have no associated company**; **101 of those carry a company NAME as text** but no
  link — see §4.2, this is the booth gap already present in the data at scale.

`0 deals` is **expected, not a bug.** `crm-summary.js` reads deals and will legitimately report zero. Don't
go debugging it.

---

## 3. Three verification traps that produced false readings

Each of these cost real time. They look like proof and are not.

1. **A 401 from `crm-hubspot` proves DEPLOYMENT ONLY — not that the token works.** `requireReadAuth`
   returns at ~L36, *before* `process.env.HUBSPOT_TOKEN` is read at ~L38. A dead credential returns an
   identical 401. **The only real proof is the CRM page's own status line.**
2. **A stale asset hash returns the SPA shell with HTTP 200, not a 404.** Grepping an old
   `/assets/index-*.js` finds nothing and looks like proof the config vanished. Pull the current hash from
   `index.html` first:
   `curl -s https://montitrentini.cheeseshoptech.com/ | grep -oE '/assets/[A-Za-z0-9._-]+\.js'`
3. **Grep for `VITE_CRM_BACKEND:` — never for a bare `"hubspot"` literal.** `agency-console.jsx` does
   `const ENV = import.meta.env` then `ENV.VITE_CRM_BACKEND`, a dynamic property read, so Vite emits a
   **runtime env object** instead of substituting a string.

A fourth, for the write path: **a passing `crm-push` dry run does NOT prove write permission.** Dry run
only searches. Only a real commit proves `contacts.write`.

---

## 4. Open items

### 4.1 Confirm `crm.objects.contacts.write` — BLOCKS booth sync · **[Rick, HubSpot UI]**
`crm-push.js` genuinely writes (PATCH/POST on contacts + associations + notes). It needs
`crm.objects.contacts.write` on the private app owning the token in Netlify's `HUBSPOT_TOKEN`
(`pat-na2-2aed1d25…`). **That app is anonymous to us and its scopes are unknown.**

**This cannot be checked from code or via the MCP connection.** The MCP HubSpot integration is a separate
OAuth connection with its own permissions; private-app scopes live only in the HubSpot settings UI.

Steps: HubSpot → Settings → Integrations → Private Apps → open each app's **Auth** tab → match the token
prefix `pat-na2-2aed1d25` → confirm `crm.objects.contacts.write` is listed.

### 4.2 Net-new companies land as orphan contacts — STRUCTURAL · **needs a design decision**
`crm-push` associates a contact to a company **only when it already has a `companyId`**, which only exists
if the capture came from the synced account book. A buyer met at a booth whose shop isn't in HubSpot yet
becomes a contact with `company` as a **text property**, no company record, no association. It does not
error, and the new sync warnings **cannot** catch it (no link is attempted).

**This is already the dominant pattern in the live data:** 101 contacts carry a company name with no link.
Examples: *Cucina Baci*, *A Taste of Italy Deli*, *Angela's Pasta & Cheese Shop* — all from a 2026-07-23
import, so this predates booth, but booth will keep producing it.

Fixing it means letting `crm-push` create **company** records — a second written object type in a codebase
that is deliberately read-only nearly everywhere. **Get Rick's decision before extending the write surface.**

### 4.3 Live two-row sync test — before any trade show · **[Rick + Claude]**
Push two captures where the second fails. Confirm (a) the first is marked synced, (b) it is **not** re-sent
on retry. This exercises the partial-push fix in `e07e08a`, which was reasoned from `crm-push`'s response
shapes rather than executed — **there is no test suite in this repo**. It also settles §4.1 in the same
action, since only a real commit proves write scope.

### 4.4 Optional — consolidate onto the named private app
Retire the anonymous `…2aed1d25` in favour of `CheeseShop TECH-read-only`. Sequence: confirm scopes → swap
in Netlify → redeploy → exercise a real contact write. **Not urgent; the current token works.** Note the
warning in `HANDOFF.md`: rotating the app that owns `…2aed1d25` **will** drop production, so have the
replacement ready to paste before starting.

---

## 5. What changed, and why

**`3b877d0` — docs reconciled.** `CRM_CONNECTOR.md` described a Make-webhook architecture deleted
2026-07-16. `LAUNCH_AND_MAINTENANCE.md` carried an **unchecked task assigned to Rick** to build that
scenario — work that would have been entirely wasted. `INTEGRATIONS_PLAN.md` planned a Salesforce
integration dropped 2026-06-17. `.env.example` named `HUBSPOT_ACCESS_TOKEN`, which no function has ever
read (they all read `HUBSPOT_TOKEN`).

The Make build steps were **deleted, not struck through** — they were copy-pasteable, which is exactly the
content that gets followed by accident. Git history has them.

⚠️ **Only the CRM leg of Make is dead.** `MAKE_CAMPAIGNS_WEBHOOK_URL` → `campaigns.js` is still live. Don't
read "Make is gone" and rip out working campaign wiring.

**`e07e08a` — booth sync failure handling.** Five problems, the third of which duplicated data:
1. The 403 diagnostic `crm-push` builds (which scope, which endpoint, lookup vs write) was discarded; the
   rep saw only a status code. Now surfaced verbatim.
2. "Dry run OK — N ready to write" was a false assurance (dry run only reads). Reworded.
3. **Partial pushes replayed and duplicated notes.** `crm-push` writes row by row and on mid-loop failure
   returns `partial: true` plus rows that landed. The client stamped `pushedAt` only when `res.ok`, so a
   partial marked nothing and the next sync re-sent already-written rows. Contacts survive (upsert on
   email) but the note is created unconditionally → duplicate notes. `pushedIds` now derives from the
   server's `results`.
4. Per-row association/note failures were invisible under a `200` "Pushed N contacts" → orphaned contact,
   rep told it worked. Now warned on.
5. Failures rendered in the same muted grey as successes. Now warning-coloured with `role="alert"`.

---

## 6. Environment / working rules

- **Repo:** `/Users/richardposada/Cheese Shop TECH BUILD/Cheese Shop TECH  Agency Build`
  (note the **double space** in the folder name). The cwd `~/Downloads/Publix` does **not** exist.
- **Verify with:** `npm run build` — passes clean; the `card-scan` dynamic-import and chunk-size warnings
  are **pre-existing**. There is **no test suite**.
- **Git in the sandbox:** reads only, with `GIT_OPTIONAL_LOCKS=0`. The sandbox can strand a
  `.git/index.lock` it cannot delete — even a plain `git status` can do it. `FIX GIT LOCK AND PUSH.command`
  in the repo root clears a lock and pushes. *Both commits this session went through cleanly with no lock
  stranded, checked before and after.*
- **Never paste a live token into a chat or transcript.** That is the entire reason a rotation was needed
  this session. Tokens go straight into the Netlify env UI.
- **`BUILD_LOG.md` is append-only history — do not "correct" it.** It records what was true when written.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
