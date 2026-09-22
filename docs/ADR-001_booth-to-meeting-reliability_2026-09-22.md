# ADR-001: Booth-to-Meeting (Meet & Greet) — closing the capture → notes → HubSpot → follow-up loop

**Status:** Proposed
**Date:** 2026-09-22
**Deciders:** Rick Posada

## Context

Booth-to-Meeting ("Meet & Greet") exists to do four things reliably, in order: capture a
conversation at a show, keep a durable record of it (contact + notes) that the whole team can see
from any device, get that record into HubSpot, and get a follow-up email out the door. This
review was prompted by a real incident, not a hypothetical: an Ace Endico capture from 9/15
(Joanne Maillaro Harrison) landed correctly in HubSpot — a contact and a note both exist there,
confirmed by direct query — but is completely absent from the app's own History tab. Digging into
why surfaced a second, independent bug, plus two structural gaps (no automated follow-up send, and
no protection against duplicate HubSpot notes on retry) that the same review turned up while
tracing the pipeline end to end.

**Current architecture, as it actually is today:**

```
Rep at a booth
  │ fills out capture form (name/company/email/phone/role/temperature/products/next-step/notes)
  ▼
localStorage  cst.booth.<tenant>.v1                         (booth.js:22, 163-184)
  — written FIRST, by design ("a rep who loses one conversation has lost the only copy of it",
    booth.js:3-8). Card-scan photos go to IndexedDB separately (card-scan.js:39-40).
  │
  ├─▶ pushToHistory()  — automatic, fire-and-forget, fires on every capture missing
  │     historySyncedAt (booth.js:987-1009)
  │     ▼
  │   POST /.netlify/functions/booth-history                (booth-history.js)
  │     — REQUIRES a real Netlify Identity JWT (context.clientContext.user). No passcode
  │       fallback, by deliberate 2026-09-16 v2 design ("no such thing as capturedBy without
  │       a real signed-in person"). sanitizeNew() also has no `notes` field at all.
  │     ▼
  │   Netlify Blobs "booth-history" — the durable, cross-device log the History tab reads.
  │
  └─▶ pushToHubspot()  — rep-triggered, deliberate "Sync" action (booth.js:928-958)
        ▼
      POST /.netlify/functions/crm-push                     (crm-push.js)
        — requireWriteAuth: accepts Identity session OR admin/house/AGENT_GATE passcode tiers.
        ▼
      HubSpot: upsert CONTACT by email → associate COMPANY → create NOTE unconditionally
        (crm-push.js:264-283), no idempotency check on the note.

Follow-up email: no server send anywhere. nextStepText()/recapComposeUrl() (booth.js:595-765)
build a Gmail-compose URL or mailto: link; the rep taps a button and sends it themselves. Nothing
fires automatically when a promised follow-up comes due.
```

## Decision

Make four targeted changes, each independently shippable, in this priority order:

1. **Fix the auth mismatch that silently drops records from History.** Add `AGENT_GATE_PASSCODE`
   (and, more importantly, the same admin/house passcode tiers `crm-push.js` already accepts) as
   an accepted credential on `booth-history.js`'s create/edit — matching every other write
   endpoint in this app (`campaign-state.js`, `crm-push.js`). A capture that reaches HubSpot
   should never fail to reach the team's own shared log for a weaker reason than the reason it
   reached HubSpot.
2. **Stop dropping notes on create.** Add `notes` to both `toHistoryRecord()` (booth.js:970-985)
   and `sanitizeNew()`'s whitelist (booth-history.js:71-91), capped and sanitized the same way
   `sanitizePatch()` already does it (2000 chars). This is a one-line-per-file fix; there's no
   design question here, just an omission.
