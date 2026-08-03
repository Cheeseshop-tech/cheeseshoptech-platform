import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ListChecks, BookOpen, FileText, Users, BarChart3, Plus, X, AlertTriangle,
  CheckCircle2, Copy, Check, ExternalLink, Link2, PhoneCall,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { ProgressBar } from "./campaigns-page.jsx";
import {
  LIFECYCLE, STATUS_TONE, STATUS_LABEL, CHANNELS, readinessOf, canAdvanceTo, groupChecklist, pct, typeLabel,
} from "@/lib/campaigns.js";
import { getCrmData, CHANNEL_TO_AUDIENCE } from "@/lib/crm.js";

// One campaign's lifecycle dashboard — the five surfaces the handoff asked for, in the order it
// asked for them: launch-readiness checklist (the actual send gate), strategy, content, target
// prospects, results.
//
// All writes go through onPatch() into the page's single debounced save — this component holds
// no store of its own. The prospect panel reads the SAME live HubSpot data the CRM tab uses
// (getCrmData → crm-hubspot.js); it deliberately does not open a second HubSpot line, and
// per-account call status stays in the outreach console rather than forking a second overlay.

const SECTION_ICON = { checklist: ListChecks, strategy: BookOpen, content: FileText, prospects: Users, results: BarChart3 };

