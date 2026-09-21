# Campaign Accountability Automation — spec (not built)

**Date:** 2026-09-21 · **Status:** SPEC'D, NOT BUILT · **Owner:** Rick Posada

## Why

Rick's call (2026-09-21): the first round of campaigns (Fall Tasting Box, NE Contact Enrichment,
ACE Fall Show, the two ACE Endico Rep Fit cards) were process-development exercises — proving the
Campaign Management feature itself works, not a repeatable operating system yet. All five are now
closed (see the same-day fix where two of them — NE Contact Enrichment and ACE Fall Show 2026 —
turned out to have been "closed" only in a comment, not in status; both corrected retroactively).

Next step, in Rick's words: automation that (1) tracks campaign progress, (2) loops Stefano
(Monti Trentini's GM — client-side, not CST) into the process, and (3) sends automated emails to
keep campaign goals and commitments moving forward. This traces directly back to Rick's own
comment on the ACE Endico Rep Fit Discovery campaign the same day: *"Linking the team in on their
own account starting with stfano to get him to log in and check the status of outstanding tasks
would help. lets wire in an auto email as updates are made and when Stefano is needed for
approval."*

## Decisions made (2026-09-21, asked directly)

1. **Stefano's role** → upgrade from `client` to `client-admin`. He already has a real Identity
   login (`stefano@montitrentini-usa.com`, invited + accepted 2026-08-17 — see
   `docs/PROJECT_ROADMAP.md`), but `client` is read-only (`requireWriteAuth()` in
   `_write-guard.js` only accepts `admin`/`client-admin`). As plain `client` he could log in and
   *see* campaign status but couldn't check off an approval item or leave a comment. `client-admin`
   makes him an actual participant, not just a viewer.
2. **Email triggers** → all four, not one:
   - **Approval needed** — a campaign's checklist hits a "Client approval" item that's still open
     and blocking. (Recommended, picked first.)
   - **Stalled campaign** — no comment/checklist activity in ~5–7 days on an open campaign.
   - **Deadline approaching** — a campaign's `end` date is coming up with required checklist work
     still outstanding.
   - **Weekly digest** — one email, once a week, summarizing every open commitment across
     in-flight campaigns.
3. **Automation level for v1** → **draft-and-review, not fully automatic.** The automation
   prepares the email; Rick approves/sends. Explicitly not full autopilot on day one — matches the
   caution already exercised once before on this exact question (see
   `[[cst-daily-accountability-system]]`: the daily-status-email idea was deliberately kept
   Rick-prompted rather than auto-sent, for reliability reasons). Once trusted, flip to automatic.
4. **In-app panel** → yes, build one. A shared view of open commitments/approvals per campaign,
   visible to Rick and (once upgraded) Stefano — same pattern as the Agency Console's
   `ProjectStatusPanel`.

## What "commitment" means here — reuse, don't reinvent

Campaign Management already carries everything this needs; nothing new to instrument:

- **"Approval needed"** = an incomplete checklist item whose `id` is `"approval"` (email and
  social templates both already have one: `{ id: "approval", group: "Decide", label: "Client
  campaign approval"/"Client approval on the batch", required: true }`). Enrichment and event
  templates don't have a dedicated approval gate today — event's closest analog is
  `promo-signoff`. Worth deciding, when this is built, whether enrichment/event should each grow
  a real `approval` item too, or whether "approval needed" as a trigger just doesn't apply to
  those two types. Flagging now so it doesn't get missed silently.
- **"Stalled"** = `mergeCampaign()`'s `stateUpdatedAt` (== the state entry's `updatedAt`, already
  stamped server-side on every save in `campaign-state.js`) older than the threshold, on a
  campaign that isn't `complete`. No new tracking needed — every checklist tick, comment, and
  status change already touches this timestamp.
- **"Deadline approaching"** = campaign `def.end` (already on every seeded/custom campaign
  definition) within N days, checklist not fully done.
- **"Weekly digest"** = the union of the above three, computed once and formatted as one email
  instead of several.