3. **Make the sync failure visible when it does happen.** Even with (1) fixed, sync can still fail
   (offline, a genuinely expired session, a Blobs outage). Right now `pushToHistory()` never
   throws and never surfaces anything to the rep (booth.js:987-994, by design, "never awaited into
   the capture UI's critical path"). That's the right call for not blocking capture — but a
   capture that's been local-only for, say, 30+ minutes should show a visible "not yet backed up"
   indicator in the capture list, not silence. This turns a silent, undiscoverable failure mode
   into a visible, self-correcting one (rep sees it, reconnects, retries).
4. **Add idempotency to the HubSpot note write.** `crm-push.js:266-283` creates a note
   unconditionally whenever `contactId` exists and there's note text — with no check for "did this
   capture's note already land." Client-side dedup is a local-only `pushedAt` flag
   (`splitPushable()`, booth.js:893-894), so a dropped response after a successful server commit
   causes a guaranteed-duplicate note on retry. Fix: stamp the capture's own id into the note
   (e.g. a `cst_capture_id` custom property, or a deterministic search-before-create keyed on it)
   so a replay is a no-op, not a duplicate.

Follow-up email automation (the fourth stated goal) is **not** included as an immediate change —
see Options below for why it's a separate, larger build rather than a fix.

## Options Considered

### Booth-history auth: Option A — accept the same passcode tiers as every other write endpoint (recommended)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — mirrors an existing pattern (`_write-guard.js` already exposes `requireWriteAuth`) |
| Cost | None |
| Reliability | High — closes the exact gap that caused the 9/15 loss |
| Security posture | Slightly loosens a deliberate 2026-09-16 restriction |

**Pros:** consistent with the rest of the app; fixes the actual incident; no new infrastructure.
**Cons:** the 2026-09-16 decision to require Identity specifically was made so `capturedBy` could
never be spoofed via a shared passcode. Accepting `AGENT_GATE_PASSCODE` for automation is fine
(it's tenant-agnostic "admin," same as everywhere else), but accepting the *house/client* passcode
tiers too means a capture logged under a shared passcode session would need a policy for what
`capturedBy` becomes (e.g. "Team" / the tenant name, not a fabricated person) — worth deciding
explicitly rather than defaulting.

### Booth-history auth: Option B — leave Identity-only, force real sign-in at booth setup instead
**Pros:** keeps the stronger provenance guarantee as-is; no code change.
**Cons:** doesn't fix anything — it just pushes the failure mode onto "someone has to remember to
sign in correctly at a trade show," which is exactly the human step that already failed once. Not
recommended as the sole fix, though worth doing *in addition* to Option A as a checklist item for
booth setup.

### Follow-up email: Option A — server-side transactional send (new infrastructure)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium-High — new provider (SendGrid/Resend/Postmark), API key, a new Netlify function, deliverability/sender-domain setup |
| Cost | New recurring line item (transactional email tier) |
| Scalability | Fine at this volume |
| Team familiarity | None yet — nothing like this exists in the codebase today (confirmed: no email SDK in `package.json`, no email-sending function anywhere) |

**Pros:** actually automatable — can fire on `whenISO` coming due, attach the `.ics` file properly
(today's `mailto:` path can't carry attachments at all, per booth.js:713-716), send from a real
tenant domain instead of relying on the rep's own signed-in Gmail session.
**Cons:** real new build, real new cost, real new failure surface (bounces, deliverability,
another secret to rotate).

### Follow-up email: Option B — keep manual compose, add an in-app due/overdue reminder (recommended near-term)
**Pros:** zero new infrastructure; directly fixes the actual current gap ("nothing fires when a
follow-up comes due") without taking on email-sending as a new responsibility; ships fast.
**Cons:** still requires a human to act — doesn't get you a truly automated send.

### Follow-up email: Option C — hybrid (recommended path forward)
Ship Option B now (due/overdue surfacing in the capture list and/or History tab, reusing
`nextStepText()`/`whenISO` that already exist). Treat Option A as a later, deliberately-scoped
project once there's a real send volume that justifies the new infrastructure and cost — not
bundled into this reliability pass.

## Trade-off Analysis

The two auth-related fixes (items 1 and 4 above) are low-risk, low-cost, and directly address a
confirmed data-loss incident — there's no real argument for not doing them. Item 2 (notes on
create) is a pure bug fix with no trade-off. Item 3 (visible sync-failure indicator) trades a
small amount of UI surface area for closing the "silent failure" class of bug entirely — worth it
because item 1 alone doesn't guarantee sync always succeeds, only that it no longer fails *for the
wrong reason*. Follow-up email automation is the one genuine build-vs-defer call: it's the most
expensive item and the least urgent relative to the data that's currently at risk of being lost or
duplicated, so it's scoped separately rather than folded into this pass.

## Consequences

- **Easier:** a capture logged anywhere (passcode or Identity session) reliably shows up in the
  team's shared History log; notes survive from the moment of capture instead of needing a manual
  edit pass; a retried HubSpot push can no longer double up a contact's notes.
- **Harder:** `capturedBy` provenance gets slightly fuzzier for passcode-authenticated captures —
  needs an explicit policy decision (see Option A cons above), not a silent default.
- **Revisit later:** whether follow-up email becomes a real server-send feature once there's
  enough volume to justify a transactional email provider; whether `scopeId` (currently just a
  reused campaign id, no dedicated show/event entity) needs its own model as more shows get run
  through this tool.

## Action Items

1. [ ] Add `AGENT_GATE_PASSCODE` (and decide on house/client tiers + `capturedBy` policy) to
       `booth-history.js`'s create/edit auth check.
2. [ ] Add `notes` to `toHistoryRecord()` (booth.js) and `sanitizeNew()` (booth-history.js),
       capped at 2000 chars like `sanitizePatch()` already does.
3. [ ] Add a visible "not yet backed up" state to the capture list for captures past some age
       threshold with no `historySyncedAt`.
4. [ ] Add idempotency to the HubSpot note-creation step in `crm-push.js` (capture id stamped
       into the note, checked before create).
5. [ ] Backfill the confirmed-missing 9/15 Ace Endico record into `booth-history` once (1) ships,
       flagged clearly as a reconstructed record rather than a live capture.
6. [ ] Ship the due/overdue follow-up indicator (Option B) as a separate, smaller change.
7. [ ] Defer and separately scope server-side transactional email send (Option A) — do not bundle
       into this pass.
