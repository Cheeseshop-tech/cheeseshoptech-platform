# HANDOFF — "Mark resolved" + a lookback log on the Priority — response needed card

**Status: code complete, lint + build-transform clean, committed locally, NOT pushed.** Built
2026-09-21 in the Cowork session that also ran the weekly Gmail priority-digest automation. This
is a new, small feature on top of that automation — not a fix to it.

## The problem

The "Priority — response needed" card (`src/components/home/priority-card.jsx`) is fed entirely by
the Gmail-driven weekly routine (`attention-publish.js` → Netlify Blobs → `attention-list.js`). That
routine can only see what happens in Gmail. Rick, 2026-09-21: "some things get resolved in phone
calls and you won't see the update or resolution" — an item stays stuck on the live card, showing as
outstanding, until either (a) the underlying email thread changes enough that next Monday's refresh
drops it, or (b) forever, if it never does. There was also no way to look back later and confirm
"yes, that was handled — here's when, how, and what was agreed."

Ask (Rick, verbatim intent): a "Resolved" button with notes, so items resolved off-platform (a
call, in person) can be cleared by hand, and a log kept so he can look back and see something was
resolved on a call, with his notes, and that he confirmed it by email afterward.

## What changed

Three files, all additive — nothing in the existing Gmail-driven publish/list/label path was
touched:

1. **`netlify/functions/attention-resolutions.js`** (new). Netlify Blobs store, one record per
   tenant, same shape/auth pattern as `campaign-rep-calls.js`:
   - `GET ?tenant=<id>` → `{ resolved, log, updatedAt }`. Any valid read-tier passcode/Identity
     session (`requireReadAuth`, same tier as `attention-list.js`).
   - `POST { tenant, action:"resolve", id, who, what, urgency, notes, method }` → marks one item
     resolved. `method` is one of `phone | email | in-person | other`.
   - `POST { tenant, action:"reopen", id }` → undoes a resolve (Rick clicked it by mistake).
   - Both POSTs require `requireWriteAuth` (admin/client-admin passcode or Identity session) — the
     **same tier every other write in this app already uses**. No new passcode, no new env var.
   - Every write also calls the existing `logWrite()` (`_write-log.js`) so it shows up in the
     house-wide write-audit log too, same as any other write action.
   - Two things live in the one Blobs record: `resolved` (an `{id: {...}}` suppress-map — hides
     that item off the live card) and `log` (append-only, newest first, capped at 200 — survives
     even after the item ages off `resolved`, since that's the actual "look back" record Rick
     asked for).

2. **`src/lib/attention.js`** — added `getAttentionResolutions()`, `resolveAttentionItem()`,
   `reopenAttentionItem()`, and the `RESOLUTION_METHODS` label list. Built on the existing
   `readAuthedJson`/`writeAuthedJson` helpers (`src/lib/authed-fetch.js`) — no new fetch pattern.
   `getAttention()` itself (the Gmail-sourced item list) is untouched.

3. **`src/components/home/priority-card.jsx`** — each live item now has a "Mark resolved" button.
   Clicking it expands an inline form (notes textarea + a "Resolved via" dropdown: Phone call /
   Email / In person / Other), matching the existing expandable-row pattern from the campaign call
   console (`campaign-detail.jsx`'s `CallRow`) rather than inventing a new interaction. Confirming:
   - fetches `resolveAttentionItem()`, then removes the item from the visible list immediately
     (client-side filter against the `resolved` map — no wait for next Monday's refresh),
   - shows a toast (`useToast()`, already used elsewhere in the app) confirming it saved,
   - appends one row to a "View resolved log (N)" list at the bottom of the card — who, what, the
     note, how it was resolved, when, and who resolved it. Each log row has a small reopen icon.
   - The card now also renders (with a "Nothing needs a reply right now." line) when the live item
     list is empty but the log has entries, so the log stays reachable even on a clear desk — it
     previously returned `null` outright when there was nothing outstanding.

## How it fits together (why it won't fight next Monday's automation)

`resolved` is a suppress-list keyed by item `id`, checked client-side against whatever
`attention-list.js` currently serves. It doesn't touch `attention.json` or the Blobs record the
weekly routine writes. If the same underlying email thread is still the most-recent-sent message
next Monday, the automation will re-publish it under the same id shape it always uses — at that
point it's Rick's own follow-up email (which he said he does anyway: "confirming resolution via
email") that actually stops it from re-qualifying, same as any other thread. This feature closes
the visibility gap between "resolved on a call" and "email reflects that," not the automation's
data source itself — that's a deliberate scope boundary, not an oversight.

## Testing done (in the Cowork sandbox — no live preview available there)

- `npx eslint` on all three changed/new files: clean.
- `npx vite build`: **2,060 modules transformed with no errors** (the only failure was `EPERM`
  unlinking a stray `dist/.DS_Store` on this sandbox's mounted folder — a filesystem quirk of the
  mount, unrelated to the code; same class of issue the git-lock self-heal in the PUSH script below
  already works around).
- `node --check` on the new Netlify function: passes.
- **Not yet tested:** an actual browser click-through against a live deploy (Blobs read/write,
  the toast, the reopen icon). Needs a real Netlify preview or production deploy first — same
  "can't verify live from this sandbox" limitation noted in every prior handoff.

## Deploy steps

1. Review the three files listed above (diff is small — one new ~140-line function, ~55 added
   lines in `attention.js`, and a rewrite of `priority-card.jsx` that keeps the original card
   layout intact and adds the resolve UI + log around it).
2. The code is already committed locally on `phase-2-6-build` (commit message below) —
   nothing more to add or commit.
3. Double-click **`PUSH PRIORITY RESOLVE LOG FEATURE.command`** in the project folder. Same
   pattern as `PUSH ATTENTION FEATURE.command` — pushes to GitHub, which is what makes Netlify
   build and deploy it (~1–2 minutes).
4. Live-verify on the actual site once deployed (per every prior handoff's standing note: verify
   live, not just code/dashboard state):
   - Open the dashboard, confirm the Priority card still renders the current live items unchanged.
   - Click "Mark resolved" on one item, add a note, pick a method, confirm — item should
     disappear from the card immediately.
   - Click "View resolved log" — the entry should show up with your note, method, and timestamp.
   - Click the reopen icon on that entry — item should come back onto the live list.

## Rollback

No data migration, no new env var, no schema change to the existing `attention` Blobs store —
reverting is just reverting the three files (or the one commit). The new `attention-resolutions`
Blobs store is additive and orphaning it does no harm if this is ever rolled back.

## Standing constraints (unchanged, reconfirmed this session)

- Git push happens via a `.command` script Rick double-clicks himself, never pushed directly from
  the sandbox — this handoff follows that, same as every prior one.
- Claude never touches Netlify Identity/security settings or env vars — not needed here anyway,
  since this reuses the existing write-auth tier with no new secret.
- Verify live behavior, not just code review, before calling this "done."

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
