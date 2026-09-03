// Campaigns data layer — the sales + social engine (POSITIONING: coordinated campaigns across
// retail + DTC + social). Gated to the brand team (admin/client).
//
// SHAPE (2026-08-03, HANDOFF_2026-08-03_campaign-pill-nav-and-email-lifecycle.md). A campaign is
// two halves, split the same way the CRM tab splits accounts from outreach state:
//   · DEFINITION — name, type, goal, strategy pointer, content links, audience. Seeded below,
//     versioned with the code. Strategy/content POINT OUT at the client project folder (Rick's
//     call: link, don't paste — one source of truth, no sync problem).
//   · STATE — lifecycle status, launch-readiness ticks, custom/hidden checklist items, results.
//     Lives in Netlify Blobs via netlify/functions/campaign-state.js. NOT localStorage: these
//     ticks are the real "is this ready to send" gate, so they must be shared and survive any
//     browser — the same reasoning as crm-outreach.js.
//
// The pill nav is driven by CAMPAIGN_TYPES: add an entry there and the tab grows a pill. No
// per-client code — tenant is data.

import { rolesOf } from "./auth.js";
import { readAuthedJson, writeAuthedJson } from "./authed-fetch.js";
// Segment filters are expressed in the CRM's own region/state vocabulary — reuse its
// normalizers rather than a second copy that could disagree about "NJ" vs "New Jersey".
import { regionOf, stateOf } from "./crm.js";

export function canViewCampaigns(user) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("client");
}

// ---- Type registry (drives the pill sub-nav) ---------------------------------------------
// Order here is the pill order. `id` is the campaign.type value and the tab key.
// Enrichment is its OWN type, not a checklist item on an email campaign (Rick, 2026-08-03) —
// confirmed by FALL_TASTING_LAUNCH_RUNBOOK.md, which calls the 94-account phone-outreach effort
// "a separate initiative... not part of this campaign's scope". An email campaign can still
// DEPEND on one via `dependsOn`, without owning its lifecycle.
export const CAMPAIGN_TYPES = [
  { id: "email", label: "Email Campaigns", blurb: "Sends, sequences, and the launch gate." },
  { id: "social", label: "Social Media", blurb: "Post batches and social pushes." },
  { id: "enrichment", label: "Enrichment Campaigns", blurb: "Phone passes that fill contact gaps before a send." },
];
export const typeLabel = (id) => CAMPAIGN_TYPES.find((t) => t.id === id)?.label || id;

// ---- Lifecycle ----------------------------------------------------------------------------
// draft → building → ready → launched → complete. `ready` is GATED: a campaign cannot be marked
// ready until every REQUIRED checklist item is done (see canAdvanceTo / readinessOf). That gate
// is the whole point of the checklist — status stops being a label you set and becomes a fact.
export const LIFECYCLE = [
  { id: "draft", label: "Draft", tone: "muted", blurb: "Idea captured, nothing built yet." },
  { id: "building", label: "Building", tone: "info", blurb: "Assets and audience in progress." },
  { id: "ready", label: "Ready to launch", tone: "warning", blurb: "Every required task is done." },
  { id: "launched", label: "Launched", tone: "success", blurb: "In market, results accruing." },
  { id: "complete", label: "Complete", tone: "outline", blurb: "Closed out, results final." },
];
export const LIFECYCLE_IDS = LIFECYCLE.map((s) => s.id);
export const STATUS_TONE = Object.fromEntries(LIFECYCLE.map((s) => [s.id, s.tone]));
export const STATUS_LABEL = Object.fromEntries(LIFECYCLE.map((s) => [s.id, s.label]));
/** A campaign is "live" (in market) once launched, until it's closed out. */
export const isLive = (c) => c?.status === "launched";

export const CHANNELS = { retail: "Retail", dtc: "DTC", social: "Social", foodservice: "Foodservice" };

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (n) => fmtUSD.format(n || 0);
export const compact = (n) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(n || 0);
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// ---- Checklist templates ------------------------------------------------------------------
// Rick's call (2026-08-03): the template SEEDS a campaign's checklist, then it's editable per
// campaign — add items, hide template items you don't need, all persisted in the state overlay.
// The email template is generalized from FALL_TASTING_LAUNCH_RUNBOOK.md's real work-back
// schedule, so it encodes what actually blocks a send here (DMARC and an ESP with open tracking
// are the two that have bitten this account before).
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
  ],
  social: [
    { id: "concept", group: "Decide", label: "Concept + posting cadence agreed", required: true },
    { id: "assets", group: "Build", label: "Assets pulled from the Media Hub", required: true },
    { id: "captions", group: "Build", label: "Captions written + approved", required: true },
    { id: "approval", group: "Decide", label: "Client approval on the batch", required: true },
    { id: "scheduled", group: "Launch", label: "Posts scheduled", required: true },
  ],
  enrichment: [
    { id: "source", group: "Build", label: "Source list assembled + gaps identified", required: true },
    { id: "priority", group: "Build", label: "Call priority order set", required: true },
    { id: "script", group: "Build", label: "Call script / ask drafted", required: true },
    { id: "calls", group: "Run", label: "Calls completed", required: true },
    { id: "writeback", group: "Run", label: "Results written back to the CRM", required: true },
  ],
};
export const templateFor = (type) => CHECKLIST_TEMPLATES[type] || [];

// Pennsylvania, scoped to its 5 largest cities (2026-09-03) — Rick: "add pennsylvania the 5
// largest towns including Philly" for the ACE Fall Show campaign below. Unlike NY/NJ/RI/MA/CT
// (each included in FULL on that campaign), PA is wide and mostly rural outside a few metros, so
// it's scoped down to just its 5 largest cities by population rather than the whole state — via
// segmentOf()'s `cityAllowlist`, not a display-only grouping like Long Island/NYC boroughs below.
// Defined here (before SEEDS, not next to isLongIsland/isNYCBorough further down) because SEEDS
// is a top-level const evaluated at module load, and referencing a later `const` from inside it
// would hit the temporal dead zone. Population source: apartmentlist.com / areavibes.com,
// 2026-09-03 — Philadelphia (~1.6M), Pittsburgh (~305K), Allentown (~125K), Reading/Erie both
// ~90-100K depending on source/year, order between those two doesn't matter for an allow-list.
// HEADS UP left for Rick, not silently worked around: this excludes real, large HubSpot accounts
// whose city isn't one of these 5 even though they're clearly big-chain targets — Weis Markets
// (Sunbury), The Giant Company (Carlisle), Acme Markets (Malvern) all sit in the live PA book
// today outside these cities. If those should be in scope too, this allowlist needs a rethink
// (e.g. by company size/chain instead of city) — flag it back rather than assuming.
const PA_TOP_CITIES = new Set(["philadelphia", "pittsburgh", "allentown", "reading", "erie"]);

