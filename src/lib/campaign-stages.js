/* How the campaign detail page changes shape as a campaign moves through its lifecycle.
 *
 * WHY THIS FILE EXISTS. Before 2026-09-26 the detail page was IDENTICAL at every status. Nine
 * sections, fixed order, fully expanded, whether the campaign was a draft or finished. Only three
 * things in the whole view reacted to status: the badge tone, one description string, and whether
 * Results showed an empty state.
 *
 * Rick, 2026-09-26: "once all are checked and approved it remains a long list still visible and
 * you have to scroll past it to get to the next stage functions."
 *
 * He is describing an 18-row launch checklist sitting permanently at position 2 of 9, above the
 * call console he uses every day at position 6. The checklist finished weeks ago and still costs
 * a screen of scrolling on every visit.
 *
 * This file is the fix, as DATA rather than as a rewrite: a table of (section, status) -> display
 * mode. The sections, panels, state shape and gate logic are all untouched.
 *
 * Design record: docs/CAMPAIGN_UI_REDESIGN_2026-09-26.md
 */

/** The four ways a section can render.
 *  `summary` NEVER hides data — it folds a section to one line showing its own state, one click
 *  from open. That distinction is the whole safety of this design: nothing becomes unreachable,
 *  it just stops costing a screen of scrolling once its stage has passed. */
export const MODES = ["primary", "secondary", "summary", "hidden"];

/** Sections in their natural (build-time) order. `order` is the tiebreak WITHIN a mode, so the
 *  page reads top-to-bottom sensibly once primaries have floated up. */
export const SECTION_ORDER = [
  "updates", "checklist", "strategy", "content",
  "documents", "prospects", "repvisits", "salesreps", "results",
];

/* The table. Read a column to see the page at that status.
 *
 * The `launched` column is the one that matters most and the one that was most wrong: the call
 * console rises to the top, Results sits beside it, and the four build-time sections fold to four
 * one-line summaries.
 *
 * `repvisits` stays SECONDARY at launched, deliberately — Rick, 2026-09-26, asked for this
 * explicitly. On an enrichment campaign the rep roster is live working data, not build-time
 * setup: reps get added and their territories fill in DURING the calls. Folding it would hide a
 * surface still being written to, which is the opposite of the point.
 *
 * `salesreps` mirrors `repvisits` for the same reason; it is already conditionally rendered on
 * the campaign having sales reps at all.
 */
const TABLE = {
  //              draft        building     ready        launched     complete
  updates:      ["secondary", "secondary", "secondary", "secondary", "secondary"],
  checklist:    ["secondary", "primary",   "primary",   "summary",   "summary"],
  strategy:     ["primary",   "secondary", "summary",   "summary",   "summary"],
  content:      ["hidden",    "primary",   "secondary", "summary",   "summary"],
  documents:    ["hidden",    "secondary", "secondary", "summary",   "summary"],
  prospects:    ["hidden",    "secondary", "secondary", "primary",   "summary"],
  repvisits:    ["hidden",    "secondary", "secondary", "secondary", "summary"],
  salesreps:    ["hidden",    "secondary", "secondary", "secondary", "summary"],
  results:      ["hidden",    "hidden",    "hidden",    "primary",   "primary"],
};

const STATUS_INDEX = { draft: 0, building: 1, ready: 2, launched: 3, complete: 4 };

/** The mode a section renders in at a given status.
 *  Unknown sections default to `secondary` — a section this table has never heard of should show
 *  up normally rather than vanish. A new section that nobody remembered to add here must be
 *  visible, not silently hidden; that failure mode is how features become invisible. */
export function modeFor(sectionId, status) {
  const row = TABLE[sectionId];
  if (!row) return "secondary";
  const i = STATUS_INDEX[status];
  if (i == null) return "secondary"; // unknown status — show everything rather than guess
  return row[i] || "secondary";
}

/** Render order: primaries first, then secondaries, then folded summaries. Hidden sections are
 *  dropped by the caller. Within a band, the natural build order is preserved so the page still
 *  reads like a sequence rather than a shuffled pile. */
export function orderFor(sectionId, status) {
  const mode = modeFor(sectionId, status);
  const band = { primary: 0, secondary: 1000, summary: 2000, hidden: 3000 }[mode] ?? 1000;
  const within = SECTION_ORDER.indexOf(sectionId);
  return band + (within < 0 ? SECTION_ORDER.length : within);
}

/** Should this section be open?
 *
 *  Auto-fold with a remembered override (Rick's call, 2026-09-26): a section folds itself when
 *  its stage passes, but the moment he opens or closes one by hand, that choice sticks for that
 *  campaign and the automatic rule stops arguing with him. Tidy by default, never fights twice.
 *
 *  `override` is undefined until he touches it — deliberately tri-state rather than a boolean, so
 *  "never touched" stays distinguishable from "explicitly closed". A boolean would make the two
 *  identical and the auto rule could never tell whether it was allowed to act.
 */
export function isOpen(sectionId, status, override) {
  if (typeof override === "boolean") return override;
  return modeFor(sectionId, status) !== "summary";
}

/** True when the section should not render at all for this status. */
export function isHidden(sectionId, status) {
  return modeFor(sectionId, status) === "hidden";
}

/* ---- The next action ------------------------------------------------------------------------
 *
 * Before 2026-09-26 the status control was five equal pills. When the checklist cleared, the card
 * turned green, the label changed to "Clear to launch", and a pill Rick then had to find and
 * click became un-disabled. The system knew the answer and waited to be told.
 *
 * That is the same shape as the deploy script that knew nothing had shipped and printed "Pushed":
 * a system holding the answer and declining to say it plainly.
 *
 * The fix is NOT to auto-advance. Status stays a human assertion — that is the 2026-08-03
 * "the checklist is a real gate" decision and it is correct: `ready` means Rick says it is ready.
 * What changes is that the page states exactly one next step, and when that step is blocked it
 * says what is blocking it instead of greying out in silence.
 *
 * The five pills remain, demoted to an override for moving backwards.
 */

/** The single next step from a given status, or null when there isn't one.
 *  `complete` is the end of the line: a finished campaign has no next action.
 *  Returns { to, label, blurb } — `to` is the status it moves to. */
export function nextActionFor(status) {
  switch (status) {
    case "draft":    return { to: "building",  label: "Start building",       blurb: "Move into build — work the checklist, content and audience." };
    case "building": return { to: "ready",     label: "Mark ready to launch", blurb: "Every required task is done. Say it's ready." };
    case "ready":    return { to: "launched",  label: "Launch",               blurb: "Start the campaign. Results begin accruing." };
    case "launched": return { to: "complete",  label: "Close out",            blurb: "Wrap it up and file it in Past campaigns." };
    default:         return null; // complete, or a status we don't know
  }
}