export function CampaignDetail({ campaign: c, resolved, onBack, onPatch, entry, canWrite }) {
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
            </div>
          </div>
        </div>
      </div>

      <LaunchGate c={c} r={r} onSetStatus={setStatus} canWrite={canWrite} />

      <Section id="checklist" title="Launch readiness" description="Every required task must be done before this campaign can be marked ready to launch.">
        <ChecklistPanel
          c={c} r={r} entry={entry} canWrite={canWrite}
          onToggle={toggleItem} onNote={noteItem} onAdd={addItem} onRemove={removeItem} onRestore={restoreHidden}
        />
      </Section>

      <Section id="strategy" title="Campaign strategy" description="The positioning and mechanic for this campaign.">
        <StrategyPanel strategy={c.strategy} />
      </Section>

      <Section id="content" title="Content" description="The copy and assets this campaign sends.">
        <ContentPanel content={c.content} sequence={c.sequence} />
      </Section>

      <Section id="prospects" title="Target prospects" description="Who this campaign reaches — live from the same HubSpot data as the CRM console.">
        <ProspectPanel c={c} resolved={resolved} />
      </Section>

      <Section id="results" title="Results" description={c.status === "launched" || c.status === "complete" ? "Performance since launch." : "Fills in once the campaign launches."}>
        <ResultsPanel c={c} onChange={setResults} canWrite={canWrite} />
      </Section>
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

// ---- The gate ------------------------------------------------------------------------------
// The status control is where the checklist stops being decoration: anything at or past "ready"
// is disabled while a required task is outstanding, and the reason is named.
function LaunchGate({ c, r, onSetStatus, canWrite }) {
  return (
    <Card className={r.ready ? "border-success" : undefined}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[16rem] flex-1">
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
                  onClick={() => onSetStatus(s.id)}
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

// ---- Content -------------------------------------------------------------------------------
function ContentPanel({ content, sequence }) {
  const has = (content || []).length > 0;
  return (
    <div className="space-y-6">
      {has ? (
        <ul className="divide-y divide-border rounded-base border border-border">
          {content.map((a, i) => (
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
      ) : (
        <p className="text-sm text-fg-muted">No assets linked yet.</p>
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

// ---- Target prospects ----------------------------------------------------------------------
// Reuses getCrmData() — the SAME read-only HubSpot line the CRM console uses (crm-hubspot.js).
// No second fetcher, per the handoff. For an enrichment campaign this panel is the working
// gap list: accounts with no email or no named buyer, which is exactly what blocks a send.
// Channel tier orders the calls; "proven customer" and company size aren't in the company read
// today, so they can't be sorted on yet — noted below rather than faked.
const CHANNEL_TIER = { distributor: 0, retail: 1, foodservice: 2 };
const tierOf = (co) => CHANNEL_TIER[CHANNEL_TO_AUDIENCE[co?.channel]] ?? 3;

function ProspectPanel({ c, resolved }) {
  const [crm, setCrm] = useState(undefined);
  const enrichment = c.type === "enrichment";

  useEffect(() => {
    let alive = true;
    setCrm(undefined);
    getCrmData(resolved).then((d) => alive && setCrm(d || null)).catch(() => alive && setCrm(null));
    return () => { alive = false; };
  }, [resolved.id]);

  const companies = crm?.companies || [];
  const gaps = useMemo(() => {
    const list = companies.filter((co) => !co.ownerEmail || !co.owner);
    list.sort((a, b) => tierOf(a) - tierOf(b) || String(a.name).localeCompare(String(b.name)));
    return list;
  }, [companies]);
  const sendable = companies.filter((co) => co.ownerEmail).length;

  return (
    <div className="space-y-5">
      {c.audience ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Figure label="List size" value={(c.audience.size ?? 0).toLocaleString()} />
          <Figure label={enrichment ? "Companies" : "With email"} value={(enrichment ? c.audience.companies : c.audience.emails ?? c.audience.size)?.toLocaleString() ?? "—"} />
          <Figure label="Cap / target" value={c.capTarget ? c.capTarget.toLocaleString() : "—"} />
        </div>
      ) : (
        <p className="text-sm text-fg-muted">No audience defined for this campaign yet.</p>
      )}

      {c.audience?.source && (
        <p className="text-xs text-fg-muted">
          Source: <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px]">{c.audience.source}</code>
          {c.audience.note && <> · {c.audience.note}</>}
        </p>
      )}

      <div className="rounded-base border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-fg">
            {enrichment ? "Accounts missing an email or a named buyer" : "Live CRM coverage"}
          </p>
          {crm === undefined
            ? <span className="text-xs text-fg-muted">Loading accounts…</span>
            : <span className="text-xs text-fg-muted">{companies.length.toLocaleString()} accounts in the CRM · {sendable.toLocaleString()} sendable</span>}
        </div>

        {crm === undefined ? null : companies.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">No accounts returned — the CRM console will show why.</p>
        ) : enrichment ? (
          gaps.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No gaps left" description="Every account has an email and a named buyer." />
          ) : (
            <>
              <p className="mt-1 text-xs text-fg-muted">
                {gaps.length.toLocaleString()} to call, ordered by channel tier. Log the call outcome per account in the
                CRM console — this campaign tracks the pass, the console tracks each conversation.
              </p>
              <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto rounded-base border border-border">
                {gaps.slice(0, 200).map((co) => (
                  <li key={co.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">{co.name}</p>
                      <p className="text-xs text-fg-muted">
                        {[co.channel, [co.city, co.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!co.owner && <Badge variant="warning">No buyer</Badge>}
                      {!co.ownerEmail && <Badge variant="muted">No email</Badge>}
                      {(co.ownerPhone || co.phone) && (
                        <a href={`tel:${co.ownerPhone || co.phone}`} className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline">
                          <PhoneCall className="h-3.5 w-3.5" /> Call
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {gaps.length > 200 && (
                <p className="mt-2 text-xs text-fg-muted">Showing the first 200 of {gaps.length.toLocaleString()} — full list in the CRM console.</p>
              )}
            </>
          )
        ) : (
          <p className="mt-2 text-xs text-fg-muted">
            {sendable.toLocaleString()} of {companies.length.toLocaleString()} accounts have an email today.
            {gaps.length > 0 && <> {gaps.length.toLocaleString()} still need enrichment before they can receive a send.</>}
          </p>
        )}
      </div>

      {(c.dependsOn || []).length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Link2 className="h-3.5 w-3.5" /> Depends on: {c.dependsOn.join(", ")}
        </p>
      )}
    </div>
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