// ---- Seeded campaign definitions ----------------------------------------------------------
// Real campaigns, real state. Fall Tasting's readiness below mirrors the runbook's verified
// table (2026-07-23): offer + audience are locked, everything else is genuinely outstanding —
// which is exactly why it is NOT "ready to launch". Ticks made in the UI are stored in Blobs and
// override the `seedDone` values here.
const SEEDS = {
  montitrentini: [
    {
      id: "fall-tasting-2026",
      type: "email",
      name: "Fall Tasting Box",
      goal: "Ship 50 free tasting boxes to qualifying specialty shops — the form doubles as distributor discovery.",
      channels: ["retail", "dtc"],
      start: "2026-08-13",
      end: "2026-09-01",
      owner: "Rick Posada",
      strategy: {
        summary:
          "Fall Assortment introduction (Asiago DOP + Apericheese) shipped free to qualifying specialty shops. " +
          "Hard cap of 50 boxes — real inventory scarcity, so the urgency stays honest and the brand voice stays " +
          "quietly confident. The qualifying form asks for buyer AND distributor contact, which makes every " +
          "response pre-qualified pipeline rather than an open-rate vanity metric, and feeds the distributors-first " +
          "channel priority.",
        path: "Email/Campaign_Brain/Fall_Tasting_Campaign/FALL_TASTING_CAMPAIGN_BRIEF.md",
        runbookPath: "Email/Campaign_Brain/Fall_Tasting_Campaign/FALL_TASTING_LAUNCH_RUNBOOK.md",
      },
      content: [
        { label: "Fall_Tasting_Email.html — full HTML send", kind: "email" },
        { label: "Fall_Tasting_Email_NEW.md — trend-hooked version (recommended)", kind: "email" },
        { label: "Fall_Tasting_AB_Comparison.md — A/B decision doc", kind: "doc" },
        { label: "Fall_Tasting_Blog_Cheese_Crystals.md — blog on-ramp (no home yet)", kind: "blog" },
        { label: "Fall_Tasting_ONE_SHEET.md — approval packet for Stefano", kind: "doc" },
      ],
      audience: {
        label: "Fall Tasting NE — qualified shops",
        size: 106,
        emails: 106,
        source: "Fall_Tasting_NE_106_Qualified_2026-07-22.xlsx",
        note: "Suppress live threads (Ace Endico, Steven) and prior Asiago-wave sends before import.",
        // SEGMENT SELECTOR — what scopes the call console and the enrichment pass that serves
        // this campaign. `exact: false` because this is a Northeast + specialty-retail FILTER
        // standing in for the hand-qualified 106. The canonical list is the xlsx above, which
        // per the runbook already carries HubSpot IDs — drop them into `companyIds` and the
        // filter is ignored, the scope becomes exact, and the UI stops flagging it.
        // Scoped BY REGION (Rick, 2026-08-03) — a campaign targets regions; state and city are
        // how the work inside gets divided, not what defines the target. `exact: false` because
        // this is still a region filter standing in for the hand-qualified 106; drop the xlsx's
        // HubSpot IDs into `companyIds` and the filter is ignored and the scope becomes exact.
        exact: false,
        companyIds: [],
        filter: { regions: ["New England", "NY Metro", "Mid-Atlantic"] },
      },
      // The nurture ladder from the runbook — offsets are Day N from send.
      sequence: [
        { day: 0, label: "Email 1 — the offer", audience: "All 106" },
        { day: 3, label: "1b — “Did this get buried?”", audience: "Non-openers of 1" },
        { day: 5, label: "2 — “[X] boxes claimed…”", audience: "Opened, no form fill" },
        { day: 9, label: "3 — “Closing soon”", audience: "No form fill, cap not reached" },
      ],
      capTarget: 50,
      dependsOn: ["ne-contact-enrichment"],
      seedStatus: "building",
      seedDone: ["offer", "audience"],
    },
    {
      id: "asiago-cold-outreach",
      type: "email",
      name: "Asiago DOP Cold Outreach",
      goal: "First cold wave — proved the template, the voice, and surfaced the first live threads.",
      channels: ["retail"],
      start: "2026-06-16",
      end: "2026-07-14",
      owner: "Rick Posada",
      strategy: {
        summary:
          "Superseded by Fall Tasting on 2026-07-15 — deliberately on hold, not resumed. It did its job: " +
          "started the pipeline, surfaced Steven and Ace Endico, and proved the template renders and the brand " +
          "voice lands. Batch 3 and the pending Touch 2s never went out.",
        path: "monti_asiago_campaign/README_Campaign_Brief.md",
        runbookPath: "monti_asiago_campaign/LAUNCH_DAY_2026-07-06.md",
      },
      content: [
        { label: "Asiago_Cold_Email_Sequence.md", kind: "email" },
        { label: "Asiago_Sell_Sheet.html", kind: "doc" },
        { label: "Asiago_Social_Launch_Batch.md", kind: "social" },
      ],
      audience: { label: "Asiago wave — batches 1–2", size: 120, source: "monti_contacts_batch1/2" },
      seedStatus: "complete",
      seedDone: ["offer", "audience", "copy", "approval", "dmarc", "esp", "suppression", "test", "date", "schedule", "form", "fulfillment"],
    },
    {
      // id stays `ne-contact-enrichment` — campaign state in Blobs is keyed by id, so renaming
      // is safe but re-keying would orphan every tick already saved against it.
      id: "ne-contact-enrichment",
      type: "enrichment",
      name: "Fall Tasting — contact enrichment (phone pass)",
      goal: "Clear the contact gaps inside the Fall Tasting target list, so those accounts can receive the send at all.",
      // Scoped to the campaign it unblocks, not to the whole account book — the call list is
      // Fall Tasting's own segment. Its own lifecycle, someone else's target list.
      serves: "fall-tasting-2026",
      channels: ["retail"],
      start: "2026-07-15",
      end: null,
      owner: "Rick Posada",
      strategy: {
        summary:
          "94 contacts across 66 companies are missing an email address or a named buyer — they cannot receive " +
          "any campaign until a phone call fills the gap. Tracked as its own initiative (the Fall Tasting runbook " +
          "explicitly scopes it out of that campaign), but Fall Tasting's reachable audience grows with every " +
          "company cleared here. Priority order: proven customers first, then channel tier, then company size.",
        path: "Email/Campaign_Brain/Fall_Tasting_Campaign/Email_to_Stefano_Rep_Request.md",
      },
      content: [],
      audience: {
        label: "Phone Outreach Needed",
        size: 94,
        companies: 66,
        source: "MT_Contacts_Master_2026-07-15.xlsx — “Phone Outreach Needed” tab",
        note: "Company size + channel enrich live from HubSpot; the contact rows are the static xlsx tab.",
      },
      seedStatus: "building",
      seedDone: ["source", "priority"],
    },
    {
      id: "fall-social-launch",
      type: "social",
      name: "Fall Tasting — social support",
      goal: "Run the Fall Tasting story on social alongside the email send.",
      channels: ["social"],
      start: "2026-08-13",
      end: "2026-09-01",
      owner: "Rick Posada",
      strategy: {
        summary:
          "Social support running in step with the Fall Tasting send — the blog on-ramp and the cheese-crystals " +
          "story are the two hooks. Not yet scoped; assets come from the Media Hub once the email is locked.",
        path: "monti_asiago_campaign/Asiago_Social_Launch_Batch.md",
      },
      content: [],
      audience: null,
      dependsOn: ["fall-tasting-2026"],
      seedStatus: "draft",
      seedDone: [],
    },
    {
      // HANDOFF_2026-09-01_ace-fall-show-booth-integration.md. Rick already created a live
      // "ACE Endico Fall Show" campaign via the New Campaign tab (campaign-defs.js, Netlify
      // Blobs) — this seed is NOT a replacement for that one. It exists so the account list is
      // correct and versioned with the code the moment this ships, independent of whatever the
      // live entry's own scope is set to; reconcile/retire one of the two once both are visible
      // in Campaign Management. `filter.states` (not a companyIds snapshot) so the list tracks
      // the live HubSpot book instead of going stale — 2026-09-01 counts: NY 133, NJ 38, RI 13,
      // MA+CT 45 (~229 total; CT and MA are already fully worked, see the 2026-09-01 task push).
      // UPDATE 2026-09-03 (Rick: "add pennsylvania the 5 largest towns including Philly"): PA
      // added as a 6th state, but city-scoped rather than full-state like the other five — see
      // PA_TOP_CITIES near the top of this file for why and the trade-off it makes. 2026-09-03
      // count: 23 PA accounts in Philadelphia/Pittsburgh/Reading (of 33 total in the state; 10
      // excluded for being outside the 5 target cities) — total audience now ~252.
      id: "ace-fall-show-2026",
      type: "enrichment",
      // Renamed + consolidated 2026-09-01 (Rick: "combine all the instances of email campaign
      // prospecting and sales rep work that we will be covering into one tab. Call it ACE FALL
      // SHOW sales rep and prospect alignment" — then, on seeing 3 live cards: "there are these 3
      // instances for the same campaign I want to consolidate to streamline operations"). This IS
      // that one tab: every ACE Fall Show call list lives on this single campaign, in two sections
      // on its detail page, not spread across separate cards. The other two live cards Rick made
      // from the New Campaign form — "ACE Endico Fall Show — Rep Fit Discovery" (email) and its
      // "rep qualification (phone pass)" enrichment pass — asked the SAME rep-facing question this
      // campaign already covers (find the reps whose accounts fit Monti Trentini, book booth time
      // with them) plus territory confirmation; that ask is folded into the goal/strategy below
      // and into Sales Rep Contacts' outcome tracking (territory + note fields cover "fit" and
      // "booth time booked" without a new field). Rick can delete the two duplicate cards himself
      // now that this one carries everything — see the Delete campaign button on each.
      // (1) Target Prospects/Call console — the target-prospect accounts across the ACE
      // footprint, i.e. the prospecting work that otherwise would have sat on a standalone email
      // campaign. (2) Sales Rep Contacts — Ace Endico's own reps, scoped by audience.salesReps.
      // Each has its own outcome tracking, since "did we invite this account" and "did we confirm
      // this rep's territory and book their booth time" are different facts about different
      // objects — but both live under this one name so there is nothing else to open or reconcile.
      name: "ACE Fall Show — Sales Rep & Prospect Alignment",
      goal: "One tab for every ACE Fall Show call list ahead of the Sept 15 show: invite every target-prospect account across the ACE footprint (NY/NJ/RI/MA/CT in full, plus PA's 5 largest cities), and work Ace Endico's own reps two ways — confirm who covers what territory, and find out which of their accounts actually fit Monti Trentini specialty cheese so that rep gets booked booth time at the show — feeding Booth's territory Scope picker and Rep check-in flow either way.",
      channels: ["retail"],
      start: "2026-09-01",
      end: "2026-09-15",
      owner: "Rick Posada",
      strategy: {
        summary:
          "Two lists, one campaign. (1) ~252 target-PROSPECT accounts: NY/NJ/RI/MA/CT in full, " +
          "plus PA narrowed to its 5 largest cities (Philadelphia/Pittsburgh/Allentown/Reading/" +
          "Erie) added 2026-09-03 — 227 HubSpot Tasks (call or invite, by account) already " +
          "created 2026-09-01 covering CT (21/21) and MA (29/29) fully, plus all of NJ (38) and " +
          "RI (13); NY (133) still needs its calls actually made, and PA's 23 accounts are new, " +
          "no tasks created for them yet. Scoped by live region/state/city filter, not a fixed " +
          "list, so it never drifts from the real book. (2) 60 of Ace Endico's OWN contacts " +
          "(audience.salesReps) — " +
          "not target prospects, the distributor's own field reps (plus admin/back-office staff " +
          "not yet pruned out). The ask on this second list is two-fold: confirm which states/" +
          "accounts each rep actually covers, AND find out whether any of those accounts fit Monti " +
          "Trentini specialty cheese — a fit is what earns that rep dedicated booth time at the " +
          "show, not just a name check-in. (Log fit + booth-time notes in the rep's Territory/" +
          "notes fields on the Sales Rep Contacts call console below.)",
        path: "docs/HANDOFF_2026-09-01_ace-fall-show-booth-integration.md",
      },
      content: [],
      audience: {
        label: "ACE Endico footprint — NY/NJ/RI/MA/CT (full) + PA (Philadelphia/Pittsburgh/Allentown/Reading/Erie)",
        size: 252,
        exact: false,
        companyIds: [],
        filter: { states: ["NY", "NJ", "RI", "MA", "CT", "PA"], cityAllowlist: { PA: PA_TOP_CITIES } },
        // Ace Endico's OWN people, not target-prospect accounts — pulled 2026-09-01 from every
        // HubSpot contact associated with the Ace Endico company record (63 total, minus 3
        // department inboxes: Sample Requests, Ace Ap, Receiving Department — not people).
        // Rick's own count is 42 field sales reps; this is the full contact book under that
        // company, admin/back-office titles included (AP, receiving, marketing, credit, GM) —
        // prune it down to the real 42 in the app once confirmed, rather than guess which ~18
        // to drop here. Rendered as its own tab (Section id="salesreps" in campaign-detail.jsx),
        // separate from the account-scoped Target Prospects/Call console above.
        salesReps: [
          { name: "Sandra Burner", phone: "631806262", email: "sburner@aceendico.com" },
          { name: "Mario Tricomi", phone: "+15185281036", email: "mtricomi@aceendico.com" },
          { name: "Steve DelGiudice", phone: "+18458030709", email: "sdelguidice@aceendico.com" },
          { name: "Vincent Mocarski", phone: "+19144758899", email: "vmocarski@aceendico.com" },
          { name: "Mathew Oujo", phone: "+17322725804", email: "moujo@aceendico.com" },
          { name: "Vincenzo Purpura", phone: "+19174145533", email: "vpurpura@aceendico.com" },
          { name: "Michael Endico", email: "mendico@aceendico.com" },
          { name: "Louis Corcione", phone: "+15166396457", email: "lcorcione@aceendico.com" },
          { name: "Mariano Caputo", jobtitle: "Merchandising Manager", phone: "+12393144348", email: "mcaputo@aceendico.com" },
          { name: "Steven Penn", phone: "+15164924787", email: "spenn@aceendico.com" },
          { name: "Larry Catanzaro", phone: "+18069194353", email: "lcatanzaro@aceendico.com" },
          { name: "Michaela Hendrickson", phone: "+18454288191", email: "mhendrickson@aceendico.com" },
          { name: "Robert Curdgel", phone: "+19172278598", email: "rcurdgel@aceendico.com" },
          { name: "Michael Giaimo", phone: "+12016936139", email: "mgiaimo@aceendico.com" },
          { name: "Joe Graziani", phone: "+12125173035", email: "jgraziani@aceendico.com" },
          { name: "Mike Ogle", phone: "+14017410508", email: "mogle@aceendico.com" },
          { name: "John Mulvey", phone: "+19178855342", email: "jmulvey@aceendico.com" },
          { name: "Raymond Costagliola", phone: "+19143473131", email: "rcostagliola@aceendico.com" },
          { name: "Tony Falgiano", jobtitle: "Sales Associate", phone: "+15166411084", email: "afalgiano@aceendico.com" },
          { name: "Natalia Miranda", phone: "+18452308843", email: "nmiranda@aceendico.com" },
          { name: "Mathew Zekanovic", phone: "+18456612303", email: "mzekanovic@aceendico.com" },
          { name: "Massimo Vallone", phone: "+12036444579", email: "mvallone@aceendico.com" },
          { name: "Dominika Mierzejewski", phone: "+19143746896", email: "dmierzejewski@aceendico.com" },
          { name: "Annette Giamo", phone: "+18454909771", email: "agiamo@aceendico.com" },
          { name: "David Lubell", phone: "+19146491729", email: "dlubell@aceendico.com" },
          { name: "Joe Castelano", phone: "+18624855912", email: "jcastelano@aceendico.com" },
          { name: "Jay Horowitz", phone: "+19143303131", email: "jhorowitz@aceendico.com" },
          { name: "Christopher Santeimo", phone: "+19179393127", email: "csanteimo@aceendico.com" },
          { name: "Giuseppe Policella", phone: "+18452308831", email: "ppolicella@aceendico.com" },
          { name: "Chris Landi", phone: "+16464314862", email: "clandi@aceendico.com" },
          { name: "Christopher Manzi", phone: "+19174075405", email: "cmanzi@aceendico.com" },
          { name: "Dominic Albero", phone: "+19144249611", email: "dalbero@aceendico.com" },
          { name: "Avi Silverman", email: "asilverman@aceendico.com" },
          { name: "Alessandra Turano", phone: "+18452309895", email: "acurdegel@aceendico.com" },
          { name: "Frank DiNapoli", phone: "+19174978126", email: "fdinapoli@aceendico.com" },
          { name: "Alexia Mur", phone: "+19176990468", email: "amur@aceendico.com" },
          { name: "Gus Giaimo", phone: "+19736508832", email: "ggiaimo@aceendico.com" },
          { name: "Alexa Campagna", jobtitle: "Account Executive", phone: "+18452308097", email: "acampagna@aceendico.com" },
          { name: "Andrea Matra", jobtitle: "Distributor", email: "amatra@aceendico.com" },
          { name: "Tammy Greenspan", phone: "+15083389688", email: "tgreenspan@aceendico.com" },
          { name: "Michael Cannillo", jobtitle: "Account Executive", phone: "+12013210521", email: "mcannillo@aceendico.com" },
          { name: "Beck Bolender", jobtitle: "Director of Marketing", email: "bbolender@aceendico.com" },
          { name: "Janet Halpern", jobtitle: "Category Manager", email: "jhalpern@aceendico.com" },
          { name: "Paul Cannillo", jobtitle: "Sales Executive", phone: "+12017888221", email: "pcannillo@aceendico.com" },
          { name: "Nicole Ackerly", email: "nackerly@aceendico.com" },
          { name: "Laura Goodman", jobtitle: "Accounts Payable Clerk", email: "lgoodman@aceendico.com" },
          { name: "Stalin Cardenas", jobtitle: "Receiving Associate", email: "scardenas@aceendico.com" },
          { name: "Karl Rosenfeld", jobtitle: "Accounts Payable Specialist", email: "krosenfeld@aceendico.com" },
          { name: "Annette Giaimo", email: "agiaimo@aceendico.com" },
          { name: "Katherine Wetzler", jobtitle: "Marketing Specialist", email: "kwetzler@aceendico.com" },
          { name: "Alberto Galvan", jobtitle: "Sales Manager", phone: "+19143473131", email: "agalvan@aceendico.com" },
          { name: "Madison Cullen", jobtitle: "Marketing Specialist", phone: "+18458031629", email: "mcullen@aceendico.com" },
          { name: "Maureen Hart", jobtitle: "Credit Manager", email: "mhart@aceendico.com" },
          { name: "Erminio Conte", phone: "+13477209058", email: "econte@aceendico.com" },
          { name: "Chris Devine", jobtitle: "General Manager", email: "cdevine@aceendico.com" },
          { name: "Angelo Saturini", phone: "+18454908624", email: "asaturini@aceendico.com" },
          { name: "Joe Castellano", jobtitle: "District Sales Manager", phone: "+18624855912", email: "jcastellano@aceendico.com" },
          { name: "Michele Ascenzi", email: "mascenzi@aceendico.com" },
          { name: "Brian Ramos", email: "bramos@aceendico.com" },
          { name: "Jim Cannillo", jobtitle: "Director of Imports", phone: "+19737140958", email: "jcannillo@aceendico.com" },
        ],
      },
      seedStatus: "building",
      seedDone: ["source"],
    },
  ],
};

