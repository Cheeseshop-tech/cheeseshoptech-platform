// Campaign "commitments" computation — the pure logic behind the accountability automation
// spec'd in docs/CAMPAIGN_ACCOUNTABILITY_AUTOMATION_SPEC_2026-09-21.md (Phase 2: computation
// layer, no UI/email yet — see that doc for the full plan and the decisions behind this shape).
//
// Deliberately reuses data the app already has instead of adding new tracking (Rick's ask was
// automation ON TOP of Campaign Management, not a second system to keep in sync):
//   - "approval needed"      -> an incomplete checklist item whose id is "approval"
//   - "stalled"               -> no state activity (stateUpdatedAt) in `stalledDays`
//   - "deadline approaching"  -> campaign `end` within `deadlineDays`, required work still open
// Every campaign passed in is expected to already be MERGED (mergeCampaign() output) — this
// module never fetches or writes state itself, so it stays trivially testable against a plain
// array of campaign objects.

import { isClosed, readinessOf } from "./campaigns.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days between two dates, rounded down — positive when `to` is in the future of `from`. */
function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Approval-needed: an open (not `complete`) campaign whose checklist carries an item literally
 * id `"approval"` that isn't done yet. Only email/social templates have this item today — see
 * the spec's "flagging now so it doesn't get missed" note about enrichment/event.
 */
function approvalNeeded(campaigns) {
  const out = [];
  for (const c of campaigns) {
    if (isClosed(c)) continue;
    const item = (c.checklist || []).find((t) => t.id === "approval" && !t.done);
    if (item) out.push({ campaign: c, item, reason: `Needs client approval — "${item.label}"` });
  }
  return out;
}

/**
 * Stalled: an open campaign with no recorded state activity (`stateUpdatedAt` — stamped
 * server-side on every checklist tick, status change, or comment) in `stalledDays`. A campaign
 * that has NEVER had any state activity (stateUpdatedAt null — still sitting exactly as seeded)
 * is treated as stalled from its definition's `start` date instead, so a campaign nobody has
 * touched since it was created doesn't silently escape this check just for lacking a timestamp.
 */
function stalled(campaigns, { now, stalledDays }) {
  const out = [];
  for (const c of campaigns) {
    if (isClosed(c)) continue;
    const since = c.stateUpdatedAt ? new Date(c.stateUpdatedAt) : (c.start ? new Date(c.start) : null);
    if (!since || Number.isNaN(since.getTime())) continue; // nothing to measure against
    const idleDays = daysBetween(since, now);
    if (idleDays >= stalledDays) {
      out.push({ campaign: c, idleDays, reason: `No activity in ${idleDays} day${idleDays === 1 ? "" : "s"}` });
    }
  }
  return out;
}

/**
 * Deadline approaching: an open campaign whose `end` date is within `deadlineDays` (including
 * already-past, so a missed deadline still surfaces rather than silently aging out) AND whose
 * required checklist work isn't done yet (readinessOf().ready === false) — a campaign that's
 * fully ready just hasn't been formally launched/closed, which isn't a commitment at risk.
 */
function deadlineApproaching(campaigns, { now, deadlineDays }) {
  const out = [];
  for (const c of campaigns) {
    if (isClosed(c) || !c.end) continue;
    const end = new Date(c.end);
    if (Number.isNaN(end.getTime())) continue;
    const daysUntil = daysBetween(now, end);
    if (daysUntil > deadlineDays) continue;
    const r = readinessOf(c);
    if (r.ready) continue; // required work is done — not at risk, regardless of the date
    out.push({
      campaign: c,
      daysUntil,
      reason: daysUntil < 0
        ? `End date passed ${-daysUntil} day${-daysUntil === 1 ? "" : "s"} ago, ${r.requiredTotal - r.requiredDone} required task${r.requiredTotal - r.requiredDone === 1 ? "" : "s"} still open`
        : `Ends in ${daysUntil} day${daysUntil === 1 ? "" : "s"}, ${r.requiredTotal - r.requiredDone} required task${r.requiredTotal - r.requiredDone === 1 ? "" : "s"} still open`,
    });
  }
  return out;
}

/**
 * Compute all four commitment categories for a list of MERGED campaigns (mergeCampaign() output).
 * `all` is the deduped union across categories, keyed by campaign id, for the weekly digest and
 * the panel's "everything open" view — a campaign can appear in more than one category (e.g.
 * stalled AND approval-needed), `all` collapses that to one row per campaign.
 */
export function computeCommitments(campaigns, opts = {}) {
  const now = opts.now || new Date();
  const stalledDays = opts.stalledDays ?? 6;
  const deadlineDays = opts.deadlineDays ?? 7;

  const list = campaigns || [];
  const result = {
    approvalNeeded: approvalNeeded(list),
    stalled: stalled(list, { now, stalledDays }),
    deadlineApproaching: deadlineApproaching(list, { now, deadlineDays }),
  };

  const byId = new Map();
  for (const key of ["approvalNeeded", "stalled", "deadlineApproaching"]) {
    for (const entry of result[key]) {
      const existing = byId.get(entry.campaign.id);
      if (existing) existing.reasons.push(entry.reason);
      else byId.set(entry.campaign.id, { campaign: entry.campaign, reasons: [entry.reason] });
    }
  }
  result.all = [...byId.values()];
  result.computedAt = now.toISOString();
  return result;
}
