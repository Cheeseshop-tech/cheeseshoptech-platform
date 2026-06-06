import { useEffect, useState } from "react";
import {
  TrendingUp, Megaphone, Users, ShoppingCart, AlertCircle, Images, ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { getCrmData, summarize as crmSummarize, hasCrm, money, PIPELINE_STAGES } from "@/lib/crm.js";
import { getCampaigns, summarize as campSummarize, STATUS_TONE, CHANNELS, compact } from "@/lib/campaigns.js";
import { listAssets } from "@/lib/media.js";
import { getStore } from "@/lib/store.js";

// Command-center landing page: aggregates campaigns, CRM, media, and the store into one view.
// Each section deep-links into its full module. Gated to admin/client by the nav.
export function HomeDashboard({ resolved, onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setData(undefined);
    Promise.all([
      getCrmData(resolved),
      getCampaigns(resolved),
      listAssets({ tenantFolder: resolved.cloudinaryFolder, user }),
      Promise.resolve(getStore(resolved)),
    ]).then(([crm, campaigns, assets, store]) => {
      if (alive) setData({ crm, campaigns, assets, store });
    });
    return () => { alive = false; };
  }, [resolved, user]);

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const { crm, campaigns, assets, store } = data;
  const crmS = crm ? crmSummarize(crm) : null;
  const campS = campSummarize(campaigns);
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const overdue = crm?.invoices?.filter((i) => i.status === "Overdue") || [];
  const openOrders = store?.orders?.length ?? crmS?.openOrders ?? 0;
  const maxStage = crm ? Math.max(...crm.pipeline.map((p) => p.value), 1) : 1;
  const name = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-fg">Welcome back, {name}</h1>
          <p className="mt-1 text-fg-muted">{resolved.brand.name} · here's everything at a glance.</p>
        </div>
        {store && (
          <Badge variant={store.settings.status === "live" ? "success" : "warning"}>
            Store {store.settings.status === "live" ? "live" : "in maintenance"}
          </Badge>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={TrendingUp} label="Pipeline value" value={crmS ? money(crmS.pipelineValue) : "—"} onClick={() => onNavigate?.("dashboard")} />
        <KpiCard icon={Megaphone} label="Active campaigns" value={campS.active} onClick={() => onNavigate?.("campaigns")} />
        <KpiCard icon={Users} label="Campaign reach" value={compact(campS.reach)} onClick={() => onNavigate?.("campaigns")} />
        <KpiCard icon={ShoppingCart} label="Open orders" value={openOrders} onClick={() => onNavigate?.("orders")} />
        <KpiCard icon={AlertCircle} label="Overdue invoices" value={overdue.length} tone={overdue.length ? "error" : undefined} />
        <KpiCard icon={Images} label="Media assets" value={assets.length} onClick={() => onNavigate?.("media")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {crm && hasCrm(resolved) && (
          <Card>
            <CardHeader><CardTitle>Pipeline by stage</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const row = crm.pipeline.find((p) => p.stage === stage) || { count: 0, value: 0 };
                return (
                  <div key={stage}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-fg">{stage} <span className="text-fg-muted">· {row.count}</span></span>
                      <span className="font-mono text-fg-muted">{money(row.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-brand-primary" style={{ width: `${(row.value / maxStage) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Active campaigns</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeCampaigns.length === 0 ? (
              <p className="text-sm text-fg-muted">No active campaigns right now.</p>
            ) : activeCampaigns.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-fg">{c.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.channels.map((ch) => <span key={ch} className="rounded-full border border-border px-2 py-0.5 text-xs text-fg-muted">{CHANNELS[ch] || ch}</span>)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-heading text-lg text-fg">{money(c.kpis.revenue)}</p>
                  <p className="text-xs text-fg-muted">{compact(c.kpis.reach)} reach</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.("campaigns")}>All campaigns <ArrowRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>

        {crm && (
          <Card>
            <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {crm.activity.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-fg">{a.who}</p>
                    <p className="text-sm text-fg-muted">{a.what}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-fg-muted">{a.when}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {overdue.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {overdue.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-fg">{inv.account}</p>
                    <p className="text-sm text-fg-muted"><span className="font-mono">{inv.id}</span> · due {inv.due}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-fg">{money(inv.amount)}</span>
                    <Badge variant="error">Overdue</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone, onClick }) {
  return (
    <Card onClick={onClick} className={"p-5 " + (onClick ? "cursor-pointer transition-colors hover:border-brand-primary" : "")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-fg-muted">{label}</p>
          <p className={"mt-1 font-heading text-2xl " + (tone === "error" ? "text-error" : "text-fg")}>{value}</p>
        </div>
        <Icon className="h-5 w-5 text-fg-muted" />
      </div>
    </Card>
  );
}
