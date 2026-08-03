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
import { writeAuthHeader } from "./auth-context.jsx";
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
      id: "ne-contact-enrichment",
      type: "enrichment",
      name: "NE Contact Enrichment — phone pass",
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
      // DRAFT, not approved — deliberately. Email_to_Stefano_Rep_Request.md ends "I'll put
      // together a call script", so no approved script exists yet. This is a starting point
      // built from the three facts that letter says each call must produce; edit it and approve
      // it in the Content section and it becomes the working script on the call console.
      seedContent: [
        {
          id: "call-script-v1",
          kind: "script",
          title: "Enrichment call script (starting draft)",
          approvalState: "draft",
          body: [
            "OPENER",
            "Hi, this is [name] calling for Monti Trentini — we're the Asiago producer out of the",
            "Veneto, Casa Finco. Do you have thirty seconds?",
            "",
            "REASON FOR THE CALL",
            "We're putting together a small fall tasting programme for specialty shops and I want to",
            "make sure it reaches the right person at [shop] rather than a generic inbox.",
            "",
            "THE THREE THINGS TO GET (this is the whole job)",
            "1. Who buys the cheese? — name and title",
            "2. What's the best direct email for them?",
            "3. Who's their distributor? — company and, if offered, a contact there",
            "",
            "IF THEY ASK WHAT THE PROGRAMME IS",
            "A free tasting box — Asiago DOP and the Apericheese line. Fifty boxes, first come.",
            "No obligation. Don't oversell it; the email does the selling.",
            "",
            "IF THE BUYER ISN'T AVAILABLE",
            "Ask for the name and email anyway, note the best time to call back, mark Callback.",
            "",
            "CLOSE",
            "Thanks — I'll send it across to [buyer] directly. Have a good one.",
            "",
            "NOTES",
            "· Don't leave the distributor question out — it's half the point of the campaign.",
            "· If they say take us off the list, mark Do not contact and stop.",
          ].join("\n"),
        },
      ],
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
  ],
};

// "mock" (bundled seeds) | "make" (netlify/functions/campaigns.js webhook proxy).
const USE_MOCK = (import.meta.env.VITE_CAMPAIGNS_BACKEND || "mock") === "mock";
// True while campaign DEFINITIONS are seeded rather than fetched. Note this does NOT describe the
// checklist/status state — that is always live from Blobs (campaign-state.js), even in mock mode.
export const campaignsAreSample = USE_MOCK;

