/* Campaign lifecycles — ONE definition of what statuses exist and what each one MEANS.
 *
 * Design: docs/DESIGN_PER_TYPE_LIFECYCLES_2026-09-26.md
 *
 * WHY THIS FILE EXISTS. Before 2026-09-26 every campaign shared one lifecycle
 * (draft → building → ready → launched → complete), and nine files compared `status` against
 * those literal strings. Rick then described how a distributor-anchored campaign actually runs:
 * Setup → Connect → Execute → Complete. Adding those words the obvious way — teaching each of the
 * nine files the new strings — fails silently in the one file someone forgets. The sanitizer in
 * campaign-state.js, for instance, would have DROPPED "connect" without a word, and the campaign
 * would have reverted to its old status on the next save.
 *
 * So every step declares a KIND, and code outside this file asks about the kind:
 *
 *   planning — being built, not in market      ("in flight" on the home dashboard)
 *   live     — in market, the work is happening ("live campaigns")
 *   closed   — finished, archived               (Past campaigns)
 *
 * Connect and Execute are both `live`, so every existing "is it live?" question answers correctly
 * without learning either word. The next campaign type is a registry edit here, not a hunt.
 *
 * scripts/test-lifecycles.mjs enforces the invariants AND fails the build if a status literal
 * comparison appears anywhere outside this file. That guard is the point: a consumer written six
 * months from now that compares `status === "launched"` would otherwise misclassify silently.
 *
 * NO IMPORTS on purpose — this is read by Netlify functions (validation) and the browser
 * (behaviour) alike, and must stay trivially bundleable for both.
 */

/**
 * `gated` — this step cannot be ENTERED until every required checklist item is done. That is the
 * 2026-08-03 "the checklist is a real gate" rule, declared per step instead of hard-wired to
 * "ready" inside canAdvanceTo().
 *
 * `next` — the label on the single next-action button while sitting at this step.
 */
export const LIFECYCLES = {
  generic: [
    { id: "draft",    label: "Draft",           kind: "planning", tone: "muted",   next: "Start building",       blurb: "Idea captured, nothing built yet." },
    { id: "building", label: "Building",        kind: "planning", tone: "info",    next: "Mark ready to launch", blurb: "Assets and audience in progress." },
    { id: "ready",    label: "Ready to launch", kind: "planning", tone: "warning", next: "Launch",               blurb: "Every required task is done.", gated: true },
    { id: "launched", label: "Launched",        kind: "live",     tone: "success", next: "Close out",            blurb: "In market, results accruing.", gated: true },
    { id: "complete", label: "Complete",        kind: "closed",   tone: "outline", next: null,                   blurb: "Closed out, results final." },
  ],

  // Rick, 2026-09-26. Setup: strategy, sales materials, reps, their key customers and territories.
  // Connect: the phone calls — connecting reps to accounts (NOT enrichment; he corrected himself).
  // Execute: meetings, sales closed, new items, new customers.
  //
  // Only the step INTO Connect is gated: "that gets checked off, and then the UI should advance."
  // Connect → Execute is deliberately ungated in v1 (decided 2026-09-26): what "connected" means
  // is not settled yet, and a gate on an undefined measure blocks either nothing or everything.
  distributor: [
    { id: "setup",    label: "Setup",    kind: "planning", tone: "info",    next: "Start connecting",  blurb: "Strategy, sales materials, reps, their key customers and territories." },
    { id: "connect",  label: "Connect",  kind: "live",     tone: "warning", next: "Move to execution", blurb: "Calling reps, connecting them to their accounts.", gated: true },
    { id: "execute",  label: "Execute",  kind: "live",     tone: "success", next: "Close out",         blurb: "Meetings, closed sales, new items, new customers." },
    { id: "complete", label: "Complete", kind: "closed",   tone: "outline", next: null,                blurb: "Closed out, results final." },
  ],
};