## Architecture — fits the existing pattern, doesn't invent a new one

`docs/DASHBOARD_AUTO_UPDATE_ARCHITECTURE.md` already names this shape (scheduled Cowork task →
publish script → Netlify function → Blobs → panel reads on load, `AGENT_GATE_PASSCODE` as the
unified write credential). This feature is instance #5 of that pattern, with one addition: a
draft-email step between "computed" and "published."

```
scheduled Cowork task (e.g. daily)
   │  reads campaign-defs + campaign-state (GET, AGENT_GATE_PASSCODE)
   │  computes: approval-needed / stalled / deadline-approaching / weekly-digest-due
   ▼
scripts/publish-campaign-nudges.mjs
   │  POST + AGENT_GATE_PASSCODE
   ▼
netlify/functions/campaign-nudges.js  → validate/sanitize → Netlify Blobs (per-tenant doc)
   │  { pending: [{id, kind, campaignId, to, subject, body, computedAt}], sentLog: [...] }
   ▲
   │  GET, on page load
   ▼
New panel: "Commitments" (Campaign Management or Agency Console — TBD) — Rick and Stefano both
see open items; Rick sees a "Review & send" queue for pending drafted emails with an actual
Send button (wired to whatever email-sending path gets picked, see below — NOT auto-fired by
the scheduled task itself, per the draft-and-review decision).
```

Same non-negotiables as every other instance of this pattern: no rebuild on a data change,
degrade to last-good-state on a failed read, sanitize every field server-side, never trust a
client timestamp.

## Open question this spec does NOT resolve — email sending mechanism

Nothing in this codebase currently sends real email server-side. `NETLIFY_EMAILS_DIRECTORY` /
`NETLIFY_EMAILS_SECRET` env vars exist and a Netlify Emails function is already provisioned on
the live site, but no `emails/` template directory exists yet and nothing calls it — it's
configured, not built. Two real options once this is picked up:

- **Netlify Emails extension** — proper server-side send, works whether or not Rick's laptop/Chrome
  is open, fits the "review-then-send" queue model above (the Send button in the panel POSTs to a
  function that calls the extension). More setup (template authoring, deliverability/from-address
  config) but the more durable choice given emails will go to a real client contact.
- **Gmail MCP, browser-driven** — reuses the existing `sales@montitrentini-usa.com` Gmail
  connection this session already has. Faster to a first working send, but ties every send to a
  live Cowork session being run — not a background scheduled task on its own, which cuts against
  "automation" unless Rick is fine prompting each digest/review pass himself (which, given the
  draft-and-review decision above, may be an acceptable v1 shape — worth asking directly before
  building either path).

**Recommendation:** don't decide this by default — ask Rick which he'd rather stand up first, once
he's ready to move past this spec into Phase 1 below.

## Phased build plan

Rick's own standing rule ([[commit-button-rule]], and generally: ship first, iterate after) —
this is sequenced as four separable, independently-shippable phases rather than one big build.

1. **Stefano → client-admin.** Not code — a Netlify Identity → Users role change, a few clicks in
   the Netlify dashboard. Smallest possible first step, unblocks nothing else but is safe to do
   immediately.
2. **Computation layer.** The pure logic: given all campaigns (defs + state), compute the four
   trigger lists. No email, no new UI yet — testable against the real live data (the five closed
   campaigns plus whatever's active) before anything user-facing exists.
3. **Panel.** Surface Phase 2's output as a real "Commitments" view, gated so Rick and
   client-admin (Stefano) can both see it. This alone already delivers "progress tracking" and
   "looping Stefano in," independent of email.
4. **Draft-and-review email queue.** Once the email-sending mechanism question above is answered:
   a scheduled task populates a review queue in the panel; Rick sends. Flip to fully automatic
   later, once trusted — not part of this phase.

## Next step

Confirm the email-sending mechanism question above, then start Phase 1 (trivial) + Phase 2
(computation layer) together.