// "mock" (bundled seeds) | "make" (netlify/functions/campaigns.js webhook proxy).
const USE_MOCK = (import.meta.env.VITE_CAMPAIGNS_BACKEND || "mock") === "mock";
// True while campaign DEFINITIONS are seeded rather than fetched. Note this does NOT describe the
// checklist/status state — that is always live from Blobs (campaign-state.js), even in mock mode.
export const campaignsAreSample = USE_MOCK;

/** Seeded/webhook campaign definitions only — the read-only half. See getCampaigns() for the
 *  merged list the UI actually renders. */
async function getSourcedCampaigns(resolved) {
  if (USE_MOCK) return SEEDS[resolved.id] || [];
  return readAuthedJson(`/.netlify/functions/campaigns?tenant=${encodeURIComponent(resolved.id)}`, { onFail: [] });
}

// ---- Custom campaign definitions (Netlify Blobs, netlify/functions/campaign-defs.js) -------
// The write path for a brand-new campaign (2026-08-21, "New Campaign" tab). Kept in their own
// store, separate from SEEDS/the Make webhook, and folded into getCampaigns() below so the rest
// of the app (pill nav, checklist, campaign-state.js overlay) never has to know which source a
// campaign came from — same id space either way.

/**
 * Custom campaign definitions created in the UI: { entries: {id: def}, updatedAt }, or null on a
 * failed read (CRM-05 follow-up, 2026-09-03 — see getOutreach() in crm.js for the full rationale:
 * a failed read must not look like "genuinely no custom campaigns", since getCampaigns() below
 * merges this into the list every other store treats as canonical).
 */