/**
 * Campaign TYPES — moved here from src/lib/campaigns.js on 2026-09-26 so the server can import the
 * same list the UI uses. campaigns.js imports auth and fetch helpers, so a Netlify function cannot
 * import it; this file has no imports, so both sides can. campaigns.js re-exports this.
 *
 * Before the move, campaign-defs.js kept its own copy with a comment saying functions "bundle
 * separately from the Vite app" and so could not import. That was never true — ai-compose.js has
 * imported from src/lib throughout, and an esbuild bundle proved it on 2026-09-26. The belief is
 * why these duplicate lists existed.
 *
 * `distributor` is FIRST. Two reasons: the pill row lands on CAMPAIGN_TYPES[0], and landing on
 * Email every visit is why Rick concluded on 2026-09-26 that his enrichment campaigns did not
 * exist; and the house rule is "distributors first" — distributors multiply reach, so they are
 * the channel worth the most solo-seller time (Claude best Practice manual, Terms). Reordering is
 * a one-line change if that call is wrong.
 */
export const CAMPAIGN_TYPES = [
  { id: "distributor", label: "Distributor Campaigns", blurb: "Reps, their key customers and territories — set up, connect, execute.", callConsole: true },
  { id: "email", label: "Email Campaigns", blurb: "Sends, sequences, and the launch gate." },
  { id: "social", label: "Social Media", blurb: "Post batches and social pushes." },
  { id: "enrichment", label: "Enrichment Campaigns", blurb: "Phone passes that fill contact gaps before a send.", callConsole: true },
  { id: "event", label: "Trade Shows & Events", blurb: "Industry shows and on-site activations, booth to follow-up." },
];
export const CAMPAIGN_TYPE_IDS = CAMPAIGN_TYPES.map((t) => t.id);

/**
 * Does this type of campaign work a CALL CONSOLE — the gap list, the call rows, the people-spine
 * pickers, per-campaign questions, the HubSpot push?
 *
 * Capability, not identity (2026-09-26). campaign-detail.jsx asked `c.type === "enrichment"` in
 * nine places when what it meant was "does this campaign make calls". Found while retyping
 * ace-fall-show-2026 to `distributor`: that retype would have silently removed Ace's entire
 * ~252-prospect call list — no error, just a read-only list where the working surface had been.
 * Same disease as the status literals this module exists to cure, one level up.
 */
export const hasCallConsole = (type) => !!CAMPAIGN_TYPES.find((t) => t.id === type)?.callConsole;

/** Which lifecycle a campaign TYPE follows. Anything not listed is generic — including types
 *  that do not exist yet, so a new type behaves sanely before anyone remembers to add it here. */
const TYPE_LIFECYCLE = { distributor: "distributor" };

export function lifecycleFor(type) {
  return LIFECYCLES[TYPE_LIFECYCLE[type] || "generic"];
}

/** Every step id any lifecycle uses. The server sanitizers accept exactly this set, so there is no
 *  status the UI can offer that the store would silently drop. */
export const ALL_STEP_IDS = [...new Set(Object.values(LIFECYCLES).flat().map((s) => s.id))];

/** The step record for an id, from ANY lifecycle. Safe because a shared id must mean the same
 *  kind everywhere (invariant I2, tested). */
const BY_ID = Object.fromEntries(Object.values(LIFECYCLES).flat().map((s) => [s.id, s]));

/**
 * Resolve any stored status to a valid step of THIS type's lifecycle. Pure, total, idempotent.
 *
 *   1. Already a step of this lifecycle → unchanged.
 *   2. A step of some OTHER lifecycle → mapped by kind to this lifecycle's first step of that kind.
 *      This is what makes retyping a campaign safe: ace-fall-show-2026 was `enrichment` at
 *      `building`; retyped to `distributor`, `building` (planning) resolves to `setup`.
 *   3. Unknown or missing → this lifecycle's first step.
 *
 * Nothing is rewritten in storage. The stored value changes only when Rick next advances it.
 */
