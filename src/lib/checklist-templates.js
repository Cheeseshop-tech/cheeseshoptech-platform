/* Campaign checklist templates — pure data, no imports.
 * MOVED here from src/lib/campaigns.js on 2026-09-26, verbatim, so the templates can be TESTED.
 * campaigns.js transitively imports a .jsx file, so nothing in it loads under Node — which meant
 * the most consequential invariants in the campaign system had no way to be checked:
 *
 *   - a campaign type whose lifecycle has a gate must have at least one REQUIRED item, or
 *     readinessOf() can never report ready and the campaign is stuck before the gate forever
 *     (an empty checklist reads as not-ready: `req.length > 0 && ...`);
 *   - retyping a campaign must not orphan its ticks, which are stored against item IDS.
 *
 * Same move, same reason, as src/lib/lifecycles.js the same day. campaigns.js re-exports
 * everything here, so no importer changes. Tested in scripts/test-lifecycles.mjs.
 */
// ---- Checklist templates ------------------------------------------------------------------
// Rick's call (2026-08-03): the template SEEDS a campaign's checklist, then it's editable per
// campaign — add items, hide template items you don't need, all persisted in the state overlay.
// The email template is generalized from FALL_TASTING_LAUNCH_RUNBOOK.md's real work-back
// schedule, so it encodes what actually blocks a send here (DMARC and an ESP with open tracking
// are the two that have bitten this account before).
// Shared "Discipline" checklist items — forward-looking reminders distilled from the Standing
// Lessons below (2026-09-21, ACE Fall Show post-mortem template Rick uploaded). Appended to
// every checklist template so the same operational gaps get flagged on every campaign type, not
// just events. Left non-required (Rick, 2026-09-21): required would retroactively flag every
// already-launched campaign as "not ready" the moment this shipped — these are visible, checkable
// reminders instead, not a launch-gate blocker.
export const DISCIPLINE_ITEMS = [
  { id: "one-system", group: "Discipline", label: "All outreach/tracking lives in ONE system — no parallel spreadsheet", required: false },
  { id: "owner-checkpoint", group: "Discipline", label: "Every execution item has a named owner + confirm-it-happened checkpoint", required: false },
  { id: "fallback", group: "Discipline", label: "Must-make connections have a fallback plan, not just \"we'll catch them\"", required: false },
  { id: "tested-e2e", group: "Discipline", label: "Key systems tested end-to-end under real conditions, not a click-test", required: false },
];