export async function getCampaignDefs(resolved) {
  return readAuthedJson(`/.netlify/functions/campaign-defs?tenant=${encodeURIComponent(resolved.id)}`);
}

/** Campaign definitions for a tenant — seeded/webhook campaigns PLUS any created in the UI. */
export async function getCampaigns(resolved) {
  const [sourced, custom] = await Promise.all([getSourcedCampaigns(resolved), getCampaignDefs(resolved)]);
  return [...sourced, ...Object.values(custom?.entries || {})];
}

/**
 * Retire a custom (UI-created) campaign definition — e.g. a duplicate of a seeded campaign that
 * grew out of the same New Campaign form (Rick, 2026-09-01: "there are these 3 instances for the
 * same campaign I want to consolidate"). Only campaigns carrying `custom: true` live in this
 * store; a seeded campaign has no id here and the server 404s rather than silently no-opping.
 */
export async function deleteCampaign(resolved, campaignId) {
  return writeAuthedJson(
    `/.netlify/functions/campaign-defs?tenant=${encodeURIComponent(resolved.id)}&campaignId=${encodeURIComponent(campaignId)}`,
    { method: "DELETE" },
  );
}

/** Turn a campaign name into a valid campaign id (mirrors the server's ID_RE), max 64 chars. */
export function slugify(name) {
  const base = String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "campaign";
  return /^[0-9]/.test(base) ? `c-${base}`.slice(0, 64) : base;
}

