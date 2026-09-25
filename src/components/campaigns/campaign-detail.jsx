import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ListChecks, BookOpen, FileText, Users, BarChart3, Plus, X, AlertTriangle,
  CheckCircle2, XCircle, Copy, Check, ExternalLink, Link2, PhoneCall, ChevronDown, ChevronRight,
  ScrollText, Download, ClipboardList, UploadCloud, Trash2, MessageSquare, MapPin, Paperclip, Mail,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { NoteLog, notesOf } from "@/components/ui/note-log.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { ProgressBar, SaveChip, SaveNowButton } from "./campaigns-page.jsx";
import {
  LIFECYCLE, STATUS_TONE, STATUS_LABEL, CHANNELS, readinessOf, canAdvanceTo, groupChecklist, pct, typeLabel,
  CALL_OUTCOMES, OUTCOME_TONE, OUTCOME_LABEL, isCleared, isResolved, hasGap, enrichmentCsv, downloadCsv,
  callSummary, pushToHubspot,
  scopeOf, segmentEnrichment, geoBreakdown, cityKeyOf, isLongIsland, isNYCBorough,
  getRepCalls, saveRepCalls, repCallSummary,
  rosterEmails, repProgress,
  deleteCampaign, isClosed, STANDING_LESSONS,
} from "@/lib/campaigns.js";
// The tenant-wide territory book (ADR-002) — read-only here. Editing lives in the Territory Book
// tool, because a territory outlives any one campaign.
import { territoriesOfRep, accountIdsOfRep } from "@/lib/territories.js";
// Per-recipient email drafts. Documents travel as LINKS — a compose URL has no attachment
// parameter — and nothing is ever sent: every draft opens for a human to read first.
import { buildDraft, emailScripts, firstNameOf, DEFAULT_TEMPLATE } from "@/lib/mail-merge.js";
import { getCrmData, CHANNEL_TO_AUDIENCE, regionOf, stateOf, composeUrl, addressOf } from "@/lib/crm.js";
import { uploadDocument } from "@/lib/cloudinary.js";
import { MediaDocumentPicker } from "@/components/media/media-document-picker.jsx";
// Address verification (docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md) — own file, own
// Netlify function; not part of the HubSpot read-only client.
import { verifyAddress } from "@/lib/address-verify.js";
import { useAuth } from "@/lib/auth-context.jsx";
// The Library owns content and its approval vocabulary (submitted -> posted / returned).
import { CONTENT_CATEGORIES, categoryLabel, entryStatus, entryCategory } from "@/lib/presentations-store.js";

// One campaign's lifecycle dashboard — the five surfaces the handoff asked for, in the order it
// asked for them: launch-readiness checklist (the actual send gate), strategy, content, target
// prospects, results.
//
// All writes go through onPatch() into the page's single debounced save — this component holds
// no store of its own. The prospect panel reads the SAME live HubSpot data the CRM tab uses
// (getCrmData → crm-hubspot.js); it deliberately does not open a second HubSpot line, and
// per-account call status stays in the outreach console rather than forking a second overlay.

const SECTION_ICON = { checklist: ListChecks, strategy: BookOpen, content: FileText, documents: Paperclip, prospects: Users, salesreps: PhoneCall, repvisits: MapPin, results: BarChart3, updates: MessageSquare };

// Document approval vocabulary (2026-09-22) — deliberately simple: one reviewer, two outcomes,
// no multi-stage pipeline like the Content Library's submitted → posted/returned. See the
// addendum in docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md for why this exists at all.
const DOC_APPROVAL_LABEL = { pending: "Pending review", approved: "Approved", rejected: "Changes requested" };
const DOC_APPROVAL_TONE = { pending: "warning", approved: "success", rejected: "error" };

export function CampaignDetail({
  campaign: c, resolved, onBack, onPatch, onDelete, onSaveNow, entry, canWrite, book = {},
  contentItems = [], onAddContent, onPatchContent, onRemoveContent, enrichment = {}, onEnrich, allCampaigns = [], saveState = "idle",
}) {
  const r = readinessOf(c);

  function toggleItem(item) {
    const next = { ...(entry.items || {}) };
    next[item.id] = { done: !item.done, doneAt: new Date().toISOString(), ...(item.note ? { note: item.note } : {}) };
    onPatch({ items: next });
  }
  function noteItem(item, note) {
    const next = { ...(entry.items || {}) };
    next[item.id] = { ...(next[item.id] || {}), done: item.done, note, doneAt: next[item.id]?.doneAt || new Date().toISOString() };
    onPatch({ items: next });
  }
  function addItem({ label, group, required }) {
    const id = `x-${slug(label)}-${(entry.custom || []).length + 1}`;
    onPatch({ custom: [...(entry.custom || []), { id, label, group: group || "Custom", required: !!required }] });
  }
  function removeItem(item) {
    if (item.custom) {
      onPatch({ custom: (entry.custom || []).filter((x) => x.id !== item.id) });
    } else {
      onPatch({ hidden: [...new Set([...(entry.hidden || []), item.id])] });
    }
  }
  const restoreHidden = () => onPatch({ hidden: [] });
  const setStatus = (status) => onPatch({ status });
  const setResults = (part) => onPatch({ results: { ...(c.results || {}), ...part } });

  // ---- Updates (campaign-level comment log) + Mark complete -------------------------------
  // A shared running log, separate from the per-checklist-item notes above (Rick, 2026-09-21:
  // "comments and status open/closed... an update and complete option... a record kept to
  // review past campaigns"). `kind: "wrapup"` marks the note captured on close-out — that's
  // what the Past Campaigns archive (campaigns-page.jsx) shows as the entry's headline.
  const { user } = useAuth();
  const authorName = user?.user_metadata?.full_name || user?.email || "Team";
  const [completeOpen, setCompleteOpen] = useState(false);

  function addComment(text, kind = "update") {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const comment = { id, text: trimmed, author: authorName, at: new Date().toISOString(), kind };
    onPatch({ comments: [...(c.comments || []), comment] });
  }

  // ---- Documents (2026-09-21, docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md) -------------------
  // Special-offer sheets and other reference files uploaded straight into the campaign. The file
  // itself goes through the same signed Cloudinary path the Media Hub uses (uploadDocument() in
  // cloudinary.js) — this just records the pointer via the normal onPatch autosave, same as
  // comments above.
  function addDocument(asset) {
    const id = `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const doc = { id, ...asset, uploadedBy: authorName, uploadedAt: new Date().toISOString() };
    onPatch({ documents: [...(c.documents || []), doc] });
  }
  function removeDocument(id) {
    onPatch({ documents: (c.documents || []).filter((d) => d.id !== id) });
  }
  // Approve/request-changes + a per-document comment thread (2026-09-22) — opened from the new
  // full-size viewer (click the document's pill) so a reviewer never has to download the file
  // first. Reverses the 2026-09-21 "no approval workflow" call; see the spec doc addendum.
  function setDocumentApproval(id, status) {
    const documents = (c.documents || []).map((d) =>
      d.id === id ? { ...d, approvalStatus: status, approvedBy: authorName, approvedAt: new Date().toISOString() } : d
    );
    onPatch({ documents });
  }
  function addDocumentComment(id, text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const cid = `dc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const comment = { id: cid, text: trimmed, author: authorName, at: new Date().toISOString() };
    const documents = (c.documents || []).map((d) =>
      d.id === id ? { ...d, comments: [...(d.comments || []), comment] } : d
    );
    onPatch({ documents });
  }
  // "Mark complete" is the one status transition that gets its own action: it always asks for a
  // wrap-up note (what worked, what to change next time) in the same step that closes the
  // campaign, so the Past Campaigns record isn't left to a "go write it up later" that never
  // happens. Every other status move still goes through the plain pill row in LaunchGate.
  //
  // Unlike everything else on this page, this does NOT trust the passive ~1s autosave debounce
  // (Rick, 2026-09-21: a campaign he'd marked complete was still showing as in flight on the
  // Home dashboard). Retiring a campaign is a one-time, decisive action — if the write silently
  // never lands (closed the tab a beat too soon, a flaky connection, a denied/expired passcode),
  // it should surface right here, not as a campaign that quietly never actually closed. So this
  // forces an immediate flush via onSaveNow() and only closes the dialog once that's confirmed;
  // CompleteDialog shows the failure and lets Rick retry without losing the wrap-up note.
  async function confirmComplete(wrapup) {
    const trimmed = (wrapup || "").trim();
    const comments = trimmed
      ? [...(c.comments || []), {
          id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          text: trimmed, author: authorName, at: new Date().toISOString(), kind: "wrapup",
        }]
      : (c.comments || []);
    onPatch({ status: "complete", closedAt: new Date().toISOString(), comments });
    const ok = onSaveNow ? await onSaveNow() : true;
    if (ok) setCompleteOpen(false);
    return ok;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-3">
          <ArrowLeft className="h-4 w-4" /> All campaigns
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-2xl text-fg">{c.name}</h2>
              <Badge variant={STATUS_TONE[c.status] || "muted"}>{STATUS_LABEL[c.status] || c.status}</Badge>
              <Badge variant="outline">{typeLabel(c.type)}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-fg-muted">{c.goal}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              {(c.channels || []).map((ch) => (
                <span key={ch} className="rounded-full border border-border px-2.5 py-0.5">{CHANNELS[ch] || ch}</span>
              ))}
              {c.start && <span>· {c.start}{c.end ? ` → ${c.end}` : " → open"}</span>}
              {c.owner && <span>· owner {c.owner}</span>}
              {isClosed(c) && c.closedAt && <span>· closed {fmtCommentDate(c.closedAt)}</span>}
            </div>
          </div>
          {c.custom && <DeleteCampaignButton c={c} resolved={resolved} canWrite={canWrite} onDeleted={onDelete} />}
        </div>
      </div>

      <LaunchGate
        c={c} r={r} onSetStatus={setStatus} onRequestComplete={() => setCompleteOpen(true)}
        canWrite={canWrite} saveState={saveState} onSaveNow={onSaveNow}
      />

      <Section id="updates" title="Updates" description="A running log for the team — status notes, decisions, what changed. Separate from the task notes on the checklist below, and what the Past Campaigns record is built from.">
        <UpdatesPanel comments={c.comments || []} canWrite={canWrite} onAdd={addComment} />
      </Section>

      <Section id="checklist" title="Launch readiness" description="Every required task must be done before this campaign can be marked ready to launch.">
        <ChecklistPanel
          c={c} r={r} entry={entry} canWrite={canWrite}
          onToggle={toggleItem} onNote={noteItem} onAdd={addItem} onRemove={removeItem} onRestore={restoreHidden}
        />
      </Section>

      <Section id="strategy" title="Campaign strategy" description="The positioning and mechanic for this campaign.">
        <StrategyPanel strategy={c.strategy} />
      </Section>

      <Section id="content" title="Content & approvals" description="Written here, catalogued in the Content Library — which owns approval. Files live in the Media Hub and are linked.">
        <ContentPanel
          linked={c.content} sequence={c.sequence} items={contentItems} canWrite={canWrite}
          onAdd={onAddContent} onPatch={onPatchContent} onRemove={onRemoveContent}
        />
      </Section>

      <Section id="documents" title="Documents" description="Special offers, spec sheets, or anything else the team needs on hand for this campaign — uploaded here, also visible in the Media Hub's Documents tab. Click a document to review, approve, or comment without downloading it.">
        <DocumentsPanel
          documents={c.documents || []} canWrite={canWrite} resolved={resolved} campaignId={c.id}
          onAdd={addDocument} onRemove={removeDocument} onApprove={setDocumentApproval} onComment={addDocumentComment}
        />
      </Section>

      <Section id="prospects" title={c.type === "enrichment" ? "Call console" : "Target prospects"} description={c.type === "enrichment" ? "Work the gap list — the approved script, the number, and what the call produced." : "Who this campaign reaches — live from the same HubSpot data as the CRM console."}>
        <ProspectPanel
          c={c} resolved={resolved} scripts={contentItems} allCampaigns={allCampaigns}
          enrichment={enrichment} onEnrich={onEnrich} canWrite={canWrite} saveState={saveState}
        />
      </Section>

      <Section
        id="repvisits"
        title="Rep roster & territory"
        description="Pick the reps this campaign is working — no territory needed to start. Email the roster, follow up by phone, and each rep's territory fills in as you talk to them. Target Prospects above is scoped to the accounts in their territories; the territories themselves live in the Territory Book, because they outlive this campaign."
      >
        <RepRosterPanel
          c={c} resolved={resolved} canWrite={canWrite} onPatch={onPatch} saveState={saveState}
          book={book} contentItems={contentItems}
        />
      </Section>

      {c.audience?.salesReps?.length > 0 && (
        <Section
          id="salesreps"
          title="Sales Rep Contacts"
          description="The distributor's own team, kept separate from the target-prospect accounts above — confirm territory, find out whose accounts fit Monti Trentini, and book booth time with that rep for the show."
        >
          <SalesRepPanel reps={c.audience.salesReps} resolved={resolved} canWrite={canWrite} />
        </Section>
      )}

      <Section id="results" title="Results" description={c.status === "launched" || c.status === "complete" ? "Performance since launch." : "Fills in once the campaign launches."}>
        <ResultsPanel c={c} onChange={setResults} canWrite={canWrite} />
      </Section>

      <CompleteDialog
        open={completeOpen} onClose={() => setCompleteOpen(false)} onConfirm={confirmComplete} campaignName={c.name}
      />
    </div>
  );
}

