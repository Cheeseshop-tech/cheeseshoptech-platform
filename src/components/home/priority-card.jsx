import { useEffect, useState } from "react";
import { AlertTriangle, Mail, ListTodo, Handshake } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { getAttention, attentionIsSample, ATTENTION_KINDS } from "@/lib/attention.js";

const KIND_ICON = { email: Mail, task: ListTodo, commitment: Handshake };

// "Priority — response needed" — the get-the-day-started window at the top of the dashboard.
// Surfaces ONLY what must be handled today (urgent emails awaiting a reply, tasks at deadline);
// everything else stays down in "At a glance". Data via the getAttention() seam (mock now; a
// mailbox-reading function later — see lib/attention.js). Renders nothing when the desk is clear.
export function PriorityCard({ resolved }) {
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    let alive = true;
    getAttention(resolved).then((list) => { if (alive) setItems(list); });
    return () => { alive = false; };
  }, [resolved]);

  if (!items || items.length === 0) return null;

  return (
    <Card className="mt-8 border-2" style={{ borderColor: "color-mix(in srgb, #B42318 55%, var(--cs-color-border))" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: "#B42318" }} />
          Priority — response needed
          <Badge variant="error" className="uppercase tracking-wide">Urgent</Badge>
          {attentionIsSample && (
            <Badge variant="muted" className="ml-1 text-[10px] uppercase tracking-wide" title="Sample data — not yet connected to the live mailbox">
              Sample
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="-mt-1 mb-1 text-xs text-fg-muted">
          Needs your attention before anything else today.
        </p>
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind] || AlertTriangle;
          return (
            <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
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
              <div className="text-right">
                {item.due && <p className="whitespace-nowrap text-xs text-fg-muted">due {item.due}</p>}
                {item.action && <p className="cs-eyebrow mt-1 text-xs" style={{ color: "#B42318" }}>{item.action}</p>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