/**
 * Create a new campaign definition via campaign-defs.js. Generates the id from the name and
 * retries with a numeric suffix if it collides with `existingIds` (pass the ids already loaded
 * in the UI) — the server still re-checks and returns 409 on a genuine race, which the caller
 * should surface rather than silently retry (rare enough at this team's volume to just ask again).
 */
export async function createCampaign(resolved, campaign, existingIds = []) {
  const taken = new Set(existingIds);
  let id = slugify(campaign.name);
  let n = 2;
  while (taken.has(id) && n <= 50) { id = `${slugify(campaign.name)}-${n++}`; }
  return writeAuthedJson("/.netlify/functions/campaign-defs", {
    body: { tenant: resolved.id, campaign: { ...campaign, id } },
  });
}

// ---- State overlay (status + checklist ticks + results, Netlify Blobs) ---------------------
// Read: any signed-in tier. Write: house/client-admin passcode (server-enforced by
// campaign-state.js via requireWriteAuth — the UI only surfaces the 401).

/**
 * { entries: {campaignId: {status, items, custom, hidden, results}}, updatedAt }, or null on a
 * failed read. CRM-05 follow-up (2026-09-03): this is the launch-readiness checklist gate — a
 * silent {entries:{}} on a failed read would show every campaign as un-started, and a later
 * autosave (saveCampaignState is a full-document last-writer-wins write) could overwrite real
 * checklist progress. Callers must not treat null the same as "nothing checked yet".
 */
export async function getCampaignState(resolved) {
  return readAuthedJson(`/.netlify/functions/campaign-state?tenant=${encodeURIComponent(resolved.id)}`);
}

/** Save the FULL entries document (last-writer-wins). Resolves {ok, status}. */
export async function saveCampaignState(resolved, entries) {
  const { ok, status } = await writeAuthedJson("/.netlify/functions/campaign-state", {
    body: { tenant: resolved.id, entries },
  });
  return { ok, status };
}

// ---- Authored content + approvals ----------------------------------------------------------
// RETIRED 2026-08-03. Campaign copy and call scripts used to live in a per-campaign store with
// their own draft/in-review/approved vocabulary. They now live in the CONTENT LIBRARY, tagged
// with `campaignId`, under the Library's own submitted -> posted / returned vocabulary
// (CONTENT_ORCHESTRATION_SPEC §1: "no fact or file has two homes"; Rick, 2026-08-03: the Library
// "will be the source for the content approval"). See src/lib/presentations-store.js —
// entriesForCampaign() / postedOfCategory().

// ---- Enrichment capture (Netlify Blobs) ----------------------------------------------------
// What a phone pass produces. NOT written back to HubSpot — the private app is read-only (see
// netlify/functions/campaign-enrichment.js header). Leaves as a HubSpot-import CSV instead.

export const CALL_OUTCOMES = [
  { id: "not-called", label: "Not called", tone: "muted", clears: false },
  { id: "cleared", label: "Reached — details captured", tone: "success", clears: true },
  { id: "callback", label: "Callback scheduled", tone: "info", clears: false },
  { id: "left-message", label: "Left message", tone: "info", clears: false },
  { id: "no-answer", label: "No answer", tone: "muted", clears: false },
  { id: "bad-number", label: "Bad number", tone: "warning", clears: false },
  { id: "do-not-contact", label: "Do not contact", tone: "error", clears: false },
  // A company that was never a prospect (wrong trade, closed, duplicate). It leaves the gap list
  // for the OPPOSITE reason to `cleared`: not because the missing facts got filled in, but
  // because they never will be. Deliberately NOT exported to HubSpot — see isCleared below.
  { id: "not-a-prospect", label: "Not a prospect", tone: "muted", clears: false },
];
export const OUTCOME_TONE = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, o.tone]));
export const OUTCOME_LABEL = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, o.label]));

/**
 * A gap is CLOSED when the call was reached AND the missing facts are actually filled in.
 * This is the export predicate: only these rows carry real contact detail, so only these belong
 * in the HubSpot-import CSV. Keep it strict — "disqualified" must never look like "captured".
 */
export function isCleared(rec) {
  return !!rec && rec.outcome === "cleared" && !!rec.email && !!rec.buyer;
}

/**
 * A row is RESOLVED when nobody needs to call it again — either the details were captured, or
 * the company was disqualified. This is the predicate the gap COUNTS use, so a "not a prospect"
 * drops out of the outstanding work exactly like a cleared one, without pretending it produced
 * a contact (2026-08-03 Cowork follow-up).
 */
export function isResolved(rec) {
  return isCleared(rec) || rec?.outcome === "not-a-prospect";
}

