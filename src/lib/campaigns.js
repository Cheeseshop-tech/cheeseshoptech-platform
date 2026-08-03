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
      goal: "Call 66 companies to fill in a missing email or a named buyer, so those accounts can receive a send at all.",
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
