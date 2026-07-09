# HANDOFF — MT Email Campaign (Monti Trentini · Asiago)

**Last updated:** 2026-07-06 by Claude (session with Richard)
**Status:** Live, mid-launch — batch 1 of 3 sent, on schedule

Scope note: this handoff is scoped to the **Monti Trentini email/HubSpot campaign workstream
only** (this folder). It is a sibling to, not a replacement for, the platform-wide
`HANDOFF.md` at the Agency Build root — that file tracks the CST platform build, which
continues independently ([[cst-build-strategy]]). Pull this file, not the root one, into a new
chat scoped to campaign work.

---

## Where we left off

Touch 1 (of the 3-touch Asiago sequence) launched today. Batch 1 of 3 — the first 10 of 31
send-ready contacts — went out via HubSpot 1:1 template send (Buyer Intro template + tracked
sell-sheet Documents link + a 4-day follow-up To-do per contact). Rick sent every email himself
in the HubSpot UI; Claude coached contact-by-contact (name, shop, email, flow reminder) rather
than driving the browser. The planned bounce-checkpoint (pause after 3–4 sends) held clean.

Two CRM fixes happened mid-send, both closed same-session: Citarella's buyer Heather Celentano
had left — her contact was flagged FORMER (not deleted) and a new contact, Kristen Bausa, was
created and associated to the company; the first send to her bounced on an email typo
(`kbausa@` → corrected to `kristen.bausa@citarella.com`), resent, delivered clean — the only
bounce of the day. Separately, "Luigi's Delicatessen" (flagged back on 7/3 as having zero web
footprint) was confirmed out of business and deleted outright from HubSpot (company + contact) —
the one case today where delete was the right call instead of flag-don't-delete, since the
business itself no longer exists.

Net result: exactly 10 sends out, and the CRM is a little cleaner than it was this morning.

---

## What's NOT done / known broken

- **20 of 31 contacts not yet sent.** Two more batches planned: Tuesday 7/7 and Wednesday 7/8.
- **Anne Saxelby's old contact** (deceased, no email) still needs the same flag-treatment Heather
  got — not urgent since she was never in the send list, but it's stale data.
- **C'est Cheese company** still needs renaming to Cheese Shop Santa Barbara (successor business,
  same owners, same address) — cosmetic, non-blocking.
- **23 named decision-makers still have no email** — separate enrichment queue from this send
  (see `TOUCH1_AUDIENCE_2026-07-03.md` for the full list and confidence tiers already researched).
- **195 of the 241 channel-tagged cheese-shop companies have zero contacts at all** — the bigger
  pipeline gap behind this campaign; systematic contact-finding (web/Apify) is unstarted.
- **DMARC missing** on montitrentini-usa.com (SPF + DKIM are live) — not blocking at 31 sends,
  but should be added before volume scales up.
- **OpenPhone Business number** still not set up (Rick's action) — sell sheet and signatures are
  missing a phone line until it exists.

---

## Open items requiring decision or input

- **Stefano's SEAFRIGO freight answer** — still outstanding. Doesn't block Touch 1 (pricing is
  "by inquiry" throughout), but will start mattering once shops reply asking for a number.
- **Batch 2 timing** — plan says Tuesday 7/7. Confirm Rick is still good for that, or whether the
  bounce/reply volume from batch 1 changes the pace.
- **Anne Saxelby / C'est Cheese cleanup** — low-stakes, just needs 5 minutes in the HubSpot UI
  whenever Rick has a moment; no decision required, just execution.

---

## What's the likely next step

Send batch 2 (the next 10 of the remaining 20) using the same contact-by-contact coaching flow
that worked today — Rick drives, Claude reads off the next name/shop/email and reminds of the
send flow, pause-and-check-bounces after every 3–4. Before that batch starts: skim the sales@
Gmail inbox and HubSpot contact timelines for any replies from today's 10 (any "send a sample"
reply gets logged as a sample-sent date the same day it arrives — this is the one rule that
never slides). Touch 2 (Day 4, ~Fri 7/10) will start queuing automatically via the To-do tasks
created on each Touch 1 send — no separate build needed there, just execute when the tasks come
due.

---

## Files that matter

- `LAUNCH_DAY_2026-07-06.md` — the live day-of record; batch-by-batch status goes here, not just
  in chat. **This is the single source of truth for "how many have actually been sent."**
- `CAMPAIGN_BUILD_LOG.md` — the full build history for this campaign (setup, story, deliverables
  checklist, decisions log, reusable lessons, dated log entries) — start here for full context.
- `TOUCH1_AUDIENCE_2026-07-03.md` — the audience investigation: why list 17 was wrong, how the
  31 send-ready contacts were built, the enrichment work on the 23 email-gap buyers.
- `README_Campaign_Brief.md` — the campaign story, pillars, product ladder, and 4-week cadence.
- `Asiago_Cold_Email_Sequence.md` / `Asiago_Sell_Sheet.html` / `Asiago_Sell_Sheet_Email.html` —
  the actual copy and collateral.
- `Stefano_SEAFRIGO_Shipping_Request.md` — the still-open freight ask.
- `../docs/CAMPAIGN_BUILD_LOG_TEMPLATE.md` — the reusable per-client template this log was built
  from; copy it again for the next product/campaign (Grana Padano, Provolone, etc.).
- HubSpot: active list id 19 ("Asiago Touch 1 — Cheese shops"), template id 283799276 ("Monti
  Trentini — Buyer Intro"), sell sheet in Documents (tracked link).

---

## Memory updates from this session

- Updated memory `monti-asiago-campaign` (project-type) with today's launch completion, the
  Citarella contact swap, and the note that 20 contacts remain across two more batches.
- No new memory files created this session — this HANDOFF + the CAMPAIGN_BUILD_LOG are the
  durable record; memory just points at them.

---

## How to pick this back up in the next chat

Open a new chat scoped to this project (or mount the same folder). First message:

> Read `monti_asiago_campaign/HANDOFF.md` and `monti_asiago_campaign/CAMPAIGN_BUILD_LOG.md`.
> Tell me where we left off and what's the next batch to send.

---

*Template origin: `~/Claude best Practice manual/templates/HANDOFF.md`, adapted for campaign
scope per `docs/CAMPAIGN_BUILD_LOG_TEMPLATE.md` conventions.*