// ---- Audience scoping ----------------------------------------------------------------------
// Enrichment is worked PER CAMPAIGN, against that campaign's own targets (Rick, 2026-08-03):
// "enrich the relative prospect per campaign to keep productivity and harden the build and
// process at the same time." So a campaign's audience has to be a SELECTOR over the live CRM,
// not just a headline number — otherwise the call console can only offer the whole account book.
//
// Two ways to scope, in precedence order:
//   1. `companyIds` — the exact list, when one exists. Authoritative.
//   2. `filter` — a declarative segment (regions / states / channels) evaluated against live
//      CRM data. An APPROXIMATION: it tracks the CRM as it changes, which is right for an
//      open-ended segment and wrong for a hand-qualified list. `audience.exact` says which.
// No scope at all = the whole book (a standing pass, not a campaign segment).

/**
 * The campaign whose audience defines a given campaign's scope — itself, or, for an enrichment
 * campaign, the campaign it SERVES (Rick, 2026-08-03: "that's why the enrichment campaign
 * exists, just frame it around the entire campaign"). An enrichment pass keeps its own pill and
 * its own lifecycle, but it is never scoped to the whole account book — it works the gaps in the
 * target list of the send it unblocks. One list, two lifecycles.
 */
export function scopeOf(campaign, all = []) {
  if (!campaign?.serves) return campaign;
  return all.find((c) => c.id === campaign.serves) || campaign;
}

/** The companies a campaign targets, out of the live CRM account book. */
export function segmentOf(campaign, companies) {
  const a = campaign?.audience;
  if (!a || (!a.companyIds?.length && !a.filter)) return companies;
  if (a.companyIds?.length) {
    const want = new Set(a.companyIds.map(String));
    return companies.filter((c) => want.has(String(c.id)));
  }
  const f = a.filter;
  return companies.filter((c) => {
    if (f.regions?.length && !f.regions.includes(regionOf(c))) return false;
    if (f.states?.length && !f.states.includes(stateOf(c))) return false;
    if (f.channels?.length && !f.channels.includes(c.channel)) return false;
    // Per-state city narrowing (2026-09-03, ACE Fall Show + PA) — most states in `f.states` are
    // included in FULL (matches every NY/NJ/RI/MA/CT account, same as before this existed); a
    // state gets narrowed to specific cities ONLY when it has its own entry here, e.g.
    // `{ PA: PA_TOP_CITIES }`. Layered on top of the state filter, same relationship
    // isLongIsland()/isNYCBorough() have to the NY state match — those are display-grouping only,
    // this one actually gates the audience.
    const cities = f.cityAllowlist?.[stateOf(c)];
    if (cities && !cities.has(cityKeyOf(c))) return false;
    return true;
  });
}

/** Whether an account still blocks a send: no email, or no named buyer to address. */
export const hasGap = (co) => !co.ownerEmail || !co.owner;

// City names in the live CRM carry neighbourhood qualifiers in parentheses and arrive lowercase
// — the 2026-08-03 pull found "boston" (5) alongside "boston (north end)" (3), and "new york"
// (45) alongside "new york (greenwich village)" (2). Keying on the raw string splits one city
// into several rows and undercounts every one of them, so normalize to the parent city for
// GROUPING while keeping the qualifiers as `variants` so the detail isn't lost.
// (State needs no equivalent here — stateOf() already uppercases and folds "new york" → "NY".)
const CITY_QUALIFIER = /\s*\([^)]*\)\s*$/;

/** Grouping key for a company's city: parent city, lowercased, qualifiers stripped. */
export function cityKeyOf(co) {
  const raw = String(co?.city || "").trim();
  if (!raw) return "";
  return raw.replace(CITY_QUALIFIER, "").replace(/\s+/g, " ").trim().toLowerCase();
}

const titleCase = (s) => s.replace(/\b[a-z]/g, (m) => m.toUpperCase());

/**
 * Region → state → city rollup of a segment (Rick, 2026-08-03: "scope by region for the sake of
 * the campaign, but I want state and city breakdown as well"). REGION is the scoping unit — it's
 * what a campaign targets — while state and city are how the work inside it actually gets
 * divided: which state is worst, which city is worth an afternoon, how to split a list between
 * two reps. Every level carries the same three numbers so they're comparable at any depth.
 *
 * NY gets one extra layer between state and city (Rick, 2026-09-02: "start with NY state then
 * break down into cities in NY state keeping NYC broken down into the boroughs, with Long Island
 * as a separate sub region in New York state") — Long Island and the five NYC boroughs are each
 * their own named sub-region, since together they're most of NY's account list and flattening
 * them into ~80 undifferentiated city rows buried the two territories that actually matter for
 * dividing the work. Every other NY city (Yonkers, Scarsdale, upstate...) still nests directly
 * under the state, same as any other state's cities — the sub-region layer only exists where
 * named.
 *
 * Counts are computed once per account and rolled UP, so region totals always equal the sum of
 * their states and cities — no level can drift from another.
 */
export function geoBreakdown(companies, enrichment = {}) {
  const bump = (node, co, gapped) => {
    node.total += 1;
    if (co.ownerEmail) node.sendable += 1;
    if (gapped) node.gaps += 1;
  };
  const blank = (key, label) => ({ key, label, total: 0, sendable: 0, gaps: 0, children: new Map() });
  const regions = new Map();

  for (const co of companies) {
    const gapped = hasGap(co) && !isResolved(enrichment[co.id]);
    const rKey = regionOf(co);
    const sKey = stateOf(co) || "—";
    const cKey = cityKeyOf(co) || "—";

    if (!regions.has(rKey)) regions.set(rKey, blank(rKey, rKey));
    const R = regions.get(rKey);
    bump(R, co, gapped);

    if (!R.children.has(sKey)) R.children.set(sKey, blank(sKey, sKey));
    const S = R.children.get(sKey);
    bump(S, co, gapped);

    // NY's named sub-regions — see the function comment. `pickLevel` tells the UI which filter
    // predicate a click on this node should apply (isLongIsland/isNYCBorough), since these nodes
    // don't correspond to a single state/city value the way every other node here does.
    let parent = S;
    if (sKey === "NY") {
      const subKey = isLongIsland(co) ? "long-island" : isNYCBorough(co) ? "nyc-boroughs" : null;
      if (subKey) {
        if (!S.children.has(subKey)) {
          const node = blank(subKey, subKey === "long-island" ? "Long Island" : "New York City (boroughs)");
          node.sub = true;
          node.pickLevel = subKey === "long-island" ? "longisland" : "nycboroughs";
          S.children.set(subKey, node);
        }
        parent = S.children.get(subKey);
        bump(parent, co, gapped);
      }
    }

    if (!parent.children.has(cKey)) {
      const node = blank(cKey, cKey === "—" ? "—" : titleCase(cKey));
      node.variants = new Set();
      parent.children.set(cKey, node);
    }
    const C = parent.children.get(cKey);
    bump(C, co, gapped);
    // Record the qualifier ("North End") when the raw value carried one, so grouping the row
    // doesn't hide which neighbourhoods it covers.
    const q = String(co.city || "").trim().match(CITY_QUALIFIER);
    if (q) C.variants.add(titleCase(q[0].replace(/[()]/g, "").trim().toLowerCase()));
  }

  // Most work first: sort by outstanding gaps, then size — the top row is where to start calling.
  const rank = (a, b) => b.gaps - a.gaps || b.total - a.total || String(a.label).localeCompare(String(b.label));
  const flatten = (node) => ({
    ...node,
    ...(node.variants ? { variants: [...node.variants].sort() } : {}),
    children: [...node.children.values()].map(flatten).sort(rank),
  });
  return [...regions.values()].map(flatten).sort(rank);
}