/** Campaign definitions for a tenant. */
export async function getCampaigns(resolved) {
  if (USE_MOCK) return SEEDS[resolved.id] || [];
  try {
    const res = await fetch(`/.netlify/functions/campaigns?tenant=${encodeURIComponent(resolved.id)}`, {
      headers: { ...writeAuthHeader() },
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

// ---- State overlay (status + checklist ticks + results, Netlify Blobs) ---------------------
// Read: any signed-in tier. Write: house/client-admin passcode (server-enforced by
// campaign-state.js via requireWriteAuth — the UI only surfaces the 401).

/** { entries: {campaignId: {status, items, custom, hidden, results}}, updatedAt }. */
export async function getCampaignState(resolved) {
  try {
    const res = await fetch(`/.netlify/functions/campaign-state?tenant=${encodeURIComponent(resolved.id)}`, {
      headers: { ...writeAuthHeader() },
    });
    if (!res.ok) return { entries: {}, updatedAt: null };
    return await res.json();
  } catch {
    return { entries: {}, updatedAt: null };
  }
}

/** Save the FULL entries document (last-writer-wins). Resolves {ok, status}. */
export async function saveCampaignState(resolved, entries) {
  try {
    const res = await fetch("/.netlify/functions/campaign-state", {
      method: "POST",
      headers: { "content-type": "application/json", ...writeAuthHeader() },
      body: JSON.stringify({ tenant: resolved.id, entries }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// ---- Authored content + approvals (Netlify Blobs) -----------------------------------------
// Where email copy, call scripts and their approvals live (Rick, 2026-08-03). TEXT is authored
// and approved in the platform so the approved working copy sits one click from the campaign
// that uses it; BINARY assets (one-sheets, PDFs, packshots) stay in the Media Hub and are
// referenced here by `url`. Approval vocabulary is the Media Hub's, not a second one.

export const CONTENT_KINDS = [
  { id: "email", label: "Email copy" },
  { id: "script", label: "Call script" },
  { id: "social", label: "Social post" },
  { id: "blog", label: "Blog / article" },
  { id: "doc", label: "Document" },
  { id: "other", label: "Other" },
];
export const APPROVAL_STATES = [
  { id: "draft", label: "Draft", tone: "muted" },
  { id: "in-review", label: "In review", tone: "warning" },
  { id: "approved", label: "Approved", tone: "success" },
];
export const APPROVAL_TONE = Object.fromEntries(APPROVAL_STATES.map((s) => [s.id, s.tone]));
export const APPROVAL_LABEL = Object.fromEntries(APPROVAL_STATES.map((s) => [s.id, s.label]));
export const kindLabel = (id) => CONTENT_KINDS.find((k) => k.id === id)?.label || id;

/** { entries: {campaignId: {items: [...]}}, updatedAt }. */
export async function getCampaignContent(resolved) {
  try {
    const res = await fetch(`/.netlify/functions/campaign-content?tenant=${encodeURIComponent(resolved.id)}`, {
      headers: { ...writeAuthHeader() },
    });
    if (!res.ok) return { entries: {}, updatedAt: null };
    return await res.json();
  } catch {
    return { entries: {}, updatedAt: null };
  }
}

export async function saveCampaignContent(resolved, entries) {
  try {
    const res = await fetch("/.netlify/functions/campaign-content", {
      method: "POST",
      headers: { "content-type": "application/json", ...writeAuthHeader() },
      body: JSON.stringify({ tenant: resolved.id, entries }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** The approved pieces of a kind for a campaign — what the enrichment console shows as THE script. */
export function approvedContent(contentEntries, campaignId, kind) {
  const items = contentEntries?.[campaignId]?.items || [];
  return items.filter((i) => i.approvalState === "approved" && (!kind || i.kind === kind));
}

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
];
export const OUTCOME_TONE = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, o.tone]));
export const OUTCOME_LABEL = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, o.label]));

/** A gap is closed when the call was reached AND the missing facts are actually filled in. */
export function isCleared(rec) {
  return !!rec && rec.outcome === "cleared" && !!rec.email && !!rec.buyer;
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
    const gapped = hasGap(co) && !isCleared(enrichment[co.id]);
    const rKey = regionOf(co);
    const sKey = stateOf(co) || "—";
    const cKey = cityKeyOf(co) || "—";

    if (!regions.has(rKey)) regions.set(rKey, blank(rKey, rKey));
    const R = regions.get(rKey);
    bump(R, co, gapped);

    if (!R.children.has(sKey)) R.children.set(sKey, blank(sKey, sKey));
    const S = R.children.get(sKey);
    bump(S, co, gapped);

    if (!S.children.has(cKey)) {
      const node = blank(cKey, cKey === "—" ? "—" : titleCase(cKey));
      node.variants = new Set();
      S.children.set(cKey, node);
    }
    const C = S.children.get(cKey);
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

/**
 * Enrichment picture for a campaign's own segment — the numbers the launch gate cares about.
 * `remaining` is what's still to call; `cleared` counts gaps closed on this pass.
 */
export function segmentEnrichment(campaign, companies, enrichment = {}, all = []) {
  const segment = segmentOf(scopeOf(campaign, all), companies);
  const gapped = segment.filter(hasGap);
  const cleared = gapped.filter((co) => isCleared(enrichment[co.id]));
  const remaining = gapped.filter((co) => !isCleared(enrichment[co.id]));
  return {
    segment,
    total: segment.length,
    sendable: segment.filter((co) => co.ownerEmail).length,
    gapped: gapped.length,
    cleared: cleared.length,
    remaining,
    // The whole point of doing this per campaign: one number that says "can this send go out".
    ready: gapped.length === 0 || remaining.length === 0,
  };
}

export async function getEnrichment(resolved) {
  try {
    const res = await fetch(`/.netlify/functions/campaign-enrichment?tenant=${encodeURIComponent(resolved.id)}`, {
      headers: { ...writeAuthHeader() },
    });
    if (!res.ok) return { entries: {}, updatedAt: null };
    return await res.json();
  } catch {
    return { entries: {}, updatedAt: null };
  }
}

export async function saveEnrichment(resolved, entries) {
  try {
    const res = await fetch("/.netlify/functions/campaign-enrichment", {
      method: "POST",
      headers: { "content-type": "application/json", ...writeAuthHeader() },
      body: JSON.stringify({ tenant: resolved.id, entries }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
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
      OUTCOME_LABEL[r.outcome] || "", r.note || "", r.calledAt || "",
    ].map(esc).join(",");
  });
  return [header.map(esc).join(","), ...body].join("\n");
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