export const CHECKLIST_TEMPLATES = {
  email: [
    { id: "offer", group: "Decide", label: "Offer + mechanic locked", required: true },
    { id: "audience", group: "Decide", label: "Audience list assembled", required: true },
    { id: "copy", group: "Decide", label: "Email copy chosen (A/B decided)", required: true },
    { id: "approval", group: "Decide", label: "Client campaign approval", required: true },
    { id: "form", group: "Build", label: "CTA target live (form / landing page)", required: true },
    { id: "blog", group: "Build", label: "Supporting content published", required: false },
    { id: "fulfillment", group: "Build", label: "Fulfillment confirmed (packing + shipping)", required: true },
    { id: "dmarc", group: "Wire", label: "DMARC published on sending domain", required: true },
    { id: "esp", group: "Wire", label: "ESP account open + sender verified", required: true },
    { id: "suppression", group: "Wire", label: "Suppression pass done (live threads, unsubs, dupes)", required: true },
    { id: "seed", group: "Wire", label: "Outreach console seeded with the cohort", required: false },
    { id: "test", group: "Test", label: "End-to-end test send verified", required: true },
    { id: "date", group: "Test", label: "Send date locked (go / no-go)", required: true },
    { id: "schedule", group: "Launch", label: "Email 1 scheduled in the ESP", required: true },
    ...DISCIPLINE_ITEMS,
  ],
  social: [
    { id: "concept", group: "Decide", label: "Concept + posting cadence agreed", required: true },
    { id: "assets", group: "Build", label: "Assets pulled from the Media Hub", required: true },
    { id: "captions", group: "Build", label: "Captions written + approved", required: true },
    { id: "approval", group: "Decide", label: "Client approval on the batch", required: true },
    { id: "scheduled", group: "Launch", label: "Posts scheduled", required: true },
    ...DISCIPLINE_ITEMS,
  ],
  // Distributor-anchored (2026-09-26). Groups are the three PHASES Rick described, so the checklist
  // reads as the campaign's own plan. Only Setup items are required, because the gate is the line
  // into Connect ("that gets checked off, and then the UI should advance"); Connect and Execute
  // items are tracked, not gating.
  //
  // IDS ARE REUSED FROM THE ENRICHMENT TEMPLATE where the meaning carries over (source, priority,
  // script, calls, writeback). Checklist ticks are stored against item ids, so reusing them is what
  // lets ace-fall-show-2026 be retyped enrichment → distributor without its ticks vanishing from
  // view. scripts/test-lifecycles.mjs asserts every enrichment id exists here.
  //
  // `calls` changes from required to NOT required, deliberately. In an enrichment pass the calls
  // are the build. In a distributor campaign they happen IN Connect — requiring them to ENTER
  // Connect would lock the campaign in Setup forever.
  distributor: [
    { id: "strategy", group: "Setup", label: "Campaign strategy + offer set", required: true },
    { id: "materials", group: "Setup", label: "Sales materials created and embedded in the app (sell sheet, pricing, spec sheets)", required: true },
    { id: "reps", group: "Setup", label: "Distributor reps selected onto the roster", required: true },
    { id: "key-accounts", group: "Setup", label: "Each rep's key customers picked", required: true },
    { id: "territories", group: "Setup", label: "Each rep's territory assigned (and pushed to HubSpot)", required: true },
    { id: "source", group: "Setup", label: "Target account list assembled + gaps identified", required: true },
    { id: "priority", group: "Setup", label: "Call priority order set", required: true },
    { id: "script", group: "Setup", label: "Call script / ask drafted", required: true },
    { id: "calls", group: "Connect", label: "Every rep called", required: false },
    { id: "introductions", group: "Connect", label: "Each rep introduced to their key accounts", required: false },
    { id: "writeback", group: "Connect", label: "Call results written back to the CRM", required: false },
    { id: "meetings", group: "Execute", label: "Meetings booked", required: false },
    { id: "closed", group: "Execute", label: "Sales closed / POs received", required: false },
    { id: "new-items", group: "Execute", label: "New items placed — count logged in Results", required: false },
    { id: "new-customers", group: "Execute", label: "New customers confirmed (relationship = Active customer in HubSpot)", required: false },
    ...DISCIPLINE_ITEMS,
  ],
  enrichment: [
    { id: "source", group: "Build", label: "Source list assembled + gaps identified", required: true },
    { id: "priority", group: "Build", label: "Call priority order set", required: true },
    { id: "script", group: "Build", label: "Call script / ask drafted", required: true },
    { id: "calls", group: "Run", label: "Calls completed", required: true },
    { id: "writeback", group: "Run", label: "Results written back to the CRM", required: true },
    ...DISCIPLINE_ITEMS,
  ],
  // Trade shows / on-site activations — modeled on the "Industry Show / Campaign Planning"
  // template Rick uploaded (2026-09-21), built from the ACE Fall Show 2026 post-mortem.
  event: [
    { id: "outreach-plan", group: "Workstreams", label: "Outreach / enrichment calling — plan, owner, tracking method set", required: true },
    { id: "capture-tool", group: "Workstreams", label: "On-site capture tool selected + process defined", required: true },
    { id: "promo-plan", group: "Workstreams", label: "Promo / incentive — approval chain, publish + promote plan set", required: true },
    { id: "swag-plan", group: "Workstreams", label: "Swag / giveaways assembled + distribution plan set", required: true },
    { id: "ambassador-plan", group: "Workstreams", label: "Ambassador / partner activation — role + asks defined", required: true },
    { id: "followup-plan", group: "Workstreams", label: "Follow-up plan set (recap emails, next-step cadence)", required: true },
    { id: "arrival-locked", group: "Pre-event checklist", label: "Arrival time locked in — booth-ready 30–45 min before doors open", required: true },
    { id: "promo-signoff", group: "Pre-event checklist", label: "Promo / incentive has full sign-off (internal + partner) before the event", required: true },
    { id: "capture-tested", group: "Pre-event checklist", label: "On-site capture tool tested end-to-end, including under weak wifi/signal", required: true },
    { id: "recap-tested", group: "Pre-event checklist", label: "Recap/follow-up automation tested for a real send-through, not just a click-test", required: true },
    ...DISCIPLINE_ITEMS,
    { id: "dayof-log", group: "Day-of & wrap-up", label: "Day-of execution log captured (contacts made, who was missed, what broke)", required: false },
    { id: "results-captured", group: "Day-of & wrap-up", label: "Results captured (new contacts, deals/POs, uptake, comparison to past events)", required: false },
    { id: "gap-analysis", group: "Day-of & wrap-up", label: "Gap analysis done (planned vs. executed vs. left undone, one row per workstream)", required: false },
  ],
};
export const templateFor = (type) => CHECKLIST_TEMPLATES[type] || [];