// ---- Long Island quick filter (2026-09-02) -------------------------------------------------
// Long Island (Nassau + Suffolk counties) isn't a HubSpot state value of its own — it's a set of
// NY cities — so it can't be scoped the way NJ/RI/MA/CT are on the ACE Fall Show campaign. Rick,
// 2026-09-02, on seeing the 90 new LI accounts: "can we have a Long Island tab please its a
// significant territory" (it's Tony's — an Ace Endico rep's — own territory). Curated by city
// name rather than a zip range: Long Island's 11xxx zips overlap Queens/Brooklyn's, so a zip
// check would misclassify NYC boroughs as LI. Covers every LI town in the CRM as of the 2026-09-02
// research pass (11 pre-existing + 51 added that day, Nassau through Montauk).
const LONG_ISLAND_CITIES = new Set([
  "oceanside", "new hyde park", "wantagh", "massapequa", "mattituck", "sagaponack",
  "dix hills", "centereach", "patchogue", "east moriches", "commack",
  "mineola", "roslyn", "rockville centre", "franklin square", "valley stream", "malverne",
  "baldwin", "east meadow", "port washington", "farmingdale", "hicksville", "syosset",
  "plainview", "woodbury", "glen cove", "locust valley", "garden city park",
  "east islip", "bay shore", "babylon", "north babylon", "west islip", "deer park",
  "west sayville", "sayville", "blue point", "bellport", "shirley",
  "huntington", "northport", "cold spring harbor", "kings park", "smithtown", "st. james",
  "setauket", "port jefferson", "selden", "ronkonkoma",
  "riverhead", "aquebogue", "cutchogue", "southold", "greenport", "orient",
  "southampton", "east hampton", "sag harbor", "amagansett", "water mill", "bridgehampton",
  "westhampton beach", "quogue", "hampton bays", "montauk",
]);

/** Whether a company sits on Long Island (Nassau/Suffolk) — layers on top of the NY state
 *  filter rather than replacing it, since LI is a curated city list, not a HubSpot state value. */
export function isLongIsland(co) {
  return stateOf(co) === "NY" && LONG_ISLAND_CITIES.has(cityKeyOf(co));
}

/** Whether a company sits in one of Pennsylvania's 5 largest cities — layers on top of the PA
 *  state filter the same way isLongIsland() layers on NY, but this one is also consumed by
 *  segmentOf() (via cityAllowlist, see PA_TOP_CITIES near the top of this file) to actually
 *  narrow the audience, not just for display. */
export function isPaTopCity(co) {
  return stateOf(co) === "PA" && PA_TOP_CITIES.has(cityKeyOf(co));
}

// The five NYC boroughs, as the raw `city` field actually spells them in this CRM (Manhattan
// itself is stored as "New York", sometimes with a neighbourhood qualifier cityKeyOf() already
// strips — "New York (Upper East Side)" → "new york").
const NYC_BOROUGH_CITIES = new Set(["new york", "manhattan", "brooklyn", "queens", "bronx", "staten island"]);

/** Whether a company sits in one of the five NYC boroughs. */
export function isNYCBorough(co) {
  return stateOf(co) === "NY" && NYC_BOROUGH_CITIES.has(cityKeyOf(co));
}

/**
 * Enrichment picture for a campaign's own segment — the numbers the launch gate cares about.
 * `remaining` is what's still to call; `cleared` counts gaps closed on this pass.
 */
export function segmentEnrichment(campaign, companies, enrichment = {}, all = []) {
  const segment = segmentOf(scopeOf(campaign, all), companies);
  const gapped = segment.filter(hasGap);
  const cleared = gapped.filter((co) => isCleared(enrichment[co.id]));
  const disqualified = gapped.filter((co) => enrichment[co.id]?.outcome === "not-a-prospect");
  const remaining = gapped.filter((co) => !isResolved(enrichment[co.id]));
  return {
    segment,
    total: segment.length,
    sendable: segment.filter((co) => co.ownerEmail).length,
    gapped: gapped.length,
    cleared: cleared.length,
    disqualified: disqualified.length,
    remaining,
    // The whole point of doing this per campaign: one number that says "can this send go out".
    ready: gapped.length === 0 || remaining.length === 0,
  };
}

// CRM-05 follow-up (2026-09-03): null on a failed read (was a fake {entries:{}}) — same
// last-writer-wins data-loss risk as getCampaignState() above.
export async function getEnrichment(resolved) {
  return readAuthedJson(`/.netlify/functions/campaign-enrichment?tenant=${encodeURIComponent(resolved.id)}`);
}

export async function saveEnrichment(resolved, entries) {
  const { ok, status } = await writeAuthedJson("/.netlify/functions/campaign-enrichment", {
    body: { tenant: resolved.id, entries },
  });
  return { ok, status };
}

// ---- Rep call capture (Netlify Blobs) -------------------------------------------------------
// The rep-qualification half of a combined territory-outreach + rep-qualification campaign
// (Rick, 2026-09-01) — a phone pass through the distributor's OWN sales reps rather than
// target-prospect accounts. Distinct store from campaign-enrichment.js: reps are seeded in code
// (audience.salesReps), not live HubSpot company records, so they have no numeric id to key on —
// this keys by the rep's email instead (see campaign-rep-calls.js).

// CRM-05 follow-up (2026-09-03): null on a failed read (was a fake {entries:{}}) — same
// last-writer-wins data-loss risk (saveRepCalls) as the other overlay stores in this file.
export async function getRepCalls(resolved) {
  return readAuthedJson(`/.netlify/functions/campaign-rep-calls?tenant=${encodeURIComponent(resolved.id)}`);
}

export async function saveRepCalls(resolved, entries) {
  const { ok, status } = await writeAuthedJson("/.netlify/functions/campaign-rep-calls", {
    body: { tenant: resolved.id, entries },
  });
  return { ok, status };
}

/** Progress for a rep-qualification pass — same shape as callSummary() reads for accounts. */
export function repCallSummary(reps = [], calls = {}) {
  const touched = reps.filter((r) => {
    const rec = calls[String(r.email || "").toLowerCase()];
    return rec && (rec.outcome || rec.territory || rec.note);
  });
  const cleared = touched.filter((r) => calls[String(r.email || "").toLowerCase()]?.outcome === "cleared");
  const notAField = touched.filter((r) => calls[String(r.email || "").toLowerCase()]?.outcome === "not-a-prospect");
  return {
    total: reps.length,
    called: touched.length,
    cleared: cleared.length,
    notAField: notAField.length,
    remaining: reps.length - touched.length,
  };
}

