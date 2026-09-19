# Dashboard auto-update architecture

**Written:** 2026-09-18 · **Status:** pattern already in production (4 instances), this doc
formalizes it and recommends the next step · **Read with:** `docs/CONTINUAL_IMPROVEMENT.md`,
`docs/ADMIN_DASHBOARDS_SPEC.md`, `docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md`,
`docs/MARKET_NEWS_AUTO_UPDATE.md`

Rick asked (2026-09-18) to design the system behind "automating the updates for the dashboards."
That system already exists — it grew organically across four features shipped between 2026-06-18
and 2026-09-18 without ever being written down as one pattern. This doc names it, shows where it's
used, and flags the one piece of debt worth paying down before a fifth dashboard needs it.

## 1. Requirements

**Functional.** A background routine (a scheduled Cowork task, no human present) needs to change
what a dashboard panel shows, and the change must be visible to whoever opens the app next —
without Rick redeploying. The panel is read by house admins and/or client users depending on the
feature.

**Non-functional.**
- **No rebuild.** A Netlify deploy takes ~1–2 minutes and is a deliberate, reviewed action
  (`COMMIT <FEATURE>.command`, per `docs/CONTINUAL_IMPROVEMENT.md`). Data changes must never
  require one — that would turn "the news updated" into a deploy event.
- **Solo-operator scale.** One tenant live (Monti Trentini), a handful of scheduled routines,
  traffic in the tens of requests/day. Nothing here needs to survive Black-Friday-style load.
- **A failed routine must degrade, never corrupt.** Yesterday's good data outliving a bad run is
  always the right default (see Guardrails in `MARKET_NEWS_AUTO_UPDATE.md` and
  `WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md`).
- **Unattended auth.** The routine runs with nobody at a keyboard to type a passcode — the
  credential has to be readable by a script without living in a scheduled-task prompt (which an
  LLM session, and therefore this doc, can see).

**Constraints.** Team of one. Existing stack: Vite/React front end, Netlify Functions, Netlify
Blobs as the only server-side store (no database), Cowork scheduled tasks as the only cron
mechanism.

## 2. High-level design

One shape, four instances:

```
scheduled Cowork task (cron)
   │  does the actual work: research, or read + compute from another source
   │  writes a JSON file into the repo (checked in — provenance + a bundled fallback)
   ▼
scripts/publish-<feature>.mjs          (Node, no browser)
   │  POST + secret header
   ▼
netlify/functions/<feature>.js         → validate/sanitize → Netlify Blobs
   ▲                                        (single doc per tenant, or one house-wide doc)
   │  GET, on every page load
   │
Dashboard panel (React) — reads on mount, no cache, "Cache-Control: no-store"
```

The panel never talks to Blobs directly and never runs the routine — it only ever does a GET. The
routine never talks to the browser — it only ever does a POST from Node. The Netlify function is
the only thing that touches Blobs, and the only place validation happens. This is the same shape
config-vs-state already uses elsewhere in the app (campaign *definitions* in code vs campaign
*state* in Blobs; CRM accounts from HubSpot vs outreach notes from Blobs) — one more case of "one
mind, one body" from `CONTINUAL_IMPROVEMENT.md`.

### Where it's used today

| Feature | Routine (cron) | Publish script | Function | Scope | Read tier |
|---|---|---|---|---|---|
| Inventory | `monti-inventory-watch` (daily) | `publish-inventory.mjs` | `inventory.js` / `inventory-publish.js` | per-tenant | any passcode |
| Market news | `daily-news-watch` Part 2 (daily) | `publish-market-news.mjs` | `market-news.js` / `market-news-publish.js` | per-tenant | any passcode |
| Campaign state* | UI (Rick clicking checkboxes), not a routine | — (direct POST from the browser) | `campaign-state.js` | per-tenant | write: admin/client-admin |
| Improvement review | `weekly-improvement-review` Part 2 (weekly) | `publish-improvement-review.mjs` | `improvement-review.js` | house-wide (no tenant) | admin only |

\* Campaign state isn't routine-published — it's here because it shares the "Blobs doc read on
page load" read half of the pattern, just not the write half. It's the odd one out and a preview
of where this generalizes: not every panel needs the write side to be a scheduled routine.

## 3. Deep dive

**Data model.** Every store holds one JSON document per key (`tenant` id, or a fixed key for
house-wide docs). Two shapes recur:
- **Replace-whole-doc** (inventory, market-news, campaign-state): the POST body *is* the new
  document; last-writer-wins. Fine at this write frequency (at most a few times a day, one writer).
- **Latest + capped history** (improvement-review): POST appends to a bounded array and also
  updates a `latest` pointer, so the panel can show "now" cheaply and "last N weeks" on demand.
  Worth using anywhere a trend matters, skip it where it doesn't (nobody needs 26 weeks of
  inventory snapshots — the daily file already gets git history for free).

**API contract.** Every one of these functions:
1. Handles `OPTIONS` for CORS first.
2. Runs an auth check *before* looking at the method or body (`requireReadAuth`/`requireWriteAuth`
   from `_write-guard.js`).
3. On GET: read the store, return `{ ok, ...data }`, degrade to an empty/`null` shape on any Blobs
   error rather than 500 — the panel always renders *something*.