function Section({ id, title, description, children }) {
  const Icon = SECTION_ICON[id] || ListChecks;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 not-italic font-heading">
          <Icon className="h-5 w-5 text-fg-muted" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Retire a duplicate campaign created from the New Campaign form (2026-09-01, Rick: "there are
// these 3 instances for the same campaign I want to consolidate"). Only campaigns created that
// way carry `custom: true` (netlify/functions/campaign-defs.js) — a seeded campaign has no row
// in that store to delete, so the button never renders for one (gated by `c.custom` at the call
// site). Two-step confirm since this is a genuine delete, not a hide/archive.
function DeleteCampaignButton({ c, resolved, canWrite, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-base border border-error/40 bg-error/5 px-3 py-2 text-sm">
        <span className="text-fg">Delete “{c.name}” for good?</span>
        <Button
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await deleteCampaign(resolved, c.id);
            setBusy(false);
            if (res.ok) onDeleted?.(c.id);
            else setError(res.status === 401 || res.status === 403 ? "Admin passcode required" : res.error || "Delete failed");
          }}
        >
          {busy ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setError(""); }}>Cancel</Button>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
  return (
    <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => setConfirming(true)} title={canWrite ? "Delete this campaign" : "Admin passcode required"}>
      <Trash2 className="h-3.5 w-3.5" /> Delete campaign
    </Button>
  );
}

// ---- Sales rep contacts / rep-qualification call console (2026-09-01) -----------------------
// The distributor's OWN people, not the account-scoped Target Prospects/Call console above —
// a separate tab because the ask on a call here is different ("what's your territory"), not
// "will you come to the show". Its own debounced save (getRepCalls/saveRepCalls, keyed by
// email — reps are seeded in code, not live HubSpot records, so there's no numeric id to key on
// the way CompanyRow's onEnrich does) rather than threading a new prop through campaigns-page.jsx.
function SalesRepPanel({ reps = [], resolved, canWrite }) {
  const [q, setQ] = useState("");
  const [calls, setCalls] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const timer = useRef(null);
  const callsRef = useRef(calls);
  callsRef.current = calls;

  // CRM-05 follow-up (2026-09-03): getRepCalls() now resolves null on a failed read instead of
  // a fake {entries:{}} — saveRepCalls() is a full-document last-writer-wins write, so starting
  // from {} on a failed load and saving one edit would wipe real saved call outcomes. loadOkRef
  // gates scheduleSave() below.
  const loadOkRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadOkRef.current = false;
    getRepCalls(resolved).then((d) => {
      if (!alive) return;
      if (d) { loadOkRef.current = true; setCalls(d.entries || {}); }
      else { setSaveState("load-failed"); }
    }).catch(() => { if (alive) setSaveState("load-failed"); });
    return () => { alive = false; };
  }, [resolved.id]);

  function scheduleSave(next) {
    if (!loadOkRef.current) { setSaveState("load-failed"); return; } // refuse to save over an unloaded overlay
    setCalls(next);
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState("saving");
      const res = await saveRepCalls(resolved, callsRef.current);
      setSaveState(res.ok ? "saved" : res.status === 401 ? "denied" : "failed");
    }, 900);
  }
  const patchRep = (email, part) => {
    const key = String(email || "").trim().toLowerCase();
    if (!key) return; // no email on file — nothing to key the call record on
    scheduleSave({ ...callsRef.current, [key]: { ...callsRef.current[key], ...part, calledAt: new Date().toISOString() } });
  };

  const summary = useMemo(() => repCallSummary(reps, calls), [reps, calls]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return reps;
    return reps.filter((r) => [r.name, r.jobtitle, r.email, r.phone].some((v) => v && String(v).toLowerCase().includes(needle)));
  }, [reps, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by name, title, phone, or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <RowSaveStatus state={saveState} />
      </div>
      <p className="text-xs text-fg-muted">
        {filtered.length} of {reps.length} shown — every HubSpot contact under Ace Endico, admin/back-office
        titles included. Call each one to confirm their territory; mark "Not a prospect" for anyone who
        turns out to be admin/back-office, not a field rep. {summary.called}/{summary.total} called so far
        {summary.notAField ? ` (${summary.notAField} confirmed not field reps)` : ""}.
      </p>
      <ul className="space-y-2">
        {filtered.map((r, i) => (
          <RepCallRow
            key={r.email || `${r.name}-${i}`}
            rep={r}
            rec={calls[String(r.email || "").trim().toLowerCase()] || {}}
            canWrite={canWrite}
            resolved={resolved}
            onPatch={(part) => patchRep(r.email, part)}
          />
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-fg-muted">No match.</li>
        )}
      </ul>
    </div>
  );
}

function RepCallRow({ rep, rec, canWrite, onPatch, resolved }) {
  const [open, setOpen] = useState(false);
  const outcome = rec.outcome || "not-called";
  const touched = outcome !== "not-called" || rec.territory || rec.note;
  const hasEmail = !!String(rep.email || "").trim();

  return (
    <li className="rounded-base border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" />}
          <span className="min-w-0">
            <span className="block truncate text-sm text-fg">{rep.name}</span>
            <span className="block text-xs text-fg-muted">{rep.jobtitle || "—"}</span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {touched && <Badge variant={OUTCOME_TONE[outcome] || "muted"}>{OUTCOME_LABEL[outcome]}</Badge>}
          {rec.territory && <Badge variant="outline">{rec.territory}</Badge>}
          <PhoneInline phone={rep.phone} />
          <EmailInline resolved={resolved} to={rep.email} subject={`${rep.name} — territory check-in`} />
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <p className="text-xs text-fg-muted">{rep.email || "no email on file — call outcome can't be saved for this row"}</p>
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            <div className="grid gap-1.5">
              <Label htmlFor={`ro-${rep.email || rep.name}`}>Call outcome</Label>
              <select
                id={`ro-${rep.email || rep.name}`} value={outcome} disabled={!canWrite || !hasEmail}
                onChange={(e) => onPatch({ outcome: e.target.value })}
                className="h-10 rounded-base border border-border bg-surface px-3 text-sm text-fg disabled:opacity-40"
              >
                {CALL_OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <Field
              label="Territory / accounts they cover" value={rec.territory}
              placeholder="e.g. NY Metro, or specific named accounts" disabled={!canWrite || !hasEmail}
              onChange={(v) => onPatch({ territory: v })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`rn-${rep.email || rep.name}`}>Call notes</Label>
            <Textarea
              id={`rn-${rep.email || rep.name}`} className="min-h-[2.5rem] text-sm"
              placeholder="What they said, best time to reach them again…"
              defaultValue={rec.note || ""} disabled={!canWrite || !hasEmail}
              onChange={(e) => onPatch({ note: e.target.value })}
            />
          </div>
          {outcome === "not-a-prospect" && (
            <p className="text-xs text-fg-muted">
              Confirmed not a field rep — stays visible here, just no longer counted as outstanding.
            </p>
          )}
          {rec.calledAt && <p className="text-xs text-fg-muted">Last updated {rec.calledAt.slice(0, 16).replace("T", " ")}</p>}
        </div>
      )}
    </li>
  );
}

// A "Send" (mailto/Gmail-compose) counterpart to PhoneInline — forces the tenant's shared sales
// identity when one is configured (composeUrl(), src/lib/crm.js), the same trick Booth's
// Calendar/Recap buttons already use. The rep still taps Send themselves; nothing leaves the
// device on its own.
function EmailInline({ resolved, to, subject = "", body = "" }) {
  if (!to) return null;
  const href = composeUrl({ calendar: resolved?.calendar, to, subject, body });
  return (
    <a
      href={href} target="_blank" rel="noreferrer" title={`Email ${to}`}
      className="text-fg-muted hover:text-brand-primary"
    >
      <Mail className="h-3.5 w-3.5" />
    </a>
  );
}

