import { useEffect, useState } from "react";
import { AlertTriangle, Mail, ListTodo, Handshake, CheckCircle2, History, Undo2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/input.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import {
  getAttention,
  ATTENTION_KINDS,
  getAttentionResolutions,
  resolveAttentionItem,
  reopenAttentionItem,
  RESOLUTION_METHODS,
} from "@/lib/attention.js";

const KIND_ICON = { email: Mail, task: ListTodo, commitment: Handshake };

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

// Inline "mark resolved" row — expands under an item, matching the campaign call-console pattern
// (expandable row, not a modal; notes + a method picker; explicit Confirm rather than autosave,
// since this is a one-shot action, not a continuously-edited field).
function ResolveForm({ onConfirm, onCancel, saving }) {
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("phone");

  return (
    <div className="mt-2 space-y-2 rounded-base border border-border bg-bg p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-fg-muted">Resolved via</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-8 rounded-base border border-border bg-surface px-2 text-sm text-fg"
        >
          {RESOLUTION_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What happened, e.g. “Called Stefano — approved, printing today. Confirming by email.”"
        className="min-h-16 text-sm"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={() => onConfirm({ notes, method })} disabled={saving}>
          {saving ? "Saving…" : "Confirm resolved"}
        </Button>
      </div>
    </div>
  );
}

// "Priority — response needed" — the get-the-day-started window at the top of the dashboard.
// Surfaces ONLY what must be handled today (urgent emails awaiting a reply, tasks at deadline);
// everything else stays down in "At a glance". Data via the getAttention() seam — live-published
// by a Gmail-driven priority-response routine when VITE_ATTENTION_BACKEND=function, bundled
// sample otherwise (see lib/attention.js).
//
// Manual resolutions (2026-09-21, Rick: "some things get resolved in phone calls and you won't
// see the update... include a resolved and notes button... keep a log"): the automation only sees
// what happens in Gmail, so a call or hallway conversation that actually closes something out
// would otherwise sit on this card until it ages off on its own next Monday. "Mark resolved"
// clears an item immediately (own suppress-list, independent of the Gmail data) and logs who/why
// for lookback — see netlify/functions/attention-resolutions.js.
export function PriorityCard({ resolved }) {
  const [items, setItems] = useState(undefined);
  const [isSample, setIsSample] = useState(true);
  const [resolutions, setResolutions] = useState({ resolved: {}, log: [] });
  const [openId, setOpenId] = useState(null); // which item's resolve form is expanded
  const [savingId, setSavingId] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    Promise.all([getAttention(resolved), getAttentionResolutions(resolved)]).then(([att, res]) => {
      if (!alive) return;
      setItems(att.items);
      setIsSample(att.isSample);
      setResolutions(res);
    });
    return () => { alive = false; };
  }, [resolved]);

  if (!items) return null;

  const visible = items.filter((item) => !resolutions.resolved[item.id]);
  const log = resolutions.log || [];
  if (visible.length === 0 && log.length === 0) return null;

  async function handleResolve(item, { notes, method }) {
    setSavingId(item.id);
    const res = await resolveAttentionItem(resolved, item, { notes, method });
    setSavingId(null);
    if (!res.ok) {
      toast({ title: "Couldn't save that", description: "Try again in a moment.", tone: "error" });
      return;
    }
    setResolutions({ resolved: res.resolved || {}, log: res.log || [] });
    setOpenId(null);
    toast({ title: "Marked resolved", description: `${item.who} — logged for later.`, tone: "success" });
  }

  async function handleReopen(entry) {
    const res = await reopenAttentionItem(resolved, entry.id);
    if (!res.ok) {
      toast({ title: "Couldn't reopen that", tone: "error" });
      return;
    }
    setResolutions({ resolved: res.resolved || {}, log: res.log || [] });
    toast({ title: "Reopened", description: "Back on the live card if it's still outstanding.", tone: "default" });
  }

  return (
    <Card className="mt-8 border-2" style={{ borderColor: "color-mix(in srgb, #B42318 55%, var(--cs-color-border))" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: "#B42318" }} />
          Priority — response needed
          {visible.length > 0 && <Badge variant="error" className="uppercase tracking-wide">Urgent</Badge>}
          {isSample && (
            <Badge variant="muted" className="ml-1 text-[10px] uppercase tracking-wide" title="Sample data — not yet connected to the live mailbox">
              Sample
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length > 0 ? (
          <>
            <p className="-mt-1 mb-1 text-xs text-fg-muted">
              Needs your attention before anything else today.
            </p>
            {visible.map((item) => {
              const Icon = KIND_ICON[item.kind] || AlertTriangle;
              const open = openId === item.id;
              return (
                <div key={item.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg"
                        style={{ background: "color-mix(in srgb, #B42318 10%, transparent)", color: "#B42318" }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-fg">{item.who}</p>
                          <span className="cs-eyebrow text-[10px] text-fg-muted">{ATTENTION_KINDS[item.kind] || item.kind}</span>
                          {item.urgency === "urgent" && <Badge variant="error" className="text-[10px] uppercase">Urgent</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-fg-muted">{item.what}</p>
                      </div>
                    </div>
                    <div className="flex flex-none items-start gap-3">
                      <div className="text-right">
                        {item.due && <p className="whitespace-nowrap text-xs text-fg-muted">due {item.due}</p>}
                        {item.action && <p className="cs-eyebrow mt-1 text-xs" style={{ color: "#B42318" }}>{item.action}</p>}
                      </div>
                      <Button
                        variant={open ? "outline" : "ghost"}
                        size="sm"
                        className="gap-1.5 whitespace-nowrap"
                        onClick={() => setOpenId(open ? null : item.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark resolved
                      </Button>
                    </div>
                  </div>
                  {open && (
                    <ResolveForm
                      saving={savingId === item.id}
                      onCancel={() => setOpenId(null)}
                      onConfirm={(payload) => handleResolve(item, payload)}
                    />
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <p className="-mt-1 mb-1 text-sm text-fg-muted">Nothing needs a reply right now.</p>
        )}

        {log.length > 0 && (
          <div className={visible.length > 0 ? "pt-1" : undefined}>
            <button
              type="button"
              onClick={() => setShowLog((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg"
            >
              <History className="h-3.5 w-3.5" />
              {showLog ? "Hide" : "View"} resolved log ({log.length})
            </button>
            {showLog && (
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                {log.map((entry, i) => (
                  <li key={`${entry.id}-${entry.at || entry.resolvedAt}-${i}`} className="rounded-base border border-border p-2.5 text-xs">
                    {entry.action === "reopen" ? (
                      <p className="text-fg-muted">
                        <span className="font-medium text-fg">Reopened</span> by {entry.resolvedBy} · {timeAgo(entry.at)}
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-fg">{entry.who || "—"}</p>
                          <div className="flex items-center gap-2 text-fg-muted">
                            <span className="cs-eyebrow">
                              {RESOLUTION_METHODS.find((m) => m.value === entry.method)?.label || "Other"}
                            </span>
                            <span>· {timeAgo(entry.resolvedAt)}</span>
                            <button
                              type="button"
                              title="Reopen — bring this back onto the live card"
                              className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
                              onClick={() => handleReopen(entry)}
                            >
                              <Undo2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {entry.what && <p className="mt-0.5 text-fg-muted">{entry.what}</p>}
                        {entry.notes && <p className="mt-1 italic text-fg">“{entry.notes}”</p>}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-fg-muted">
                          resolved by {entry.resolvedBy}
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
