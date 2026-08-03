import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Share2, PhoneCall, Megaphone, Rocket, ListChecks, Users, MessageSquare, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import {
  getCampaigns, getCampaignState, saveCampaignState, mergeCampaign, readinessOf, summarize,
  canViewCampaigns, CAMPAIGN_TYPES, STATUS_TONE, STATUS_LABEL, CHANNELS, campaignsAreSample, compact,
} from "@/lib/campaigns.js";
import { CampaignDetail } from "./campaign-detail.jsx";

// Campaigns tab — pill sub-nav by campaign type, then a lifecycle dashboard per campaign
// (HANDOFF_2026-08-03). The pill row is driven entirely by CAMPAIGN_TYPES in lib/campaigns.js:
// adding a type there grows the nav, which is the "easy to extend" the brief asked for. Only the
// icon lives here, since lib/campaigns.js is a data module and shouldn't import lucide.
//
// Wiring, mirroring the CRM tab: definitions come from getCampaigns(), while status + checklist
// ticks + results are the platform-owned overlay saved through campaign-state.js to Netlify
// Blobs (shared, survives any browser — never localStorage).
const TYPE_ICON = { email: Mail, social: Share2, enrichment: PhoneCall };

export function CampaignsPage({ resolved }) {
  const { user } = useAuth();
  const [defs, setDefs] = useState(undefined);
  const [entries, setEntries] = useState({});
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved | denied | failed
  const [type, setType] = useState(CAMPAIGN_TYPES[0].id);
  const [openId, setOpenId] = useState(null);
  const timer = useRef(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    let alive = true;
    setDefs(undefined); setOpenId(null);
    Promise.all([getCampaigns(resolved), getCampaignState(resolved)]).then(([list, state]) => {
      if (!alive) return;
      setDefs(list); setEntries(state.entries || {});
    });
    return () => { alive = false; };
  }, [resolved.id]);

  // Debounced full-document save, identical in shape to the outreach console's (crm-page.jsx).
  function scheduleSave(next) {
    setEntries(next); setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState("saving");
      const res = await saveCampaignState(resolved, entriesRef.current);
      setSaveState(res.ok ? "saved" : res.status === 401 ? "denied" : "failed");
    }, 900);
  }
  /** Merge a partial state patch into one campaign's entry. */
  const patch = (id, part) => scheduleSave({
    ...entriesRef.current,
    [id]: { ...entriesRef.current[id], ...part, updatedAt: new Date().toISOString() },
  });

  const campaigns = useMemo(
    () => (defs || []).map((d) => mergeCampaign(d, entries[d.id] || {})),
    [defs, entries]
  );
  const byId = useMemo(() => Object.fromEntries(campaigns.map((c) => [c.id, c])), [campaigns]);

  if (!canViewCampaigns(user)) {
    return (
      <div className="mx-auto max-w-md py-12">
        <EmptyState icon={Lock} title="Campaigns are brand-team only" description="Your role doesn't include campaign access." />
      </div>
    );
  }
  if (defs === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-96" />
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const open = openId ? byId[openId] : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-fg">Campaigns</h1>
          <p className="mt-1 text-fg-muted">{resolved.brand.name} · from draft through launch to results.</p>
        </div>
        <SaveChip state={saveState} />
      </div>

      {open ? (
        <CampaignDetail
          campaign={open}
          resolved={resolved}
          onBack={() => setOpenId(null)}
          onPatch={(part) => patch(open.id, part)}
          entry={entries[open.id] || {}}
          canWrite={saveState !== "denied"}
        />
      ) : (
        <Tabs value={type} onValueChange={setType}>
          <TabsList className="flex-wrap">
            {CAMPAIGN_TYPES.map((t) => {
              const n = campaigns.filter((c) => c.type === t.id).length;
              return (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                  <span className="ml-2 rounded-full bg-bg px-1.5 py-0.5 text-[11px] text-fg-muted">{n}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CAMPAIGN_TYPES.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              <TypePanel
                type={t}
                campaigns={campaigns.filter((c) => c.type === t.id)}
                onOpen={setOpenId}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <p className="mt-8 border-t border-border pt-3 text-xs text-fg-muted">
        Campaign definitions {campaignsAreSample ? "are seeded in the app" : "load from the configured backend"}; status,
        checklist and results save to the platform (admin passcode) and are shared across the team.
      </p>
    </div>
  );
}

function TypePanel({ type, campaigns, onOpen }) {
  const s = summarize(campaigns);
  const Icon = TYPE_ICON[type.id] || Megaphone;

  if (campaigns.length === 0) {
    return <EmptyState icon={Icon} title={`No ${type.label.toLowerCase()} yet`} description={type.blurb} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Rocket} label="In market" value={s.live} accent={s.live ? "success" : undefined} />
        <Stat icon={ListChecks} label="Ready to launch" value={s.ready} accent={s.ready ? "warning" : undefined} />
        <Stat icon={Megaphone} label="In progress" value={s.building} />
        <Stat icon={Users} label="Audience reach" value={compact(s.audience)} />
      </div>

      <div className="space-y-4">
        {campaigns.map((c) => <CampaignCard key={c.id} c={c} onOpen={() => onOpen(c.id)} />)}
      </div>
    </div>
  );
}

function CampaignCard({ c, onOpen }) {
  const r = readinessOf(c);
  const gate = r.total > 0;
  return (
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="cursor-pointer transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg text-fg">{c.name}</h3>
              <Badge variant={STATUS_TONE[c.status] || "muted"}>{STATUS_LABEL[c.status] || c.status}</Badge>
              {r.ready && c.status !== "launched" && c.status !== "complete" && (
                <Badge variant="success">Gate clear</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-fg-muted">{c.goal}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              {(c.channels || []).map((ch) => (
                <span key={ch} className="rounded-full border border-border px-2.5 py-0.5">{CHANNELS[ch] || ch}</span>
              ))}
              {c.start && <span>· {c.start}{c.end ? ` → ${c.end}` : " → open"}</span>}
              {c.audience?.size ? <span className="inline-flex items-center gap-1">· <Users className="h-3.5 w-3.5" /> {c.audience.size.toLocaleString()}</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            {gate && (
              <div className="min-w-[9rem]">
                <ProgressBar done={r.requiredDone} total={r.requiredTotal} tone={r.ready ? "success" : "brand"} />
                <p className="mt-1.5 text-xs text-fg-muted">
                  {r.requiredDone}/{r.requiredTotal} required
                  {!r.ready && r.blockers.length > 0 && ` · ${r.blockers.length} blocking`}
                </p>
              </div>
            )}
            {(c.results?.replies || c.results?.won) ? (
              <div className="flex items-center gap-1 text-sm text-fg-muted">
                <MessageSquare className="h-4 w-4" /> {c.results.replies || 0}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressBar({ done, total, tone = "brand" }) {
  const width = total ? (done / total) * 100 : 0;
  const bg = tone === "success" ? "bg-success" : "bg-brand-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
      <div className={`h-full ${bg} transition-[width]`} style={{ width: `${width}%` }} />
    </div>
  );
}

function SaveChip({ state }) {
  if (state === "idle") return null;
  const map = {
    dirty: ["Saving…", "text-fg-muted border-border"],
    saving: ["Saving…", "text-fg-muted border-border"],
    saved: ["Saved ✓", "text-success border-success"],
    denied: ["Read-only — admin passcode required to save", "text-warning border-warning"],
    failed: ["Save failed — retry an edit", "text-warning border-warning"],
  };
  const [text, cls] = map[state] || map.saving;
  return <span className={`rounded-base border px-2.5 py-1 text-xs ${cls}`}>{text}</span>;
}
