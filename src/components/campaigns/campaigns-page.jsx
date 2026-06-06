import { useEffect, useState } from "react";
import { Plus, Megaphone, CalendarClock, Users, TrendingUp, Lock, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { getCampaigns, summarize, canViewCampaigns, STATUS_TONE, CHANNELS, money, compact } from "@/lib/campaigns.js";

export function CampaignsPage({ resolved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setList(undefined);
    getCampaigns(resolved).then((c) => alive && setList(c));
    return () => { alive = false; };
  }, [resolved]);

  if (!canViewCampaigns(user)) {
    return (
      <div className="mx-auto max-w-md py-12">
        <EmptyState icon={Lock} title="Campaigns are brand-team only" description="Your role doesn't include campaign access." />
      </div>
    );
  }
  if (list === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const s = summarize(list);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-fg">Campaigns</h1>
          <p className="mt-1 text-fg-muted">{resolved.brand.name} · coordinated across retail, DTC & social.</p>
        </div>
        <NewCampaignDialog onCreate={() => toast({ title: "Campaign drafted", description: "Saved as draft.", tone: "success" })} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Megaphone} label="Active" value={s.active} />
        <Stat icon={CalendarClock} label="Scheduled" value={s.scheduled} />
        <Stat icon={Users} label="Reach (period)" value={compact(s.reach)} />
        <Stat icon={TrendingUp} label="Attributed revenue" value={money(s.revenue)} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Plan a coordinated push across retail, DTC, and social." />
      ) : (
        <div className="space-y-4">
          {list.map((c) => <CampaignCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ c }) {
  const active = c.status === "active";
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg text-fg">{c.name}</h3>
            <Badge variant={STATUS_TONE[c.status] || "muted"} className="capitalize">{c.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-fg-muted">{c.goal}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {c.channels.map((ch) => (
              <span key={ch} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">{CHANNELS[ch] || ch}</span>
            ))}
            <span className="text-xs text-fg-muted">· {c.start} → {c.end}</span>
            <span className="inline-flex items-center gap-1 text-xs text-fg-muted"><ImageIcon className="h-3.5 w-3.5" /> {c.assets}</span>
          </div>
        </div>
        {active && (
          <div className="flex gap-6 text-right">
            <Metric label="Reach" value={compact(c.kpis.reach)} />
            <Metric label="Orders" value={c.kpis.orders} />
            <Metric label="Revenue" value={money(c.kpis.revenue)} />
          </div>
        )}
      </div>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="font-heading text-xl text-fg">{value}</p>
      <p className="text-xs text-fg-muted">{label}</p>
    </div>
  );
}

function NewCampaignDialog({ onCreate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary"><Plus className="h-4 w-4" /> New campaign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>Plan a coordinated push. Channels keep retail and social in sync.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2"><Label htmlFor="cn">Name</Label><Input id="cn" placeholder="e.g. Fall Harvest Boards" /></div>
          <div className="grid gap-2"><Label htmlFor="cg">Goal</Label><Textarea id="cg" placeholder="What this campaign should drive…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="cs">Start</Label><Input id="cs" type="date" /></div>
            <div className="grid gap-2"><Label htmlFor="ce">End</Label><Input id="ce" type="date" /></div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <DialogClose asChild><Button variant="primary" onClick={onCreate}>Create draft</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