/**
 * Enrichment rows as a HubSpot-import CSV. The first seven columns map 1:1 onto standard HubSpot
 * contact properties, so the file imports without remapping; the last three are the call record
 * (map them to custom properties, or drop them at import and keep the file as the audit trail).
 * "Associated Company ID" is the HubSpot company record id we already read, so imported contacts
 * associate to the right company instead of creating duplicates.
 */
export function enrichmentCsv(rows) {
  const header = [
    "First Name", "Last Name", "Email", "Phone Number", "Job Title",
    "Company Name", "Associated Company ID",
    // HubSpot has no native Instagram property — this rides along as an extra column for manual
    // reference, or maps to a custom contact property at import time.
    "Instagram",
    "Call Outcome", "Call Notes", "Called At",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => {
    const parts = String(r.buyer || "").trim().split(/\s+/);
    const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] || "");
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    return [
      first, last, r.email || "", r.phone || "", r.title || "",
      r.companyName || "", r.companyId || "",
      r.instagram || "",
      OUTCOME_LABEL[r.outcome] || "", r.note || "", r.calledAt || "",
    ].map(esc).join(",");
  });
  return [header.map(esc).join(","), ...body].join("\n");
}

/**
 * Push cleared rows into HubSpot as contacts. DRY RUN unless `commit` is true — the server
 * resolves create-vs-update and writes nothing, so the UI can show exactly what will happen
 * before anything touches the CRM of record.
 */
export async function pushToHubspot(resolved, rows, { commit = false } = {}) {
  return writeAuthedJson("/.netlify/functions/crm-push", {
    body: { tenant: resolved.id, rows, commit },
  });
}

/**
 * Session summary for a phone pass: what was called, what it produced, what is left.
 * Counts every touched row, not just cleared ones — "left 12 messages" is progress too.
 */
export function callSummary(segment, enrichment = {}) {
  const touched = segment.filter((co) => {
    const r = enrichment[co.id];
    return r && (r.outcome || r.buyer || r.email || r.note || r.instagram);
  });
  const byOutcome = {};
  for (const co of touched) {
    const k = enrichment[co.id]?.outcome || "not-called";
    byOutcome[k] = (byOutcome[k] || 0) + 1;
  }
  const cleared = touched.filter((co) => isCleared(enrichment[co.id]));
  const notes = touched
    .filter((co) => enrichment[co.id]?.note)
    .map((co) => ({ company: co.name, note: enrichment[co.id].note, outcome: enrichment[co.id].outcome || "" }));
  const gapped = segment.filter(hasGap);
  return {
    segmentTotal: segment.length,
    called: touched.length,
    byOutcome,
    cleared: cleared.length,
    disqualified: touched.filter((co) => enrichment[co.id]?.outcome === "not-a-prospect").length,
    emailsCaptured: touched.filter((co) => enrichment[co.id]?.email).length,
    instagramCaptured: touched.filter((co) => enrichment[co.id]?.instagram).length,
    notes,
    remaining: gapped.filter((co) => !isResolved(enrichment[co.id])).length,
    // Progress against the gap the pass exists to close — not against the whole segment.
    gapTotal: gapped.length,
    gapClosed: gapped.filter((co) => isResolved(enrichment[co.id])).length,
  };
}

/** Trigger a client-side CSV download (same approach as the CRM console's export). */
export function downloadCsv(filename, csv) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---- Merge + derive -------------------------------------------------------------------------

/**
 * Fold a campaign definition together with its stored state into what the UI renders:
 * a resolved checklist (template minus hidden, plus custom, each carrying its done state),
 * the effective status, and results.
 */
export function mergeCampaign(def, state = {}) {
  const hidden = new Set(state.hidden || []);
  const items = state.items || {};
  const base = templateFor(def.type).filter((t) => !hidden.has(t.id));
  const custom = (state.custom || []).map((c) => ({ ...c, custom: true }));
  // A seeded done-item counts only until the store has an opinion about it — any tick or untick
  // made in the UI writes an explicit entry, and that always wins.
  const seedDone = new Set(def.seedDone || []);
  const checklist = [...base, ...custom].map((t) => {
    const st = items[t.id];
    const done = st ? st.done === true : seedDone.has(t.id);
    return { ...t, done, doneAt: st?.doneAt || null, note: st?.note || "" };
  });
  return {
    ...def,
    checklist,
    status: state.status || def.seedStatus || "draft",
    results: { ...(def.results || {}), ...(state.results || {}) },
    stateUpdatedAt: state.updatedAt || null,
  };
}

/** Progress + the launch gate. `ready` is true only when every REQUIRED item is done. */
export function readinessOf(campaign) {
  const list = campaign.checklist || [];
  const req = list.filter((i) => i.required);
  const requiredDone = req.filter((i) => i.done).length;
  const blockers = req.filter((i) => !i.done);
  return {
    done: list.filter((i) => i.done).length,
    total: list.length,
    requiredDone,
    requiredTotal: req.length,
    blockers,
    ready: req.length > 0 && requiredDone === req.length,
  };
}

/**
 * Whether a status transition is allowed. Only ONE transition is gated — anything at or past
 * `ready` requires a complete required-checklist. Everything else is free movement, because
 * campaigns get paused, re-drafted, and reopened, and a status model that fights that gets
 * worked around instead of used.
 */
export function canAdvanceTo(campaign, status) {
  const gatedFrom = LIFECYCLE_IDS.indexOf("ready");
  if (LIFECYCLE_IDS.indexOf(status) < gatedFrom) return { ok: true };
  const r = readinessOf(campaign);
  if (r.ready) return { ok: true };
  return { ok: false, reason: `${r.requiredTotal - r.requiredDone} required task${r.requiredTotal - r.requiredDone === 1 ? "" : "s"} outstanding` };
}

/** Group a resolved checklist by its `group` field, in template order. */
export function groupChecklist(checklist) {
  const groups = [];
  for (const item of checklist) {
    let g = groups.find((x) => x.name === item.group);
    if (!g) groups.push((g = { name: item.group || "Tasks", items: [] }));
    g.items.push(item);
  }
  return groups;
}

/** Headline numbers for the pill's stat row. */
export function summarize(list) {
  const live = list.filter(isLive).length;
  const ready = list.filter((c) => c.status === "ready").length;
  const building = list.filter((c) => c.status === "building" || c.status === "draft").length;
  const audience = list.reduce((s, c) => s + (c.audience?.size || 0), 0);
  const replies = list.reduce((s, c) => s + (c.results?.replies || 0), 0);
  const won = list.reduce((s, c) => s + (c.results?.won || 0), 0);
  return { live, ready, building, audience, replies, won };
}