export function normalizeStatus(type, status) {
  const steps = lifecycleFor(type);
  if (steps.some((s) => s.id === status)) return status;
  const known = BY_ID[status];
  if (known) {
    const sameKind = steps.find((s) => s.kind === known.kind);
    if (sameKind) return sameKind.id;
  }
  return steps[0].id;
}

/** The step a campaign is at, normalized to its own lifecycle. */
export function stepOf(campaign) {
  const steps = lifecycleFor(campaign?.type);
  const id = normalizeStatus(campaign?.type, campaign?.status);
  return steps.find((s) => s.id === id);
}

/** THE question every consumer outside this file should ask. */
export function kindOf(campaign) {
  return stepOf(campaign).kind;
}

export const isLive = (c) => kindOf(c) === "live";
export const isClosed = (c) => kindOf(c) === "closed";
export const isPlanning = (c) => kindOf(c) === "planning";

/** Planning, AND at a gated step — i.e. declared ready, not yet in market. The generic `ready`
 *  step. A distributor campaign never sits here: it crosses the gate straight into Connect. Used by
 *  the pill stat row, which previously compared `status === "ready"`. */
export const isAwaitingLaunch = (c) => { const s = stepOf(c); return s.kind === "planning" && !!s.gated; };
/** Planning, before the gate — still being built. Was `status === "building" || "draft"`. */
export const isBuilding = (c) => { const s = stepOf(c); return s.kind === "planning" && !s.gated; };

/** True when a step id is a closing step. Replaces `id === "complete"` checks, which would still
 *  work today but encode the assumption this module exists to remove. */
export const isClosingStep = (id) => BY_ID[id]?.kind === "closed";

/**
 * Does moving to `status` require the checklist to be complete?
 *
 * The gate is a LINE, not a per-step property. The first `gated` step marks it, and every step at
 * or past it is behind it — except the closed step, which is always reachable (Rick, 2026-09-21:
 * retiring a cancelled campaign must never be blocked by an unfinished checklist).
 *
 * Getting this wrong was a real hole in the first draft of this file: with `gated` read per step,
 * Execute (not itself gated) could be reached straight from Setup, skipping the Connect gate
 * entirely. "Connect → Execute is ungated" means no NEW condition once past the line — not that
 * Execute is reachable without crossing it.
 *
 * For the generic lifecycle this reproduces canAdvanceTo()'s previous behaviour exactly: `ready`
 * and `launched` gated, `complete` exempt, everything before `ready` free. Tested.
 */
export function requiresReadiness(type, status) {
  const steps = lifecycleFor(type);
  const target = steps.find((s) => s.id === normalizeStatus(type, status));
  if (!target || target.kind === "closed") return false;
  const line = steps.findIndex((s) => s.gated);
  if (line < 0) return false;
  return steps.indexOf(target) >= line;
}

/** The step after the current one in the campaign's own lifecycle, or null at the end. */
export function nextStepFor(campaign) {
  const steps = lifecycleFor(campaign?.type);
  const i = steps.findIndex((s) => s.id === normalizeStatus(campaign?.type, campaign?.status));
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
}

/** Label/tone lookups that work for any step id in any lifecycle. */
export const stepLabel = (id) => BY_ID[id]?.label || id;
export const stepTone = (id) => BY_ID[id]?.tone || "muted";
export const stepMeta = (id) => BY_ID[id] || null;

/** Maps covering EVERY step of every lifecycle. The badge code in four components reads
 *  `STATUS_TONE[c.status]`; built from the generic lifecycle alone, a "connect" badge would have
 *  fallen back to the raw id with no colour. Built from all steps, it just works. */
export const STATUS_TONE = Object.fromEntries(Object.values(BY_ID).map((s) => [s.id, s.tone]));
export const STATUS_LABEL = Object.fromEntries(Object.values(BY_ID).map((s) => [s.id, s.label]));

/** The status a newly created campaign of this type starts at. Replaces a hardcoded "draft" in
 *  campaign-defs.js, which would have created every distributor campaign in a status its own
 *  lifecycle does not have. */
export const initialStatusFor = (type) => lifecycleFor(type)[0].id;