4. On POST: parse JSON defensively, sanitize every field by hand (bounded string lengths, known
   enum values only, arrays sliced to a max length, unknown keys dropped), stamp
   `updatedAt`/`generatedAt` server-side (never trust a client timestamp), write, return `{ ok,
   updatedAt }`.

**Auth — two generations, one now preferred.** Inventory and market-news predate
`AGENT_GATE_PASSCODE` (2026-09-17) and use a dedicated secret per feature
(`INVENTORY_PUBLISH_SECRET`, `MARKETNEWS_PUBLISH_SECRET`, sent as `x-publish-secret`, checked by
hand in each function). Campaign-state and improvement-review use the unified
`requireWriteAuth()`/`requireReadAuth()` gate, which already accepts `AGENT_GATE_PASSCODE` as a
tenant-agnostic admin credential built for exactly this — no new secret needed per feature. **New
dashboards should use the unified gate**, not spin up a fifth secret. See §5.

**Error handling.** The rule everywhere is *degrade toward the last good state, never toward an
error page.* A Blobs read failure returns the "no data yet" shape, which every panel already knows
how to render (it's the same shape as "the routine hasn't run yet"). A rejected write (422/413)
must halt the routine and say so — retrying with looser validation is explicitly forbidden in both
existing runbooks, and the same rule should carry forward.

**Retry/idempotency.** None of the four routines retry within a run — a failure is reported (chat
line, and email for the market-news/improvement-review cases) and left for the next scheduled
run. At this volume (daily/weekly), "try again next time" is simpler and safer than building retry
logic for jobs a human is implicitly supervising via the chat report anyway.

## 4. Scale and reliability

**Load.** Reads happen on page load for a handful of admin/client sessions a day — effectively
zero load on Blobs. Writes happen on a fixed cron cadence (1–2/day across all routines combined).
Nothing here is bottlenecked by anything but Cowork's own scheduling reliability.

**Failover.** Netlify Blobs has no failover story Rick controls — if it's down, every read
degrades to the bundled JSON fallback already checked into the repo (this is *why* the routine
writes that file before publishing, not an incidental step). That fallback is the real redundancy
layer, not a second data store.

**Monitoring.** Two layers already exist and generalize cleanly:
- **Command Center → Integration Health** shows "reachable, empty" as a distinct state from
  "live" — the alarm state that means a routine silently stopped (this caught the 2026-09-01
  market-news outage). Any new feature on this pattern should get a row here.
- **Failure emails** from the routine itself (market-news, improvement-review) for the cases
  Integration Health can't see quickly — a rejected payload, missing local credentials.

## 5. Trade-off analysis — and the one recommendation

**Blobs vs. a real database.** Blobs wins on zero-ops (no provisioning, no migrations, already
paid for) and loses on query flexibility (no filtering/sorting server-side — the panel always
fetches the whole doc and slices in the browser). Fine while every doc is small (KBs) and every
tenant has one; would need revisiting if a doc ever needed cross-tenant querying.

**Per-feature secret vs. unified `AGENT_GATE_PASSCODE`.** The inconsistency documented in §3 is
real debt, not a style nit: two different header names (`x-publish-secret` vs
`x-portal-passcode`), two different places a secret can leak from, two things Rick has to remember
when auditing "what can write to this platform." **Recommendation: migrate `inventory-publish.js`
and `market-news-publish.js` to `_write-guard.js`'s `requireWriteAuth()`, drop
`INVENTORY_PUBLISH_SECRET`/`MARKETNEWS_PUBLISH_SECRET`.** This is a small, mechanical, low-risk
change (the read sides already use the unified guard) and it's the natural next step now that a
third feature (improvement-review) has proven the unified pattern. Not done as part of this doc —
flagged for the backlog, since it touches two live production functions and deserves its own
verify-then-ship pass rather than riding in on a design doc.

**Duplicated boilerplate.** Every one of the six functions above hand-rolls the same
`OPTIONS`/CORS/`json()` helper, the same "read store, JSON.parse, degrade on error" GET, and a
bespoke sanitizer. A shared `netlify/functions/_blob-doc.js` helper (`readDoc(store, key)`,
`writeDoc(store, key, sanitizeFn, body)`) could cut each function to ~20 lines. **Worth doing once
a fifth dashboard needs this pattern, not before** — three near-identical files is a pattern;
extracting a helper for two would be premature, and the sanitizers genuinely differ enough
per-feature that a shared helper only earns its keep past a certain count.

**Push (git) vs. Blobs for "no rebuild."** Every routine also commits its output JSON to git for
provenance/audit trail, but explicitly never pushes — a push would trigger the very rebuild this
whole pattern exists to avoid. Worth restating because it's easy for a future routine to "helpfully"
add a push and silently reintroduce redeploy-on-data-change.

## What to revisit as this grows

- **A sixth tenant or a second house-wide dashboard** is the trigger for the `_blob-doc.js`
  extraction above — not before.
- **If a panel ever needs near-real-time updates** (seconds, not "next page load"), this pattern
  stops being enough — that's a websocket/SSE conversation, not a bigger poll interval.
- **If any doc needs cross-tenant aggregation** (e.g. "shelf-life across all tenants" once there's
  more than one), a single Blobs store per feature stops being the right shape — that's the point
  to reconsider a real database.
- **The two legacy per-feature secrets** should be retired opportunistically the next time either
  `inventory-publish.js` or `market-news-publish.js` is touched for an unrelated reason, per the
  recommendation in §5.
