import { useEffect, useState } from "react";
import { Users, TrendingUp, ShoppingCart, AlertCircle, Lock, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { getCrmData, summarize, hasCrm, canViewCrm, money, PIPELINE_STAGES } from "@/lib/crm.js";

const INVOICE_TONE = { Paid: "success", Sent: "info", Overdue: "error", Draft: "muted" };
const ORDER_TONE = { Open: "warning", Shipped: "info", Delivered: "success" };

export function CrmDashboard({ resolved }) {
  const { user } = useAuth();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setData(undefined);
    getCrmData(resolved).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [resolved]);

  if (!canViewCrm(user)) {
    return <Gate icon={Lock} title="CRM is brand-team only" desc="Your role doesn't include access to sales and account data." />;
  }
  if (!hasCrm(resolved)) {
    return <Gate icon={Plug} title="No CRM connected" desc={`Connect ${resolved.brand.name}'s CRM (HubSpot, etc.) via Make to see live data here.`} />;
  }
  if (data === undefined) return <DashboardSkeleton />;

  const s = summarize(data);
  const maxStage = Math.max(...data.pipeline.map((p) => p.value), 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-fg">Dashboard</h1>
          <p className="mt-1 text-fg-muted">{resolved.brand.name} · sales & accounts</p>
        </div>
        <Badge variant="info" className="uppercase">CRM: {resolved.crm}</Badge>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Pipeline value" value={money(s.pipelineValue)} />
        <Stat icon={ShoppingCart} label="Open orders" value={s.openOrders} />
        <Stat icon={AlertCircle} label="Overdue invoices" value={`${s.overdueCount} · ${money(s.overdueAmount)}`} tone={s.overdueCount ? "error" : undefined} />
        <Stat icon={Users} label="Contacts" value={s.contacts} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pipeline by stage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const row = data.pipeline.find((p) => p.stage === stage) || { count: 0, value: 0 };
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

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.activity.map((a, i) => (
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
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Invoice</TableHead><TableHead>Account</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                  <TableCell className="font-medium">{inv.account}</TableCell>
                  <TableCell className="font-mono">{money(inv.amount)}</TableCell>
                  <TableCell className="text-fg-muted">{inv.due}</TableCell>
                  <TableCell><Badge variant={INVOICE_TONE[inv.status] || "muted"}>{inv.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function OrdersPage({ resolved }) {
  const { user } = useAuth();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setData(undefined);
    getCrmData(resolved).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [resolved]);

  if (!canViewCrm(user)) return <Gate icon={Lock} title="Orders are brand-team only" desc="Your role doesn't include order access." />;
  if (!hasCrm(resolved)) return <Gate icon={Plug} title="No CRM connected" desc="Connect a CRM via Make to see orders." />;
  if (data === undefined) return <DashboardSkeleton />;

  return (
    <div>
      <h1 className="mb-1 font-heading text-3xl text-fg">Orders</h1>
      <p className="mb-6 text-fg-muted">{resolved.brand.name} · order history</p>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Order</TableHead><TableHead>Account</TableHead><TableHead>Channel</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {data.orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-sm">{o.id}</TableCell>
              <TableCell className="font-medium">{o.account}</TableCell>
              <TableCell className="capitalize text-fg-muted">{o.channel}</TableCell>
              <TableCell className="font-mono">{money(o.total)}</TableCell>
              <TableCell className="text-fg-muted">{o.date}</TableCell>
              <TableCell><Badge variant={ORDER_TONE[o.status] || "muted"}>{o.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-fg-muted">{label}</p>
          <p className={`mt-1 font-heading text-2xl ${tone === "error" ? "text-error" : "text-fg"}`}>{value}</p>
        </div>
        <Icon className="h-5 w-5 text-fg-muted" />
      </CardContent>
    </Card>
  );
}

function Gate({ icon, title, desc }) {
  return (
    <div className="mx-auto max-w-md py-12">
      <EmptyState icon={icon} title={title} description={desc} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