// ---- Rep territory / account assignments (2026-09-21, revised 2026-09-22) -------------------
// Generic and reusable across ANY distributor's reps (Rick: "in the near future we will wire
// other distributors and their reps to the campaign engine") — unlike the older hardcoded
// audience.salesReps list above (Sales Rep Contacts), this pulls LIVE HubSpot contacts for
// whatever company name is set as the source, because HubSpot only holds the distributor's HQ
// address on every one of its contacts, never a rep's own territory.
//
// FLOW (revised 2026-09-22, Rick: "modify it so I can first select the reps then in each rep
// card assign territory and or accounts. leave the flexability to assign the same terrritory
// to multiple reps since there are a few opperating in the same or crossover areas in the same
// city or town or state"):
//   Step 1 — pick which reps you're building territory for right now (a rep isn't assigned
//   anything just by being picked here; picking just opens their card).
//   Rep cards — one per picked rep, each with its OWN territory tree (state/city/town/borough
//   checkboxes) and its OWN account checklist. Locking in a rep's territory ADDS that rep to
//   every matched account without touching any other rep already on it, and every account row
//   is its own checkbox per rep rather than a single dropdown — so the SAME account, city, or
//   whole state can legitimately belong to several reps' cards at once for crossover coverage.
// The actual source of truth is accountAssignments (company id -> ARRAY of rep emails,
// campaign-state.js) — accountAssignmentScope()/mergeCampaign() (lib/campaigns.js) feed the
// company-id keys straight into audience.companyIds so Target Prospects auto-populates the
// instant an account is (re)assigned, no separate "apply" step (Rick: "create the field to be
// filled in that will automatically route itself once filled out"). Also wired into the New
// Campaign template (new-campaign-form.jsx `audience.repsFrom`) so the next distributor-visits
// campaign starts with this tab live, not a bespoke rebuild.
function normCompany(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// (repEmailsOf lived here until 2026-09-22. It normalized legacy single-string accountAssignments
// values for this panel; that map is no longer read here — territories.js owns rep↔account now,
// and campaigns.js still handles the legacy shape for campaigns that predate the territory book.)

// ---- Rep roster + territory (ADR-002 + spec Revision 4) --------------------------------------
//
// Rick, 2026-09-22: "I want to pick the reps list first for the campaign then assign territory
// second as we go... launch the campaign with an email then follow up with phone calls. and while
// I develop my communication and relationship with the rep I will build in the accounts and the
// territories."
//
// WHAT REPLACED WHAT. This panel used to be territory-first: check states/cities, then assign a
// rep, and the resulting {companyId: [repEmail]} map was the only durable rep↔campaign link. That
// made a rep a member of the campaign only once they had a territory — backwards — and the three
// selections that actually drove the work (who to email, whose card is open, whose accounts to
// call) were plain useState, so they evaporated on reload. "Pick twelve reps and email them" could
// not be stored at all.
//
// Now: the ROSTER is the campaign (persisted, campaign-state.repRoster), and territory is a
// tenant-wide fact that accrues to a rep over weeks of calls (territory-book.js). Editing
// territories happens in the Territory Book tool, not here — a territory outlives this campaign,
// so a campaign panel is the wrong place to own it. This panel reads the book and shows what each
// rostered rep covers.
//
// Progress is DERIVED, never stored: emailed (roster.emailedAt), called + territory
// (campaign-rep-calls), accounts (the book). Four independent facts, not a funnel — a rep can hand
// over their territory in the first email reply, or take three calls and never name one.

function RepRosterPanel({ c, resolved, canWrite, onPatch, saveState = "idle", book = {}, contentItems = [] }) {
  // Memoized rather than `c.repRoster || {}` inline: the fallback literal is a new object every
  // render, which would re-run every derivation below even when the roster hasn't changed.
  const roster = useMemo(() => c.repRoster || {}, [c.repRoster]);
  const [source, setSource] = useState(roster.source || c.audience?.repsFrom || "");
  const [crm, setCrm] = useState(undefined);
  const [q, setQ] = useState("");
  const [calls, setCalls] = useState({});
  const [callSave, setCallSave] = useState("idle");
  const [onlyToCall, setOnlyToCall] = useState(false);
  const [openRep, setOpenRep] = useState("");
  const callsRef = useRef(calls);
  callsRef.current = calls;
  const callsLoadOk = useRef(false);
  const callTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    setCrm(undefined);
    getCrmData(resolved).then((d) => alive && setCrm(d || null)).catch(() => alive && setCrm(null));
    callsLoadOk.current = false;
    getRepCalls(resolved).then((d) => {
      if (!alive) return;
      if (d) { callsLoadOk.current = true; setCalls(d.entries || {}); }
      else setCallSave("load-failed");
    }).catch(() => alive && setCallSave("load-failed"));
    return () => { alive = false; clearTimeout(callTimer.current); };
  }, [resolved.id]);

  // Same last-writer-wins guard SalesRepPanel uses: never save over an overlay that failed to load.
  function saveCalls(next) {
    if (!callsLoadOk.current) { setCallSave("load-failed"); return; }
    setCalls(next);
    setCallSave("dirty");
    clearTimeout(callTimer.current);
    callTimer.current = setTimeout(async () => {
      setCallSave("saving");
      const res = await saveRepCalls(resolved, callsRef.current);
      setCallSave(res.ok ? "saved" : res.status === 401 ? "denied" : "failed");
    }, 900);
  }
  const patchRepCall = (email, part) => {
    const key = String(email || "").trim().toLowerCase();
    if (!key) return;
    saveCalls({ ...callsRef.current, [key]: { ...callsRef.current[key], ...part, calledAt: new Date().toISOString() } });
  };

  const reps = useMemo(() => roster.reps || {}, [roster]);
  const onRoster = useMemo(() => rosterEmails(roster), [roster]);

  function patchRoster(next) {
    onPatch({ repRoster: { ...(source ? { source } : {}), reps: next } });
  }
  function saveSource(next) {
    setSource(next);
    onPatch({ repRoster: { ...(next ? { source: next } : {}), reps } });
  }

  /** Add or remove a rep. Removing sets `dropped` rather than deleting: having emailed someone is
   *  a fact about the past, and deleting the record would erase it. */
  function toggleRoster(person) {
    const key = String(person.email || "").trim().toLowerCase();
    if (!key) return;
    const cur = reps[key];
    if (cur && !cur.dropped) {
      patchRoster({ ...reps, [key]: { ...cur, dropped: true } });
    } else {
      patchRoster({
        ...reps,
        [key]: {
          ...(cur || {}),
          name: person.name || cur?.name || "",
          phone: person.phone || cur?.phone || "",
          jobtitle: person.jobtitle || cur?.jobtitle || "",
          addedAt: cur?.addedAt || new Date().toISOString(),
          dropped: false,
        },
      });
    }
  }

  // Candidate reps: live HubSpot contacts at the distributor named in `source`, UNIONED with the
  // campaign's own seeded rep list (audience.salesReps).
  //
  // The union is not belt-and-braces — it's load-bearing. HubSpot and the seeded list genuinely
  // disagree: Michael Cannillo (mcannillo@aceendico.com) is in the seed and in no HubSpot import,
  // and Rick confirmed 2026-09-22 that he doesn't appear in the live CRM either. Reading only live
  // HubSpot would make him — and anyone else in that gap — impossible to put on a roster, which is
  // strictly worse than the panel this replaced, since the old Sales Rep Contacts panel read the
  // seed. `inHubspot: false` is surfaced in the UI rather than papered over: a rep you can call but
  // can't find in the CRM is a record that needs creating, and hiding that just loses the fact.
  const candidates = useMemo(() => {
    const needle = normCompany(source);
    const byEmail = new Map();
    if (needle && crm?.people?.length) {
      for (const p of crm.people) {
        if (!p.email || !p.company || !normCompany(p.company).includes(needle)) continue;
        const k = p.email.toLowerCase();
        if (!byEmail.has(k)) byEmail.set(k, { ...p, inHubspot: true });
      }
    }
    // Seeded reps show whether or not a source has been typed — they belong to this campaign, not
    // to a HubSpot lookup, so they shouldn't be gated behind one.
    for (const r of c.audience?.salesReps || []) {
      const k = String(r.email || "").toLowerCase();
      if (!k || byEmail.has(k)) continue;
      byEmail.set(k, { ...r, email: k, inHubspot: false });
    }
    return [...byEmail.values()]
      .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
  }, [crm, source, c.audience?.salesReps]);

  const missingFromCrm = useMemo(() => candidates.filter((p) => !p.inHubspot).length, [candidates]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((p) => [p.name, p.jobtitle, p.email, p.phone]
      .some((v) => v && String(v).toLowerCase().includes(needle)));
  }, [candidates, q]);

  // One row per rostered rep, with everything known about them assembled in one place.
  const rows = useMemo(() => onRoster.map((email) => {
    const r = reps[email] || {};
    const terrs = territoriesOfRep(book, email);
    const accounts = accountIdsOfRep(book, email);
    return {
      email,
      name: r.name || email,
      phone: r.phone || "",
      jobtitle: r.jobtitle || "",
      emailedAt: r.emailedAt || "",
      territories: terrs,
      accounts: accounts.length,
      progress: repProgress(email, { roster, calls, accountCount: accounts.length }),
      call: calls[email] || {},
    };
  }), [onRoster, reps, book, roster, calls]);

  // Sorted by what needs doing next, so the top of the list is always the next action.
  const ordered = useMemo(() => {
    const rank = (r) => (!r.progress.emailed ? 0 : !r.progress.called ? 1 : !r.progress.territory ? 2 : 3);
    const list = onlyToCall ? rows.filter((r) => r.progress.emailed && !r.progress.called) : rows;
    return [...list].sort((a, b) => rank(a) - rank(b) || (a.emailedAt || "").localeCompare(b.emailedAt || "") || a.name.localeCompare(b.name));
  }, [rows, onlyToCall]);

  const stats = useMemo(() => ({
    total: rows.length,
    emailed: rows.filter((r) => r.progress.emailed).length,
    called: rows.filter((r) => r.progress.called).length,
    mapped: rows.filter((r) => r.progress.territory || r.accounts > 0).length,
    accounts: new Set(rows.flatMap((r) => territoriesOfRep(book, r.email).flatMap((t) => t.accountIds || []))).size,
    toCall: rows.filter((r) => r.progress.emailed && !r.progress.called).length,
  }), [rows, book]);

  // The campaign's posted email copy, and the documents that may travel with it. See
  // src/lib/mail-merge.js for why documents become LINKS and why only approved ones are included.
  const scripts = useMemo(() => emailScripts(contentItems, { entryCategory, entryStatus }), [contentItems]);
  const [scriptId, setScriptId] = useState("");
  const script = useMemo(
    () => scripts.find((s) => s.id === scriptId) || scripts[0] || null,
    [scripts, scriptId]
  );
  const template = useMemo(() => (script
    ? { subject: script.title || c.name || "", body: script.body }
    : DEFAULT_TEMPLATE), [script, c.name]);

  const docs = c.documents || [];
  const sender = resolved.calendar?.address || "";

  /**
   * Draft ONE rep's email and stamp them emailed.
   *
   * One at a time, never a batch: a browser blocks the second and later popups from a single
   * click anyway, but more importantly each draft is meant to be read before it goes. The stamp is
   * written when the composer opens — `emailedAt` is what the ✉ dot reads, so it has to describe
   * something that actually happened, not something intended.
   */
  function draftFor(row) {
    const d = buildDraft({
      recipient: { name: row.name, email: row.email, company: source },
      campaign: c, documents: docs, template, sender,
    });
    const a = document.createElement("a");
    a.href = composeUrl({ calendar: resolved.calendar, to: d.to, subject: d.subject, body: d.body });
    a.target = "_blank"; a.rel = "noreferrer";
    a.click();
    patchRoster({ ...reps, [row.email]: { ...(reps[row.email] || {}), emailedAt: reps[row.email]?.emailedAt || new Date().toISOString() } });
  }

  const notYetEmailed = ordered.filter((r) => !r.progress.emailed);
  const nextToDraft = notYetEmailed[0] || null;
  const preview = useMemo(() => (nextToDraft
    ? buildDraft({
        recipient: { name: nextToDraft.name, email: nextToDraft.email, company: source },
        campaign: c, documents: docs, template, sender,
      })
    : null), [nextToDraft, c, docs, template, sender, source]);

  return (
    <div className="space-y-5">
      {/* Step 1 — who this campaign is working. Nothing is assigned by being here. */}
      <div className="space-y-2">
        <Label htmlFor="rep-source">Step 1 · Roster — who are you working?</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="rep-source"
            placeholder="Distributor — HubSpot company name (e.g. Ace Endico)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={(e) => saveSource(e.target.value)}
            disabled={!canWrite}
            className="max-w-sm"
          />
          <SaveChip state={saveState} />
        </div>
        <p className="text-xs text-fg-muted">
          Checking a rep in puts them on this campaign — no territory needed. Territory and accounts
          come later, as you talk to them.
        </p>
      </div>

      {crm === undefined ? (
        <p className="text-sm text-fg-muted">Loading contacts…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {source.trim()
            ? `No contacts matched “${source}”, and this campaign has no seeded rep list.`
            : "Name the distributor above to load their reps."}
        </p>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="Search by name, title, phone, or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {shown.map((p) => {
              const key = p.email.toLowerCase();
              const on = !!reps[key] && !reps[key].dropped;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!canWrite}
                  onClick={() => toggleRoster(p)}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-brand-primary bg-brand-primary text-white" : "border-border text-fg-muted hover:border-brand-primary"}`}
                  title={p.inHubspot ? (p.jobtitle || p.email) : `${p.jobtitle || p.email} — not found in HubSpot`}
                >
                  {on ? "✓ " : "+ "}{p.name || p.email}
                  {/* Not a warning about the rep — a pointer at a CRM record that needs creating.
                      They stay fully selectable; the campaign shouldn't wait on data entry. */}
                  {!p.inHubspot && <span className="ml-1 opacity-70" aria-label="not in HubSpot">·CRM?</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-fg-muted">
            {shown.length} of {candidates.length} contacts shown.
            {missingFromCrm > 0 && (
              <> {missingFromCrm} marked <strong>·CRM?</strong> are on this campaign’s own rep list
              but not in HubSpot — you can roster them now; they’re worth adding to the CRM.</>
            )}
          </p>
        </div>
      )}

      {/* Step 2 — work the roster. */}
      {rows.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>Step 2 · Work the roster</Label>
              <p className="text-xs text-fg-muted">
                {stats.total} reps · {stats.emailed} emailed · {stats.called} called · {stats.mapped} mapped ·{" "}
                {stats.accounts} accounts covered
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RowSaveStatus state={callSave} />
              {nextToDraft && (
                <Button size="sm" disabled={!canWrite} onClick={() => draftFor(nextToDraft)}>
                  <Mail className="mr-1.5 h-4 w-4" />
                  Draft next — {firstNameOf(nextToDraft.name)} ({notYetEmailed.length} left)
                </Button>
              )}
              <Button
                size="sm"
                variant={onlyToCall ? "default" : "outline"}
                onClick={() => setOnlyToCall((v) => !v)}
                title="Emailed, no call logged yet"
              >
                <PhoneCall className="mr-1.5 h-4 w-4" />
                Call queue ({stats.toCall})
              </Button>
            </div>
          </div>

          {/* What each draft will actually say, resolved for the next recipient. A merge you
              can't see before it fires is a merge that goes out wrong twelve times. */}
          {preview && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-sm">
                Preview the draft for <strong>{nextToDraft.name}</strong>
                {" — "}{preview.documentCount} document{preview.documentCount === 1 ? "" : "s"} attached as links
                {preview.withheldCount > 0 && `, ${preview.withheldCount} withheld (not approved)`}
              </summary>
              <div className="space-y-2 border-t border-border p-3">
                {scripts.length > 1 && (
                  <select
                    aria-label="Email copy to merge from"
                    className="h-9 w-full max-w-sm rounded-md border border-border bg-bg px-2 text-sm"
                    value={script?.id || ""}
                    onChange={(e) => setScriptId(e.target.value)}
                  >
                    {scripts.map((s) => <option key={s.id} value={s.id}>{s.title || "Untitled copy"}</option>)}
                  </select>
                )}
                <p className="text-xs text-fg-muted">
                  {script
                    ? <>Merging from posted copy: <strong>{script.title || "Untitled"}</strong>.</>
                    : <>No posted <em>Email campaigns</em> copy on this campaign yet, so this is a blank
                       starter. Write one in <strong>Content &amp; approvals</strong> above and post it.</>}
                  {" "}Documents go as links — an email composer can’t carry attachments.
                </p>
                <div className="rounded-md bg-bg-subtle p-2 text-sm">
                  <div><span className="text-fg-muted">To:</span> {preview.to}</div>
                  <div><span className="text-fg-muted">Subject:</span> {preview.subject}</div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{preview.body}</pre>
                </div>
              </div>
            </details>
          )}

          <ul className="space-y-2">
            {ordered.map((r) => (
              <li key={r.email} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-fg-muted">
                      {[r.jobtitle, r.email].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Dot on={r.progress.emailed} label={r.emailedAt ? `Emailed ${r.emailedAt.slice(5, 10)}` : "Not emailed"} />
                      <Dot on={r.progress.called} label={r.progress.called ? OUTCOME_LABEL[r.call.outcome] || "Called" : "No call yet"} />
                      <Dot on={r.progress.territory} label={r.progress.territory ? r.call.territory : "No territory yet"} />
                      <Dot on={r.accounts > 0} label={`${r.accounts} account${r.accounts === 1 ? "" : "s"}`} />
                    </div>
                    {r.territories.length > 0 && (
                      <div className="mt-1 text-xs text-fg-muted">
                        Covers: {r.territories.map((t) => t.name).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {r.phone && <PhoneInline phone={r.phone} />}
                    <Button size="sm" variant="outline" disabled={!canWrite} onClick={() => draftFor(r)}>
                      <Mail className="mr-1.5 h-4 w-4" />
                      {r.progress.emailed ? "Draft again" : "Draft email"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setOpenRep(openRep === r.email ? "" : r.email)}>
                      {openRep === r.email ? "Close" : "Log call"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => toggleRoster({ email: r.email })}>
                      Drop
                    </Button>
                  </div>
                </div>

                {openRep === r.email && (
                  <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-[180px_1fr]">
                    <select
                      aria-label={`Call outcome for ${r.name}`}
                      className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
                      value={r.call.outcome || "not-called"}
                      disabled={!canWrite}
                      onChange={(e) => patchRepCall(r.email, { outcome: e.target.value })}
                    >
                      {CALL_OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                    <Input
                      placeholder="Territory they gave you — type it as they said it"
                      defaultValue={r.call.territory || ""}
                      disabled={!canWrite}
                      onBlur={(e) => patchRepCall(r.email, { territory: e.target.value })}
                    />
                    <div className="sm:col-span-2">
                      <Textarea
                        placeholder="Notes from the call…"
                        defaultValue={r.call.note || ""}
                        disabled={!canWrite}
                        onBlur={(e) => patchRepCall(r.email, { note: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {onlyToCall && ordered.length === 0 && (
            <p className="text-sm text-fg-muted">Nobody is waiting on a call — everyone emailed has been rung.</p>
          )}

          <p className="text-xs text-fg-muted">
            Target Prospects above is scoped to the accounts in these reps’ territories. Territories
            themselves are edited in the <strong>Territory Book</strong> tool — they outlive this
            campaign, so they aren’t owned by it.
          </p>
        </div>
      )}
    </div>
  );
}

/** One progress fact. Deliberately a fact-with-a-label, not a stage number — see the panel note. */
function Dot({ on, label }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${on ? "border-success text-success" : "border-border text-fg-muted"}`}>
      <span aria-hidden>{on ? "●" : "○"}</span>{label}
    </span>
  );
}

// ---- The gate ------------------------------------------------------------------------------
// The status control is where the checklist stops being decoration: anything at or past "ready"
// is disabled while a required task is outstanding, and the reason is named.
function LaunchGate({ c, r, onSetStatus, onRequestComplete, canWrite, saveState = "idle", onSaveNow }) {
  return (
    <Card className={r.ready ? "border-success" : undefined}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[16rem] flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SaveChip state={saveState} />
              {onSaveNow && <SaveNowButton state={saveState} onSave={onSaveNow} />}
            </div>
            <div className="flex items-center gap-2">
              {r.ready
                ? <CheckCircle2 className="h-5 w-5 text-success" />
                : <AlertTriangle className="h-5 w-5 text-warning" />}
              <p className="font-medium text-fg">
                {r.ready ? "Clear to launch" : `${r.requiredTotal - r.requiredDone} required task${r.requiredTotal - r.requiredDone === 1 ? "" : "s"} outstanding`}
              </p>
            </div>
            <div className="mt-3 max-w-md">
              <ProgressBar done={r.requiredDone} total={r.requiredTotal} tone={r.ready ? "success" : "brand"} />
              <p className="mt-1.5 text-xs text-fg-muted">
                {r.requiredDone}/{r.requiredTotal} required · {r.done}/{r.total} total tasks done
              </p>
            </div>
            {!r.ready && r.blockers.length > 0 && (
              <p className="mt-2 text-xs text-fg-muted">
                Blocking: {r.blockers.map((b) => b.label).join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LIFECYCLE.map((s) => {
              const gate = canAdvanceTo(c, s.id);
              const disabled = !canWrite || (!gate.ok && s.id !== c.status);
              const active = c.status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  title={disabled && !gate.ok ? gate.reason : s.blurb}
                  onClick={() => (s.id === "complete" && !active ? onRequestComplete() : onSetStatus(s.id))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    active
                      ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                      : "border-border text-fg-muted hover:text-fg hover:border-brand-primary",
                    disabled && !active ? "cursor-not-allowed opacity-40 hover:border-border hover:text-fg-muted" : "",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Updates (campaign-level comments) ------------------------------------------------------
// One shared, timestamped log per campaign — separate from the per-checklist-item notes in
// ChecklistRow below. This is "what happened and when," not "is this task done."
function UpdatesPanel({ comments = [], canWrite, onAdd }) {
  const [text, setText] = useState("");
  const sorted = [...comments].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  function post() {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="space-y-2">
          <Textarea
            rows={2}
            placeholder="Post a status update for the team…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); } }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-fg-muted">⌘/Ctrl + Enter to post</p>
            <Button size="sm" onClick={post} disabled={!text.trim()}>Post update</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-fg-muted">No updates yet — post one to keep a record for later.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((cm) => (
            <li key={cm.id} className="rounded-base border border-border p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                <span className="font-medium text-fg">{cm.author}</span>
                <span>· {fmtCommentDate(cm.at)}</span>
                {cm.kind === "wrapup" && <Badge variant="outline">Wrap-up</Badge>}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-fg">{cm.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtCommentDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}

// ---- Documents (2026-09-21; approval + comments added 2026-09-22) -----------------------------
// Special-offer sheets, spec sheets, or any other reference file a campaign needs on hand.
// Uploads through the same signed Cloudinary path the Media Hub uses (uploadDocument() in
// cloudinary.js) — tagged `campaign-document` and linked via `campaignId` in Cloudinary's
// context, so the same file also shows up under the Media Hub's Documents tab.
//
// Originally shipped with no approval step ("reference material, not content pending review").
// Reversed 2026-09-22 (Rick, confirmed directly): each document is now a clickable pill that
// opens a full-size DocumentViewerDialog — preview, approve/request-changes, and a comment
// thread, all without downloading the file first. See the addendum in
// docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md.
function fmtBytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// What the viewer can render inline vs. fall back to open/download for. Campaign documents are
// always uploaded as Cloudinary resource_type "raw" (see uploadDocument()), so there's no
// server-side page rasterization available the way the buyer catalog's spec-sheet PDFs get —
// images render directly, PDFs get the browser's own inline viewer via an iframe, everything
// else (DOC/XLS/PPT and friends) has no in-browser preview at all.
function previewKind(format) {
  const f = (format || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(f)) return "image";
  if (f === "pdf") return "pdf";
  return "none";
}

function DocumentsPanel({ documents = [], canWrite, resolved, campaignId, onAdd, onRemove, onApprove, onComment }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const [viewingId, setViewingId] = useState(null);
  const sorted = [...documents].sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  // Look up by id against the live `documents` prop (not `sorted`, though they're the same set)
  // so the dialog reflects an approval/comment the instant onPatch's round trip updates it.
  const viewing = viewingId ? documents.find((d) => d.id === viewingId) || null : null;

  async function onFilesSelected(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const asset = await uploadDocument({
          file, tenantFolder: resolved.cloudinaryFolder, campaignId, displayName: file.name, tenantId: resolved.id,
        });
        onAdd(asset);
      }
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef} type="file" multiple hidden onChange={onFilesSelected}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg"
          />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <UploadCloud className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload document"}
          </Button>
          {/* Pick something that's already in the Media Hub -- spec sheets, sell sheets, photos --
              instead of uploading a fresh copy (Rick, 2026-09-21). Multi-select; each picked asset
              flows through the same onAdd() path as a fresh upload. */}
          <MediaDocumentPicker resolved={resolved} disabled={uploading} onAdd={(docs) => docs.forEach(onAdd)} />
          {error && <span className="text-xs text-error">{error}</span>}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-fg-muted">No documents yet — attach a special-offer sheet or other reference file.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-base border border-border p-3">
              {/* The whole point of this pill: click opens the full-size viewer (preview +
                  approve/comment) instead of jumping straight to a download. */}
              <button
                type="button"
                onClick={() => setViewingId(d.id)}
                className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:border-brand-primary"
                title="Open full-size view"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                <span className="max-w-[16rem] truncate">{d.name}</span>
              </button>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-fg-muted">
                <Badge variant={DOC_APPROVAL_TONE[d.approvalStatus || "pending"]}>
                  {DOC_APPROVAL_LABEL[d.approvalStatus || "pending"]}
                </Badge>
                {d.format && <Badge variant="outline">{d.format.toUpperCase()}</Badge>}
                {fmtBytes(d.bytes) && <span>{fmtBytes(d.bytes)}</span>}
                <span>{d.uploadedBy} · {fmtCommentDate(d.uploadedAt)}</span>
                {canWrite && (
                  <Button variant="ghost" size="sm" onClick={() => onRemove(d.id)} title="Remove from this campaign (does not delete the file from the Media Hub)">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DocumentViewerDialog
        doc={viewing} canWrite={canWrite}
        onClose={() => setViewingId(null)}
        onApprove={onApprove} onComment={onComment}
      />
    </div>
  );
}

// Full-size view opened by clicking a document's pill above — preview on the left, an
// approve/request-changes action and a threaded comment list on the right, so reviewing a
// document never requires downloading it first. Comments are modeled on UpdatesPanel above
// (author/timestamp/text) but scoped to this one document instead of the whole campaign.
function DocumentViewerDialog({ doc: d, canWrite, onClose, onApprove, onComment }) {
  const [text, setText] = useState("");
  const kind = previewKind(d?.format);
  const status = d?.approvalStatus || "pending";
  const sortedComments = [...(d?.comments || [])].sort((a, b) => (a.at || "").localeCompare(b.at || ""));

  // Comment draft doesn't need to survive between documents — clear it whenever a different
  // document is opened so a half-typed note can't get posted to the wrong one.
  useEffect(() => { setText(""); }, [d?.id]);

  function post() {
    if (!text.trim() || !d) return;
    onComment(d.id, text);
    setText("");
  }

  return (
    <Dialog open={!!d} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0">
        {d && (
          <div className="grid max-h-[85vh] md:grid-cols-[1.5fr_1fr]">
            <div className="flex max-h-[85vh] flex-col overflow-y-auto p-5 md:rounded-l-base">
              <DialogTitle className="mb-1 truncate text-lg">{d.name}</DialogTitle>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant={DOC_APPROVAL_TONE[status]}>{DOC_APPROVAL_LABEL[status]}</Badge>
                {d.format && <Badge variant="outline">{d.format.toUpperCase()}</Badge>}
                <span className="text-xs text-fg-muted">
                  {fmtBytes(d.bytes)} · {d.uploadedBy} · {fmtCommentDate(d.uploadedAt)}
                </span>
              </div>
              {status !== "pending" && d.approvedBy && (
                <p className="mb-3 text-xs text-fg-muted">
                  {status === "approved" ? "Approved" : "Changes requested"} by {d.approvedBy} · {fmtCommentDate(d.approvedAt)}
                </p>
              )}

              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-base border border-border bg-white">
                {kind === "image" ? (
                  <img src={d.url} alt={d.name} className="max-h-[55vh] w-auto max-w-full object-contain" />
                ) : kind === "pdf" ? (
                  <iframe src={d.url} title={d.name} className="h-[55vh] w-full" />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-20 text-fg-muted">
                    <FileText className="h-10 w-10" />
                    <p className="text-sm">Preview isn't available for this file type — open or download it.</p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={d.url} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /> Open</Button>
                </a>
                <a href={d.url} download={d.name}>
                  <Button variant="secondary" size="sm"><Download className="h-4 w-4" /> Download</Button>
                </a>
                {canWrite && (
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant={status === "approved" ? "primary" : "outline"} size="sm"
                      onClick={() => onApprove(d.id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant={status === "rejected" ? "destructive" : "outline"} size="sm"
                      onClick={() => onApprove(d.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" /> Request changes
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex max-h-[85vh] flex-col border-t border-border p-5 md:border-l md:border-t-0">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-fg">
                <MessageSquare className="h-4 w-4" /> Comments
              </h4>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {sortedComments.length === 0 ? (
                  <p className="text-sm text-fg-muted">No comments yet.</p>
                ) : (
                  sortedComments.map((cm) => (
                    <div key={cm.id} className="rounded-base border border-border p-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <span className="font-medium text-fg">{cm.author}</span>
                        <span>· {fmtCommentDate(cm.at)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{cm.text}</p>
                    </div>
                  ))
                )}
              </div>
              {canWrite && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <Textarea
                    rows={2}
                    placeholder="Leave a comment for the team…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); } }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-fg-muted">⌘/Ctrl + Enter to post</p>
                    <Button size="sm" onClick={post} disabled={!text.trim()}>Post comment</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---- Mark complete ---------------------------------------------------------------------------
// Every path to "Complete" (the pill row in LaunchGate) opens this instead of setting the status
// directly, so a wrap-up note is captured in the SAME step a campaign closes — not a "go write
// it up later" that never happens. That note becomes the headline of its Past Campaigns entry.
function CompleteDialog({ open, onClose, onConfirm, campaignName }) {
  const [wrapup, setWrapup] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!open) return null;

  async function submit() {
    setBusy(true);
    setFailed(false);
    const ok = await onConfirm(wrapup);
    setBusy(false);
    if (ok) setWrapup(""); // onConfirm already closed the dialog on success
    else setFailed(true);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark “{campaignName}” complete</DialogTitle>
          <DialogDescription>
            Closes the campaign out and moves it into Past Campaigns. A quick wrap-up note now saves you having
            to reconstruct it later when you're planning the next one.
          </DialogDescription>
        </DialogHeader>

        <details className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium text-fg-muted">
            <BookOpen className="h-4 w-4" />
            Standing lessons worth checking before you close this out
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-fg-muted">
            {STANDING_LESSONS.map((lesson, i) => <li key={i}>{lesson}</li>)}
          </ul>
        </details>

        <div className="space-y-2">
          <Label htmlFor="wrapup-note">What worked, what you'd change next time (optional)</Label>
          <Textarea
            id="wrapup-note" rows={4} autoFocus disabled={busy}
            placeholder="e.g. Reply rate was strongest on the second send; next time cut the audience earlier and lead with the DTC offer."
            value={wrapup} onChange={(e) => setWrapup(e.target.value)}
          />
        </div>

        {failed && (
          <p className="text-sm text-warning">
            Couldn't save — check your connection (or that your passcode still has write access) and try again.
            Your note hasn't been lost.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={busy} onClick={() => { setWrapup(""); setFailed(false); }}>Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Marking complete…" : failed ? "Retry" : "Mark complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Checklist -----------------------------------------------------------------------------
function ChecklistPanel({ c, r, entry, canWrite, onToggle, onNote, onAdd, onRemove, onRestore }) {
  const groups = groupChecklist(c.checklist);
  const hiddenCount = (entry.hidden || []).length;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.name}>
          <p className="cs-eyebrow mb-2 text-fg-muted">{g.name}</p>
          <div className="divide-y divide-border rounded-base border border-border">
            {g.items.map((item) => (
              <ChecklistRow
                key={item.id} item={item} canWrite={canWrite}
                onToggle={() => onToggle(item)} onNote={(v) => onNote(item, v)} onRemove={() => onRemove(item)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AddItem onAdd={onAdd} disabled={!canWrite} />
        {hiddenCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onRestore} disabled={!canWrite}>
            Restore {hiddenCount} removed template task{hiddenCount === 1 ? "" : "s"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ChecklistRow({ item, canWrite, onToggle, onNote, onRemove }) {
  const [showNote, setShowNote] = useState(!!item.note);
  return (
    <div className="flex items-start gap-3 p-3">
      <Checkbox checked={item.done} onCheckedChange={onToggle} disabled={!canWrite} className="mt-0.5" id={`ck-${item.id}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`ck-${item.id}`} className={`cursor-pointer text-sm ${item.done ? "text-fg-muted line-through" : "text-fg"}`}>
            {item.label}
          </label>
          {item.required
            ? <Badge variant={item.done ? "muted" : "warning"}>Required</Badge>
            : <Badge variant="muted">Optional</Badge>}
          {item.custom && <Badge variant="outline">Added</Badge>}
        </div>
        {showNote ? (
          <Textarea
            className="mt-2 min-h-[2.25rem] text-sm"
            placeholder="note…"
            defaultValue={item.note}
            disabled={!canWrite}
            onChange={(e) => onNote(e.target.value)}
          />
        ) : (
          <button type="button" className="mt-1 text-xs text-fg-muted hover:text-fg" onClick={() => setShowNote(true)} disabled={!canWrite}>
            + note
          </button>
        )}
      </div>
      <button
        type="button" onClick={onRemove} disabled={!canWrite}
        title={item.custom ? "Delete this task" : "Remove this task from this campaign"}
        className="rounded p-1 text-fg-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddItem({ onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(true);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" /> Add task
      </Button>
    );
  }
  const submit = () => {
    const v = label.trim();
    if (!v) return;
    onAdd({ label: v, group: "Custom", required });
    setLabel(""); setOpen(false); setRequired(true);
  };
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        autoFocus className="min-w-[16rem] flex-1" placeholder="e.g. Virtual review with Maria Vittoria"
        value={label} onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
      />
      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <Checkbox checked={required} onCheckedChange={() => setRequired((v) => !v)} /> Required
      </label>
      <Button size="sm" onClick={submit} disabled={!label.trim()}>Add</Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}

// ---- Strategy ------------------------------------------------------------------------------
// Rick's call (2026-08-03): link out, don't paste. The brief lives in the client project folder
// and stays the single source of truth; the platform shows the positioning summary plus a
// copyable pointer. `url` renders as a real link when a campaign has a web-hosted brief.
function StrategyPanel({ strategy }) {
  if (!strategy) return <p className="text-sm text-fg-muted">No strategy doc linked yet.</p>;
  return (
    <div className="space-y-4">
      {strategy.summary && <p className="max-w-3xl text-sm leading-relaxed text-fg">{strategy.summary}</p>}
      <div className="space-y-2">
        {strategy.url && (
          <a href={strategy.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
            <ExternalLink className="h-4 w-4" /> Open the full brief
          </a>
        )}
        {strategy.path && <PathRef label="Brief" path={strategy.path} />}
        {strategy.runbookPath && <PathRef label="Runbook" path={strategy.runbookPath} />}
      </div>
    </div>
  );
}

function PathRef({ label, path }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — the path is still visible to read */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="cs-eyebrow text-fg-muted">{label}</span>
      <code className="rounded bg-bg px-2 py-1 font-mono text-[11px] text-fg-muted">{path}</code>
      <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-fg-muted hover:text-fg" title="Copy path">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ---- Content & approvals ---------------------------------------------------------------------
// Two shelves, deliberately separate:
//   · AUTHORED — email copy and call scripts written here, each carrying an approvalState. Text
//     belongs in the platform because the approved working copy has to be one click from the
//     campaign (and, for a script, from the call console) — not in a doc somebody has to find.
//   · LINKED — one-sheets, PDFs, packshots. Those stay in the Media Hub / project folder; this
//     shelf points at them. The platform is not a file store and shouldn't pretend to be.
// approvalState reuses the Media Hub's vocabulary rather than inventing a second one.
function ContentPanel({ linked, sequence, items, canWrite, onAdd, onPatch, onRemove }) {
  const [editing, setEditing] = useState(null); // entry key being edited, or "new"

  const save = (piece) => {
    if (piece.key) onPatch(piece.key, piece);
    else onAdd(piece);
    setEditing(null);
  };
  // Approval is the LIBRARY's vocabulary, not a second one: submitted -> posted / returned
  // (CONTENT_ORCHESTRATION_SPEC §3). "posted" is what a campaign may actually use.
  const setStatus = (item, status) =>
    onPatch(item.key, { status, ...(status === "posted" ? { reviewNote: "" } : {}) });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="cs-eyebrow text-fg-muted">Written for this campaign</p>
          {editing !== "new" && (
            <Button variant="outline" size="sm" onClick={() => setEditing("new")} disabled={!canWrite}>
              <Plus className="h-4 w-4" /> New piece
            </Button>
          )}
        </div>

        {editing === "new" && <ContentEditor onSave={save} onCancel={() => setEditing(null)} />}

        {items.length === 0 && editing !== "new" ? (
          <p className="text-sm text-fg-muted">
            Nothing written yet. Pieces you write here are catalogued in the <strong>Content Library</strong>,
            which owns approval — and a <em>Posted</em> call script becomes the working script on the call console.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              editing === it.key ? (
                <li key={it.key}><ContentEditor item={it} onSave={save} onCancel={() => setEditing(null)} /></li>
              ) : (
                <li key={it.key}>
                  <ContentRow
                    item={it} canWrite={canWrite}
                    onEdit={() => setEditing(it.key)} onRemove={() => onRemove(it.key)}
                    onStatus={(st) => setStatus(it, st)}
                  />
                </li>
              )
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <p className="mt-2 text-xs text-fg-muted">
            These live in the Content Library tagged to this campaign — one catalog, one approval trail.
          </p>
        )}
      </div>

      {(linked || []).length > 0 && (
        <div>
          <p className="cs-eyebrow mb-2 text-fg-muted">Linked assets</p>
          <ul className="divide-y divide-border rounded-base border border-border">
            {linked.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
                  <span className="truncate text-sm text-fg">{a.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.kind && <Badge variant="muted">{a.kind}</Badge>}
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-fg-muted hover:text-brand-primary" title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-fg-muted">
            Files (one-sheets, PDFs, packshots) live in the Media Hub — link them rather than uploading a second copy.
          </p>
        </div>
      )}

      {(sequence || []).length > 0 && (
        <div>
          <p className="cs-eyebrow mb-2 text-fg-muted">Nurture sequence</p>
          <ul className="divide-y divide-border rounded-base border border-border">
            {sequence.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="text-sm text-fg">{s.label}</span>
                <span className="text-xs text-fg-muted">Day {s.day} · {s.audience}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const STATUS_TONE_LIB = { submitted: "warning", posted: "success", returned: "error" };
const STATUS_LABEL_LIB = { submitted: "Submitted", posted: "Posted", returned: "Returned" };

function ContentRow({ item, canWrite, onEdit, onRemove, onStatus }) {
  const [open, setOpen] = useState(false);
  const status = entryStatus(item);
  return (
    <div className="rounded-base border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" />}
          <span className="truncate text-sm text-fg">{item.title}</span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="muted">{categoryLabel(entryCategory(item))}</Badge>
          <Badge variant={STATUS_TONE_LIB[status] || "muted"}>{STATUS_LABEL_LIB[status] || status}</Badge>
          <select
            className="rounded-base border border-border bg-surface px-2 py-1 text-xs text-fg disabled:opacity-40"
            value={status} disabled={!canWrite}
            onChange={(e) => onStatus(e.target.value)}
            aria-label={`Approval status for ${item.title}`}
          >
            <option value="submitted">Submitted</option>
            <option value="posted">Posted</option>
            <option value="returned">Returned</option>
          </select>
          <Button variant="ghost" size="sm" onClick={onEdit} disabled={!canWrite}>Edit</Button>
          <button
            type="button" onClick={onRemove} disabled={!canWrite} title="Delete this piece"
            className="rounded p-1 text-fg-muted transition-colors hover:text-error disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border p-3">
          {item.body
            ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-fg">{item.body}</pre>
            : <p className="text-sm text-fg-muted">No body — this piece is a link only.</p>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> {item.url}
            </a>
          )}
          {item.reviewNote && <p className="mt-2 text-xs text-warning">Returned: {item.reviewNote}</p>}
          {item.savedAt && <p className="mt-2 text-xs text-fg-muted">Saved {item.savedAt.slice(0, 10)}</p>}
        </div>
      )}
    </div>
  );
}

function ContentEditor({ item, onSave, onCancel }) {
  const [title, setTitle] = useState(item?.title || "");
  const [category, setCategory] = useState(item?.category || "email-campaign");
  const [url, setUrl] = useState(item?.url || "");
  const [body, setBody] = useState(item?.body || "");

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onSave({
      ...(item?.key ? { key: item.key } : {}),
      // kind "text" marks copy authored in the platform; the Library still stores metadata only.
      kind: body.trim() ? "text" : "link",
      category, title: t, url: url.trim(), body,
      status: item?.status || "submitted",
    });
  };

  return (
    <div className="space-y-3 rounded-base border border-brand-primary p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ct">Title</Label>
          <Input id="ct" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Enrichment call script" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ck">Category</Label>
          <select
            id="ck" value={category} onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-base border border-border bg-surface px-3 text-sm text-fg"
          >
            {CONTENT_CATEGORIES.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cu">Link (optional — a file in the Media Hub, or a doc)</Label>
        <Input id="cu" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cb">Body</Label>
        <Textarea id="cb" className="min-h-[14rem] font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste or write the copy / script here…" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={!title.trim()}>Save piece</Button>
      </div>
      <p className="text-xs text-fg-muted">
        New pieces are catalogued as <strong>Submitted</strong>. Move to <strong>Posted</strong> once signed off —
        a Posted call script becomes the working script on the call console.
      </p>
    </div>
  );
}

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

// ---- Target prospects ----------------------------------------------------------------------
// Reuses getCrmData() — the SAME read-only HubSpot line the CRM console uses (crm-hubspot.js).
// No second fetcher, per the handoff. For an enrichment campaign this panel is the working
// gap list: accounts with no email or no named buyer, which is exactly what blocks a send.
// Channel tier orders the calls; "proven customer" and company size aren't in the company read
// today, so they can't be sorted on yet — noted below rather than faked.
const CHANNEL_TIER = { distributor: 0, retail: 1, foodservice: 2 };
const tierOf = (co) => CHANNEL_TIER[CHANNEL_TO_AUDIENCE[co?.channel]] ?? 3;

function ProspectPanel({ c, resolved, scripts = [], enrichment = {}, onEnrich, canWrite, allCampaigns = [], saveState = "idle" }) {
  const [crm, setCrm] = useState(undefined);
  const [pick, setPick] = useState(null); // {level:'region'|'state'|'city', key, state?}
  // Which slice of the gap list to show. "remaining" is the working view, but a row DROPS OFF
  // it the moment it is resolved — so without this there is no way back to a captured row to
  // fix a typo before pushing it to the CRM of record (Rick, 2026-08-04: "I can't find those").
  const [listFilter, setListFilter] = useState("remaining");
  const [query, setQuery] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const isEnrichment = c.type === "enrichment";

  useEffect(() => {
    let alive = true;
    setCrm(undefined);
    getCrmData(resolved).then((d) => alive && setCrm(d || null)).catch(() => alive && setCrm(null));
    return () => { alive = false; };
  }, [resolved.id]);

  const companies = crm?.companies || [];
  // Scope comes from the campaign this one SERVES when it's an enrichment pass, else from its own
  // audience — so the call list is always "the gaps in this send's target list", never the whole
  // account book. A row leaves the list only once its record is actually cleared, so it stays put
  // through "left message" / "no answer" and disappears when the buyer and email are captured.
  const scope = scopeOf(c, allCampaigns);
  const seg = useMemo(
    () => segmentEnrichment(c, companies, enrichment, allCampaigns),
    [c, companies, enrichment, allCampaigns]
  );
  // Breakdown is computed over the whole segment (so the numbers describe the segment, not the
  // current filter), while `pick` narrows only the call list below it.
  const tree = useMemo(() => geoBreakdown(seg.segment, enrichment), [seg, enrichment]);
  const matchesPick = (co) => {
    if (!pick) return true;
    if (pick.level === "longisland") return isLongIsland(co);
    if (pick.level === "nycboroughs") return isNYCBorough(co);
    if (pick.level === "region") return regionOf(co) === pick.key;
    if (pick.level === "state") return (stateOf(co) || "—") === pick.key;
    // Must use the SAME normalization the breakdown buckets with, or clicking "Boston" would
    // miss every "boston (north end)" row that the count above it includes.
    return (cityKeyOf(co) || "—") === pick.key && (!pick.state || (stateOf(co) || "—") === pick.state);
  };
  // Every account this pass owns — including the ones already worked, so they stay reachable.
  const workedRows = useMemo(
    () => seg.segment.filter((co) => hasGap(co) && isResolved(enrichment[co.id])),
    [seg, enrichment]
  );
  // Split out of workedRows specifically (2026-09-21, Rick: "give me a remove button with a
  // explanation for contacts that are not prospects but a different industry contact") — these
  // were genuinely never prospects (wrong trade, not this industry, duplicate) rather than
  // actually-worked/cleared rows, so they get their own reviewable tab instead of being buried
  // inside "Worked" next to real captured contacts.
  const removedRows = useMemo(
    () => workedRows.filter((co) => enrichment[co.id]?.outcome === "not-a-prospect"),
    [workedRows, enrichment]
  );
  const gaps = useMemo(() => {
    const base = listFilter === "cleared" ? workedRows
      : listFilter === "removed" ? removedRows
        : listFilter === "all" ? [...seg.remaining, ...workedRows]
          : seg.remaining;
    // Search spans the fields you'd actually reach for mid-call: the shop, where it is, and
    // whoever has already been captured on it.
    const q = query.trim().toLowerCase();
    const hit = (co) => {
      if (!q) return true;
      const r = enrichment[co.id] || {};
      return [co.name, co.city, co.state, co.channel, co.domain, r.buyer, r.email, r.phone, co.phone, co.ownerPhone]
        .some((v) => String(v || "").toLowerCase().includes(q));
    };
    const list = base.filter(matchesPick).filter(hit);
    list.sort((a, b) => tierOf(a) - tierOf(b) || String(a.name).localeCompare(String(b.name)));
    return list;
  }, [seg, pick, listFilter, workedRows, removedRows, query, enrichment]);
  // Export list stays strict: only rows with real captured detail. A disqualified company is
  // resolved (off the call list) but has nothing to send to HubSpot.
  const clearedRows = useMemo(
    () => seg.segment.filter((co) => isCleared(enrichment[co.id])),
    [seg, enrichment]
  );
  const servesOther = scope.id !== c.id;
  const enrichmentFor = allCampaigns.find((x) => x.type === "enrichment" && x.serves === c.id);

  const pushRows = useMemo(
    () => clearedRows.map((co) => ({ ...enrichment[co.id], companyName: co.name, companyId: co.id })),
    [clearedRows, enrichment]
  );
  const summary = useMemo(() => callSummary(seg.segment, enrichment), [seg, enrichment]);

  function exportForHubspot() {
    downloadCsv(`${resolved.id}-enrichment-${new Date().toISOString().slice(0, 10)}.csv`, enrichmentCsv(pushRows));
  }

  return (
    <div className="space-y-5">
      {isEnrichment && <ScriptWindow scripts={scripts} />}

      {servesOther && (
        <div className="flex flex-wrap items-center gap-2 rounded-base border border-border bg-bg p-3 text-sm">
          <Link2 className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="text-fg-muted">Working the target list of</span>
          <span className="font-medium text-fg">{scope.name}</span>
          <span className="text-fg-muted">— this pass exists to unblock that send.</span>
        </div>
      )}

      {/* Live segment numbers, not the headline from a spreadsheet — this is what the send can
          actually reach today, and what still stands between it and going out. */}
      {crm !== undefined && companies.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Figure label="In segment" value={seg.total.toLocaleString()} />
          <Figure label="Reachable now" value={seg.sendable.toLocaleString()} />
          <Figure label="Need a call" value={seg.remaining.length.toLocaleString()} />
          <Figure
            label={isEnrichment ? "Cleared this pass" : (c.capTarget ? `Cap (${c.capTarget})` : "Cleared")}
            value={clearedRows.length.toLocaleString() + (seg.disqualified ? ` · ${seg.disqualified} n/a` : "")}
          />
        </div>
      ) : scope.audience ? (
        // Fallback while the CRM read is unavailable: the audience's own stated figures. Read
        // from `scope`, not `c`, so an enrichment pass shows the list it actually works rather
        // than mixing its own headline count with the served campaign's source file.
        <div className="grid gap-4 sm:grid-cols-3">
          <Figure label="List size" value={(scope.audience.size ?? 0).toLocaleString()} />
          <Figure label="With email" value={(scope.audience.emails ?? scope.audience.size)?.toLocaleString() ?? "—"} />
          <Figure label="Cap / target" value={scope.capTarget ? scope.capTarget.toLocaleString() : "—"} />
        </div>
      ) : (
        <p className="text-sm text-fg-muted">No audience defined for this campaign yet.</p>
      )}

      {scope.audience?.source && (
        <p className="text-xs text-fg-muted">
          Source: <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px]">{scope.audience.source}</code>
          {scope.audience.note && <> · {scope.audience.note}</>}
        </p>
      )}

      {/* An approximated segment must say so — a filter that tracks the CRM is not the same thing
          as a hand-qualified list, and quietly conflating them would misreport the gate. */}
      {scope.audience?.filter && scope.audience?.exact === false && (
        <p className="flex items-start gap-1.5 rounded-base border border-warning/40 bg-warning/5 p-2.5 text-xs text-fg-muted">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            Segment is a <strong>filter</strong>, not the qualified list — {[
              scope.audience.filter.regions?.length && `${scope.audience.filter.regions.join(" / ")}`,
              scope.audience.filter.states?.length && `${scope.audience.filter.states.join(" / ")}`,
              scope.audience.filter.channels?.length && `${scope.audience.filter.channels.length} channels`,
            ].filter(Boolean).join(" · ")}. It tracks the CRM as it changes.{" "}
            {scope.audience.source ? (
              <>
                Import the HubSpot IDs from{" "}
                <code className="rounded bg-bg px-1 py-0.5 font-mono">{scope.audience.source}</code> into{" "}
                <code className="rounded bg-bg px-1 py-0.5 font-mono">companyIds</code> to make the scope exact.
              </>
            ) : (
              <>This campaign has no fixed source list — it's meant to stay a live filter, not become exact.</>
            )}
          </span>
        </p>
      )}

      <div className="rounded-base border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-fg">
            {isEnrichment ? "Accounts missing an email or a named buyer" : "Segment coverage"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {crm === undefined
              ? <span className="text-xs text-fg-muted">Loading accounts…</span>
              : <span className="text-xs text-fg-muted">{seg.total.toLocaleString()} in segment · {companies.length.toLocaleString()} in the CRM</span>}
            {isEnrichment && summary.called > 0 && (
              <Button variant="outline" size="sm" onClick={() => setSummaryOpen(true)}>
                <ClipboardList className="h-4 w-4" /> Session summary
              </Button>
            )}
            {isEnrichment && clearedRows.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportForHubspot}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
                <Button variant="primary" size="sm" onClick={() => setPushOpen(true)}>
                  <UploadCloud className="h-4 w-4" /> Push {clearedRows.length} to HubSpot
                </Button>
              </>
            )}
          </div>
        </div>

        {crm !== undefined && seg.total > 0 && (
          <div className="mt-3">
            <GeoBreakdown tree={tree} pick={pick} onPick={setPick} />
          </div>
        )}

        {crm === undefined ? null : companies.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">No accounts returned — the CRM console will show why.</p>
        ) : isEnrichment ? (
          gaps.length === 0 && listFilter === "remaining" && workedRows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No gaps left" description="Every account on this list now has an email and a named buyer." />
          ) : (
            <>
              <div className="mt-3">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search shop, city, state, buyer, email or phone…"
                  aria-label="Search accounts"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[
                  ["remaining", `To call (${seg.remaining.length})`],
                  ["cleared", `Worked (${workedRows.length})`],
                  ["removed", `Removed (${removedRows.length})`],
                  ["all", `All (${seg.remaining.length + workedRows.length})`],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setListFilter(id)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      listFilter === id
                        ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                        : "border-border text-fg-muted hover:border-brand-primary hover:text-fg",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                {gaps.length.toLocaleString()} shown{query ? <> matching “{query}”</> : null}{pick ? <> in <strong>{pick.level === "longisland" ? "Long Island" : pick.level === "nycboroughs" ? "New York City" : pick.key}</strong></> : null}, ordered by channel tier.
                {listFilter === "remaining"
                  ? " A row moves to Worked once the outcome is Reached and both the buyer and email are filled in."
                  : listFilter === "removed"
                    ? " Marked Not a prospect, with the reason captured on each row — use Restore to send one back to the call list."
                    : " Open any row to correct what was captured before it goes to HubSpot."}
              </p>
              <ul className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                {gaps.slice(0, 200).map((co) => (
                  <CallRow
                    key={co.id} co={co} rec={enrichment[co.id] || {}} canWrite={canWrite} saveState={saveState}
                    resolved={resolved}
                    onPatch={(part) => onEnrich(co.id, { campaignId: c.id, ...part })}
                  />
                ))}
              </ul>
              {gaps.length > 200 && (
                <p className="mt-2 text-xs text-fg-muted">Showing the first 200 of {gaps.length.toLocaleString()}.</p>
              )}
            </>
          )
        ) : gaps.length === 0 ? (
          <p className="mt-2 text-xs text-fg-muted">
            All {seg.total.toLocaleString()} accounts in this segment have an email and a named buyer — nothing blocking the send.
          </p>
        ) : (
          // The send's own view of the gap: the number, and where the work happens. The calls
          // themselves belong to the enrichment campaign, not duplicated here.
          <div className="mt-2 space-y-2">
            <p className="text-sm text-fg">
              <strong>{gaps.length.toLocaleString()}</strong> of {seg.total.toLocaleString()} targets can't receive this send yet —
              missing an email or a named buyer.
            </p>
            {enrichmentFor
              ? <p className="text-xs text-fg-muted">Worked in <strong>{enrichmentFor.name}</strong>, which is scoped to this campaign's list.</p>
              : <p className="text-xs text-fg-muted">No enrichment pass is scoped to this campaign yet — create one and set <code className="rounded bg-bg px-1 py-0.5 font-mono">serves</code> to this campaign.</p>}
          </div>
        )}

        {isEnrichment && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-fg-muted">
            Captured here first, then pushed to HubSpot — use <strong>Push to HubSpot</strong> above. It dry-runs
            by default, showing you create-vs-update and the matched contact for every row before anything is
            written. Only cleared rows with both an email and a buyer name are eligible. The CSV export is still
            there as a fallback if you'd rather eyeball a batch in a spreadsheet first.
          </p>
        )}
      </div>

      <SummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} s={summary} campaign={scope} />
      <PushDialog open={pushOpen} onClose={() => setPushOpen(false)} rows={pushRows} resolved={resolved} />

      {(c.dependsOn || []).length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Link2 className="h-3.5 w-3.5" /> Depends on: {c.dependsOn.join(", ")}
        </p>
      )}
    </div>
  );
}

// The approved working script, pinned above the call list (Rick, 2026-08-03). Shows ONLY approved
// pieces — a draft script is not something to read down the phone, so if nothing is approved this
// says so and points at where to approve it rather than silently showing the draft.
function ScriptWindow({ scripts }) {
  // Only POSTED scripts — the Library's own approval vocabulary. A submitted-but-unreviewed
  // script is not something to read down the phone.
  const isScript = (s) => entryCategory(s) === "call-script";
  const approved = scripts.filter((s) => isScript(s) && entryStatus(s) === "posted" && s.body);
  const drafts = scripts.filter((s) => isScript(s) && entryStatus(s) !== "posted");
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(true);

  if (approved.length === 0) {
    return (
      <div className="rounded-base border border-warning/40 bg-warning/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-fg">No posted call script yet</p>
            <p className="mt-1 text-sm text-fg-muted">
              {drafts.length > 0
                ? <>There {drafts.length === 1 ? "is" : "are"} {drafts.length} unposted script{drafts.length === 1 ? "" : "s"} in <strong>Content &amp; approvals</strong> above. Move one to <strong>Posted</strong> and it appears here as the working script.</>
                : <>Write one in <strong>Content &amp; approvals</strong> above (category <em>Call scripts</em>) and move it to <strong>Posted</strong> — it will appear here, pinned above the call list.</>}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const s = approved[Math.min(idx, approved.length - 1)];
  return (
    <div className="rounded-base border border-success/50 bg-success/5">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" />}
          <ScrollText className="h-4 w-4 shrink-0 text-success" />
          <span className="truncate text-sm font-medium text-fg">{s.title}</span>
          <Badge variant="success">Posted</Badge>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {approved.length > 1 && (
            <select
              className="rounded-base border border-border bg-surface px-2 py-1 text-xs text-fg"
              value={idx} onChange={(e) => setIdx(Number(e.target.value))} aria-label="Choose script"
            >
              {approved.map((a, i) => <option key={a.key} value={i}>{a.title}</option>)}
            </select>
          )}
          <CopyButton text={s.body} label="Copy script" />
        </div>
      </div>
      {open && (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-success/30 p-3 font-mono text-xs leading-relaxed text-fg">
          {s.body}
        </pre>
      )}
    </div>
  );
}

// One account on the gap list: what's missing, the number IN PLAIN TEXT so it can be dialled by
// any method (Rick, 2026-08-03 — "phone number visible in line so I can choose a different
// calling method"), and the capture fields for what the call produced.
// The explanation captured when a row is Removed lives in the existing call-note field (see
// confirmRemove() below) so nothing invents a second place to store text — this just reads the
// last "Removed — …" line back out for display without requiring the row to be expanded.
function removalReasonOf(rec) {
  if (!rec?.note) return "";
  const lines = String(rec.note).split("\n").map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || "";
  const m = last.match(/^Removed — (.*)$/);
  return m ? m[1] : last;
}

function CallRow({ co, rec, canWrite, onPatch, saveState, resolved }) {
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  // Remove — a dedicated, one-click path to "not-a-prospect" for a company that was never a real
  // prospect (wrong industry, wrong trade, duplicate), distinct from the Call outcome dropdown
  // further down (Rick, 2026-09-21: "give me a remove button with a explanation for contacts
  // that are not prospects but a different industry contact"). Reuses the existing
  // not-a-prospect outcome/isResolved machinery — the row drops out of "To call" into its own
  // "Removed" tab in ProspectPanel — instead of inventing a parallel hide flag.
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState("");
  const phone = rec.phone || co.ownerPhone || co.phone || "";
  const outcome = rec.outcome || "not-called";
  const touched = outcome !== "not-called" || rec.buyer || rec.email || rec.note;
  const isRemoved = outcome === "not-a-prospect";

  function confirmRemove() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    // Appended, not overwritten — a rep may already have call notes on this row, and the
    // explanation should never silently erase them.
    const addition = `Removed — ${trimmed}`;
    const nextNote = rec.note ? `${rec.note}\n\n${addition}` : addition;
    onPatch({ outcome: "not-a-prospect", note: nextNote, calledAt: new Date().toISOString() });
    setRemoving(false);
    setReason("");
  }
  function restoreProspect() {
    onPatch({ outcome: "not-called" });
  }

  // Address verification (docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md) — verifies whatever's
  // currently in the fields (a rep's correction), falling back to HubSpot's own address/city/
  // state/zip when a field is still blank, so clicking Verify with nothing typed yet still
  // checks what's on file.
  async function handleVerify() {
    setVerifying(true);
    setVerifyError("");
    const res = await verifyAddress(resolved, {
      street: rec.street || co.address || "",
      city: rec.city || co.city || "",
      state: rec.state || stateOf(co) || "",
      zip: rec.zip || co.zip || "",
    });
    setVerifying(false);
    if (!res.ok) {
      setVerifyError(res.error === "not-configured" ? "Address lookup isn't set up yet — ask Rick." : "Couldn't verify that address — try again.");
      return;
    }
    onPatch({
      street: res.formatted.street, city: res.formatted.city, state: res.formatted.state, zip: res.formatted.zip,
      addressVerdict: res.verdict, addressVerifiedAt: new Date().toISOString(),
    });
  }
  const ADDRESS_VERDICT_BADGE = {
    confirmed: { variant: "success", label: "Address confirmed" },
    corrected: { variant: "warning", label: "Address corrected — review" },
    unconfirmed: { variant: "error", label: "Address unconfirmed" },
  };
  const addressBadge = ADDRESS_VERDICT_BADGE[rec.addressVerdict];

  return (
    <li className="rounded-base border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" />}
          <span className="min-w-0">
            <span className="block truncate text-sm text-fg">{co.name}</span>
            <span className="block text-xs text-fg-muted">
              {[co.channel, [co.city, co.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
            </span>
            {isRemoved && removalReasonOf(rec) && (
              <span className="block truncate text-xs italic text-fg-muted">Removed — {removalReasonOf(rec)}</span>
            )}
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!co.owner && !rec.buyer && <Badge variant="warning">No buyer</Badge>}
          {!co.ownerEmail && !rec.email && <Badge variant="muted">No email</Badge>}
          {addressBadge && <Badge variant={addressBadge.variant}>{addressBadge.label}</Badge>}
          {touched && <Badge variant={OUTCOME_TONE[outcome] || "muted"}>{OUTCOME_LABEL[outcome]}</Badge>}
          <PhoneInline phone={phone} />
          <EmailInline resolved={resolved} to={rec.email || co.ownerEmail} subject={`Monti Trentini — ${co.name}`} />
          {canWrite && (isRemoved ? (
            <Button type="button" variant="outline" size="sm" onClick={restoreProspect} title="Send this back to the call list">
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </Button>
          ) : (
            <Button
              type="button" variant="outline" size="sm" onClick={() => setRemoving((v) => !v)}
              title="Not actually a prospect — different industry, wrong trade, duplicate, etc."
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          ))}
        </div>
      </div>

      {removing && (
        <div className="space-y-2 border-t border-border bg-bg p-3">
          <Label htmlFor={`rm-${co.id}`}>Why isn't this a prospect?</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`rm-${co.id}`} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. different industry, not a food distributor, duplicate record"
              className="max-w-md" autoFocus
            />
            <Button type="button" variant="destructive" size="sm" disabled={!reason.trim()} onClick={confirmRemove}>
              Confirm remove
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setRemoving(false); setReason(""); }}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-fg-muted">
            Moves this to the Removed tab and marks the outcome "Not a prospect" — it stays on record, just off
            the active call list, and Restore brings it back anytime.
          </p>
        </div>
      )}

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Buyer name" value={rec.buyer} placeholder={co.owner || "who buys the cheese"} disabled={!canWrite} onChange={(v) => onPatch({ buyer: v })} />
            <Field label="Title" value={rec.title} placeholder="e.g. Cheese buyer" disabled={!canWrite} onChange={(v) => onPatch({ title: v })} />
            <Field label="Email" type="email" value={rec.email} placeholder={co.ownerEmail || "direct email"} disabled={!canWrite} onChange={(v) => onPatch({ email: v })} />
            <Field label="Phone (correct it here)" value={rec.phone} placeholder={co.ownerPhone || co.phone || "number"} disabled={!canWrite} onChange={(v) => onPatch({ phone: v })} />
            <Field label="Instagram" value={rec.instagram} placeholder="@handle" disabled={!canWrite} onChange={(v) => onPatch({ instagram: v })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_5rem_7rem_auto]">
            <Field label="Street address" value={rec.street} placeholder={co.address || "street address"} disabled={!canWrite} onChange={(v) => onPatch({ street: v })} />
            <Field label="City / town" value={rec.city} placeholder={co.city || "city"} disabled={!canWrite} onChange={(v) => onPatch({ city: v })} />
            <Field label="State" value={rec.state} placeholder={stateOf(co) || "ST"} disabled={!canWrite} onChange={(v) => onPatch({ state: v })} />
            <Field label="Zip" value={rec.zip} placeholder={co.zip || "zip"} disabled={!canWrite} onChange={(v) => onPatch({ zip: v })} />
            <div className="flex items-end">
              <Button type="button" variant="outline" size="sm" disabled={!canWrite || verifying} onClick={handleVerify} className="w-full">
                <MapPin className="h-4 w-4" /> {verifying ? "Verifying…" : "Verify address"}
              </Button>
            </div>
          </div>
          {verifyError && <p className="text-xs text-error">{verifyError}</p>}
          {rec.addressVerifiedAt && !verifyError && (
            <p className="text-xs text-fg-muted">Address last verified {rec.addressVerifiedAt.slice(0, 16).replace("T", " ")}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            <div className="grid gap-1.5">
              <Label htmlFor={`o-${co.id}`}>Call outcome</Label>
              <select
                id={`o-${co.id}`} value={outcome} disabled={!canWrite}
                onChange={(e) => onPatch({ outcome: e.target.value })}
                className="h-10 rounded-base border border-border bg-surface px-3 text-sm text-fg disabled:opacity-40"
              >
                {CALL_OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`n-${co.id}`}>Call notes</Label>
              <Textarea
                id={`n-${co.id}`} className="min-h-[2.5rem] text-sm" placeholder="What they said, distributor, best time to call back…"
                defaultValue={rec.note || ""} disabled={!canWrite} onChange={(e) => onPatch({ note: e.target.value })}
              />
              {/* Earlier calls to this same buyer. Before 2026-09-25 a second call silently
                  overwrote the first; the history is kept server-side now, so show it here where
                  the next call is about to be made. */}
              {notesOf(rec).length > 1 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-fg-muted">
                    Earlier notes ({notesOf(rec).length - 1})
                  </summary>
                  <div className="mt-2">
                    <NoteLog entry={{ ...rec, notes: (rec.notes || []).slice(0, -1) }} max={5} />
                  </div>
                </details>
              )}
            </div>
          </div>
          {outcome === "not-a-prospect" && (
            <p className="text-xs text-fg-muted">
              Disqualified — this row leaves the outstanding list but is not exported to HubSpot.
            </p>
          )}
          {outcome === "cleared" && (!rec.buyer || !rec.email) && (
            <p className="text-xs text-warning">
              Marked reached, but the buyer name and email are what close the gap — fill both in and this row clears.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {rec.calledAt
              ? <p className="text-xs text-fg-muted">Last updated {rec.calledAt.slice(0, 16).replace("T", " ")}</p>
              : <span />}
            {/* Save status AT THE ROW. It already shows in the tab header, but mid-call you are
                looking at the fields, not the top of the page (Rick asked twice for a save
                button; the answer is autosave with a status you can actually see). */}
            <RowSaveStatus state={saveState} />
          </div>
        </div>
      )}
    </li>
  );
}

// The number as SELECTABLE TEXT plus a copy button and a tel: link — so it can go into a desk
// phone, a softphone, or a mobile, rather than forcing whatever the OS has registered for tel:.
function PhoneInline({ phone }) {
  if (!phone) return <span className="text-xs text-fg-muted">no number</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="select-all rounded bg-bg px-2 py-1 font-mono text-xs text-fg">{phone}</code>
      <CopyButton text={phone} label="Copy number" />
      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} title="Dial with your default handler" className="text-fg-muted hover:text-brand-primary">
        <PhoneCall className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button" title={label} aria-label={label}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text || ""); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
      }}
      className="text-fg-muted transition-colors hover:text-fg"
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Field({ label, value, placeholder, type = "text", disabled, onChange }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type={type} defaultValue={value || ""} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// Region → state → city coverage. Region is what the campaign scopes to; state and city are how
// the calling gets divided up. Clicking any row narrows the call list to it, so a rep can take a
// state (or a single city) and work it without scrolling past everyone else's.
function GeoBreakdown({ tree, pick, onPick }) {
  const [open, setOpen] = useState(() => new Set(tree.slice(0, 1).map((r) => r.key)));
  const toggle = (key) => setOpen((s) => {
    const n = new Set(s);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });
  if (!tree.length) return null;

  return (
    <div className="rounded-base border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <p className="text-sm font-medium text-fg">Coverage by region · state · city</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-muted">accounts · reachable · need a call</span>
          {pick && (
            <Button variant="ghost" size="sm" onClick={() => onPick(null)}>
              <X className="h-3.5 w-3.5" /> Clear filter
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {tree.map((region) => {
          const isOpen = open.has(region.key);
          return (
            <div key={region.key} className="border-b border-border last:border-0">
              <div className="flex items-center gap-1">
                <button
                  type="button" onClick={() => toggle(region.key)}
                  className="p-2 text-fg-muted hover:text-fg" aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <GeoRow node={region} level="region" pick={pick} onPick={onPick} />
              </div>

              {isOpen && region.children.map((state) => (
                <div key={state.key} className="ml-6 border-t border-border/60">
                  <div className="flex items-center gap-1">
                    <button
                      type="button" onClick={() => toggle(`${region.key}/${state.key}`)}
                      className="p-2 text-fg-muted hover:text-fg" aria-label="Expand cities"
                    >
                      {open.has(`${region.key}/${state.key}`) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                    <GeoRow node={state} level="state" pick={pick} onPick={onPick} />
                  </div>
                  {open.has(`${region.key}/${state.key}`) && (
                    <div className="ml-6 border-t border-border/40">
                      {state.children.map((child) =>
                        child.sub ? (
                          // A named sub-region (Long Island / NYC boroughs, see geoBreakdown()) —
                          // one more expandable level between the state and its cities.
                          <div key={child.key} className="border-t border-border/40 first:border-t-0">
                            <div className="flex items-center gap-1 pl-2">
                              <button
                                type="button" onClick={() => toggle(`${region.key}/${state.key}/${child.key}`)}
                                className="p-2 text-fg-muted hover:text-fg" aria-label="Expand"
                              >
                                {open.has(`${region.key}/${state.key}/${child.key}`) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                              <GeoRow node={child} level={child.pickLevel} pick={pick} onPick={onPick} />
                            </div>
                            {open.has(`${region.key}/${state.key}/${child.key}`) && (
                              <div className="ml-6 border-t border-border/40">
                                {child.children.map((city) => (
                                  <div key={city.key} className="flex items-center gap-1 pl-2">
                                    <GeoRow node={city} level="city" parentState={state.key} pick={pick} onPick={onPick} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div key={child.key} className="flex items-center gap-1 pl-2">
                            <GeoRow node={child} level="city" parentState={state.key} pick={pick} onPick={onPick} />
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GeoRow({ node, level, parentState, pick, onPick }) {
  const selected = pick && pick.level === level && pick.key === node.key && (level !== "city" || pick.state === parentState);
  return (
    <button
      type="button"
      onClick={() => onPick(selected ? null : { level, key: node.key, state: parentState })}
      className={[
        "flex flex-1 items-center justify-between gap-3 rounded-base px-2 py-1.5 text-left transition-colors",
        selected ? "bg-brand-primary/10 ring-1 ring-brand-primary" : "hover:bg-bg",
      ].join(" ")}
    >
      <span className={level === "region" ? "text-sm font-medium text-fg" : level === "state" || level === "longisland" || level === "nycboroughs" ? "text-sm text-fg" : "text-xs text-fg-muted"}>
        {node.label}
        {node.variants?.length > 0 && (
          <span className="ml-1.5 text-[11px] text-fg-muted" title={`Includes ${node.variants.join(", ")}`}>
            +{node.variants.length} area{node.variants.length === 1 ? "" : "s"}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2 tabular-nums">
        <span className="text-xs text-fg-muted">{node.total.toLocaleString()}</span>
        <span className="text-xs text-success">{node.sendable.toLocaleString()}</span>
        {node.gaps > 0
          ? <Badge variant="warning">{node.gaps.toLocaleString()}</Badge>
          : <Badge variant="muted">0</Badge>}
      </span>
    </button>
  );
}

function Figure({ label, value }) {
  return (
    <div className="rounded-base border border-border p-3">
      <p className="cs-display text-2xl text-fg">{value}</p>
      <p className="cs-eyebrow mt-1 text-fg-muted">{label}</p>
    </div>
  );
}

// ---- Results -------------------------------------------------------------------------------
// Counters mirror the outreach funnel already defined in crm.js (replies → meetings → won) so
// the two surfaces agree, plus the send-side numbers an ESP reports and, for a gated offer,
// qualifying submissions against the cap.
const RESULT_FIELDS = [
  { key: "sends", label: "Sends" },
  { key: "opens", label: "Opens" },
  { key: "clicks", label: "Clicks" },
  { key: "submissions", label: "Form submissions" },
  { key: "replies", label: "Replies" },
  { key: "meetings", label: "Meetings" },
  { key: "won", label: "Won" },
];

function ResultsPanel({ c, onChange, canWrite }) {
  const res = c.results || {};
  const launched = c.status === "launched" || c.status === "complete";
  const openRate = pct(res.opens || 0, res.sends || 0);
  const replyRate = pct(res.replies || 0, res.sends || 0);

  if (!launched) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Not launched yet"
        description="Once this campaign is marked launched, record opens, replies, meetings and wins here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {RESULT_FIELDS.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={`res-${f.key}`}>{f.label}</Label>
            <Input
              id={`res-${f.key}`} type="number" min="0" inputMode="numeric"
              value={res[f.key] ?? ""} placeholder="0" disabled={!canWrite}
              onChange={(e) => onChange({ [f.key]: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Figure label="Open rate" value={`${openRate}%`} />
        <Figure label="Reply rate" value={`${replyRate}%`} />
        <Figure
          label={c.capTarget ? `Cap (${c.capTarget})` : "Meetings"}
          value={c.capTarget ? `${(res.submissions || 0).toLocaleString()} / ${c.capTarget}` : (res.meetings || 0).toLocaleString()}
        />
      </div>

      {c.capTarget ? (
        <div>
          <ProgressBar done={Math.min(res.submissions || 0, c.capTarget)} total={c.capTarget} tone={(res.submissions || 0) >= c.capTarget ? "success" : "brand"} />
          <p className="mt-1.5 text-xs text-fg-muted">
            {(res.submissions || 0) >= c.capTarget
              ? "Cap reached — swap in the waitlist copy for anyone still incoming."
              : `${c.capTarget - (res.submissions || 0)} qualifying submissions until the cap closes the list.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "task";

/** Compact save status shown on the row being edited. Same states as the tab-header chip. */
function RowSaveStatus({ state }) {
  const map = {
    dirty:  ["Saving…", "text-fg-muted"],
    saving: ["Saving…", "text-fg-muted"],
    saved:  ["Saved ✓", "text-success"],
    denied: ["Not saved — admin passcode required", "text-warning font-medium"],
    failed: ["Not saved — retry an edit", "text-warning font-medium"],
    "load-failed": ["Couldn't load saved progress — refresh before editing", "text-warning font-medium"],
  };
  const hit = map[state];
  if (!hit) return <span className="text-xs text-fg-muted">Auto-saves</span>;
  return <span className={`text-xs ${hit[1]}`} role="status" aria-live="polite">{hit[0]}</span>;
}

// ---- Session summary -------------------------------------------------------------------------
// What a phone pass actually produced. Counts every TOUCHED row, not just cleared ones —
// "left 12 messages" is progress, and a summary that only counted wins would misreport a session.
function SummaryDialog({ open, onClose, s, campaign }) {
  if (!open) return null;
  const pct = s.gapTotal ? Math.round((s.gapClosed / s.gapTotal) * 100) : 0;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Session summary</DialogTitle>
          <DialogDescription>{campaign?.name} · progress against the contact gap this pass exists to close.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Figure label="Called" value={s.called.toLocaleString()} />
            <Figure label="Details captured" value={s.cleared.toLocaleString()} />
            <Figure label="Disqualified" value={s.disqualified.toLocaleString()} />
            <Figure label="Still to call" value={s.remaining.toLocaleString()} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-fg-muted">
              <span>Gap closed</span>
              <span>{s.gapClosed} of {s.gapTotal} · {pct}%</span>
            </div>
            <ProgressBar done={s.gapClosed} total={s.gapTotal} tone={pct === 100 ? "success" : "brand"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-base border border-border p-3">
              <p className="cs-eyebrow mb-2 text-fg-muted">Outcomes</p>
              <ul className="space-y-1">
                {Object.entries(s.byOutcome).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span className="text-fg">{OUTCOME_LABEL[k] || k}</span>
                    <span className="tabular-nums text-fg-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-base border border-border p-3">
              <p className="cs-eyebrow mb-2 text-fg-muted">Captured</p>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between"><span className="text-fg">Emails</span><span className="tabular-nums text-fg-muted">{s.emailsCaptured}</span></li>
                <li className="flex justify-between"><span className="text-fg">Instagram handles</span><span className="tabular-nums text-fg-muted">{s.instagramCaptured}</span></li>
                <li className="flex justify-between"><span className="text-fg">Notes written</span><span className="tabular-nums text-fg-muted">{s.notes.length}</span></li>
              </ul>
            </div>
          </div>

          {s.notes.length > 0 && (
            <div>
              <p className="cs-eyebrow mb-2 text-fg-muted">Call notes</p>
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-base border border-border">
                {s.notes.map((n, i) => (
                  <li key={i} className="p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-fg">{n.company}</span>
                      {n.outcome && <Badge variant={OUTCOME_TONE[n.outcome] || "muted"}>{OUTCOME_LABEL[n.outcome]}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{n.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Push to HubSpot -------------------------------------------------------------------------
// PREVIEW FIRST, ALWAYS. This is the only write path to the CRM of record in the whole app, so
// it opens on a dry run: the server resolves create-vs-update per row and writes nothing until
// the second, explicit click. A bad row that reaches HubSpot gets cleaned up by hand.
function PushDialog({ open, onClose, rows, resolved }) {
  const [phase, setPhase] = useState("idle"); // idle | previewing | preview | pushing | done | error
  const [plan, setPlan] = useState([]);
  const [done, setDone] = useState([]);
  const [err, setErr] = useState("");
  // Rows written BEFORE an error. The push is sequential, so a mid-run failure can leave records
  // already created — reporting "nothing was pushed" then would be a lie about the CRM of record.
  const [partial, setPartial] = useState([]);
  const [scopes, setScopes] = useState([]);

  useEffect(() => {
    if (!open) { setPhase("idle"); setPlan([]); setDone([]); setErr(""); setPartial([]); setScopes([]); return; }
    let alive = true;
    setPhase("previewing");
    pushToHubspot(resolved, rows, { commit: false }).then((r) => {
      if (!alive) return;
      if (!r.ok) { setErr(r.hint ? `${r.error} — ${r.hint}` : (r.error || `Failed (${r.status})`)); setPartial(r.results || []); setScopes(r.requiredScopes || []); setPhase("error"); return; }
      setPlan(r.planned || []); setPhase("preview");
    });
    return () => { alive = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function commit() {
    setPhase("pushing");
    const r = await pushToHubspot(resolved, rows, { commit: true });
    if (!r.ok) { setErr(r.hint ? `${r.error} — ${r.hint}` : (r.error || `Failed (${r.status})`)); setPartial(r.results || []); setScopes(r.requiredScopes || []); setPhase("error"); return; }
    setDone(r.results || []); setPhase("done");
  }

  const creates = plan.filter((p) => p.action === "create").length;
  const updates = plan.filter((p) => p.action === "update").length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Push to HubSpot</DialogTitle>
          <DialogDescription>
            HubSpot is the CRM of record. Nothing is written until you confirm below.
          </DialogDescription>
        </DialogHeader>

        {phase === "previewing" && <p className="text-sm text-fg-muted">Checking each contact against HubSpot…</p>}

        {phase === "error" && (
          <div className="rounded-base border border-error/50 bg-error/5 p-3">
            <p className="text-sm font-medium text-fg">
              {partial.length > 0
                ? `Stopped after ${partial.length} record${partial.length === 1 ? "" : "s"} — the rest were not written`
                : "Nothing was pushed"}
            </p>
            <p className="mt-1 text-sm text-fg-muted">{err}</p>
            {scopes.length > 0 && (
              <p className="mt-2 text-xs text-fg-muted">
                Scopes HubSpot asked for:{" "}
                {scopes.map((sc) => (
                  <code key={sc} className="mr-1 rounded bg-bg px-1.5 py-0.5 font-mono text-[11px]">{sc}</code>
                ))}
              </p>
            )}
            {partial.length > 0 && (
              <>
                <p className="mt-2 text-xs font-medium text-fg">Already in HubSpot — do not re-push these:</p>
                <ul className="mt-1 space-y-0.5">
                  {partial.map((d, i) => (
                    <li key={i} className="text-xs text-fg-muted">{d.email} · {d.action}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {phase === "preview" && (
          <div className="space-y-3">
            <p className="text-sm text-fg">
              <strong>{creates}</strong> new contact{creates === 1 ? "" : "s"} · <strong>{updates}</strong> existing
              contact{updates === 1 ? "" : "s"} updated. Call notes attach to the contact; each is associated to its company.
            </p>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-base border border-border">
              {plan.map((p, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{p.buyer} · <span className="text-fg-muted">{p.email}</span></p>
                    <p className="text-xs text-fg-muted">{p.companyName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.noteWillBeWritten && <Badge variant="muted">+ note</Badge>}
                    <Badge variant={p.action === "create" ? "success" : "info"}>{p.action}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === "pushing" && <p className="text-sm text-fg-muted">Writing to HubSpot — one row at a time to stay inside the rate limit…</p>}

        {phase === "done" && (
          <div className="rounded-base border border-success/50 bg-success/5 p-3">
            <p className="text-sm font-medium text-fg">{done.length} contact{done.length === 1 ? "" : "s"} written to HubSpot</p>
            <p className="mt-1 text-xs text-fg-muted">
              {done.filter((d) => d.action === "create").length} created · {done.filter((d) => d.action === "update").length} updated
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">{phase === "done" ? "Close" : "Cancel"}</Button></DialogClose>
          {phase === "preview" && (
            <Button variant="primary" onClick={commit}>Write {plan.length} to HubSpot</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
