import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { getCrmData, hasCrm, money, PIPELINE_STAGES, crmIsSample } from "@/lib/crm.js";
import {
  getCampaigns, getCampaignState, mergeCampaign, readinessOf, isLive,
  CHANNELS, STATUS_TONE, STATUS_LABEL, campaignsAreSample,
} from "@/lib/campaigns.js";
import { getSignals, signalsAreSample } from "@/lib/signals.js";
import { rankOpportunities } from "@/lib/opportunities.js";
import { getBrandKit } from "@/lib/brandKit.js";
import { getPricingData } from "@/lib/pricing.js";
import { emptyProposal, saveDraft } from "@/lib/proposals.js";
import { MarketNewsCard } from "./market-news.jsx";

// Small "Sample" chip for sections still on mock data (CRM = HubSpot, campaigns = HubSpot marketing —
// not wired yet, see INTEGRATION_WIRING_BRIEF.md). Auto-disappears once the live backend is set.
function SampleTag({ show }) {
  if (!show) return null;
  return (
    <Badge variant="muted" className="ml-2 align-middle text-[10px] uppercase tracking-wide" title="Sample data — not yet connected to the live source">
      Sample
    </Badge>
  );
}

// "At a glance" command-center strip for the home hub — pipeline by stage, active campaigns,
// recent activity, and overdue invoices. Rendered below the hub's tool cards for tenants with a
// CRM (the agency house has none, so its hub stays clean). Data via the same mock-or-real seams.
export function CommandCenter({ resolved, onNavigate }) {
  const [data, setData] = useState(undefined);
  // Bumped when Market News promotes a headline to a signal, so the Opportunities lane re-ranks.
  const [signalsVersion, setSignalsVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    if (signalsVersion === 0) setData(undefined); // keep the strip stable on re-rank
    // Campaign definitions AND their state overlay — the same merge the Campaigns tab does, so
    // the hub can never disagree with it about what's launched or how close a campaign is.
    Promise.all([getCrmData(resolved), getCampaigns(resolved), getSignals(resolved), getCampaignState(resolved)])
      .then(([crm, defs, signals, state]) => {
        if (!alive) return;
        const brandKit = getBrandKit(resolved);
        const catalog = getPricingData(resolved)?.catalog;
        const opportunities = rankOpportunities({ crm, signals, brandKit, catalog });
        // CRM-05 follow-up: getCampaignState() now resolves null on a failed read — guard the
        // whole chain, not just .entries, or a failed read throws here instead of degrading.
        const campaigns = (defs || []).map((d) => mergeCampaign(d, state?.entries?.[d.id] || {}));
        setData({ crm, campaigns, opportunities });
      });
    return () => { alive = false; };
  }, [resolved, signalsVersion]);

  if (data === undefined) {
    return (
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const { crm, campaigns, opportunities } = data;
  // "In flight" = actually in market, else the ones being worked on. Showing only `launched`
  // would leave the card empty for most of a campaign's life, which is when it needs watching.
  const live = (campaigns || []).filter(isLive);
  const inFlight = (live.length ? live : (campaigns || []).filter((c) => c.status === "ready" || c.status === "building")).slice(0, 4);
  const overdue = crm?.invoices?.filter((i) => i.status === "Overdue") || [];
  const maxStage = crm ? Math.max(...crm.pipeline.map((p) => p.value), 1) : 1;

  // Compose: seed a proposal draft from the opportunity, then jump into the (revived) builder.
  function compose(opp) {
    saveDraft(resolved.id, {
      ...emptyProposal(),
      buyer: opp.who,
      buyerId: opp.accountId || "",
      audience: opp.audience || "",
      headline: opp.headline || "",
      intro: opp.intro || "",
      storyKeys: opp.storyKeys || [],
      signalKeys: opp.signalKeys || [],
      skus: opp.skuCodes || [],
    });
    onNavigate?.("compose");
  }

  return (
    <>
      <h2 className="cs-display mb-4 mt-12 text-2xl text-brand-primary">At a glance</h2>

      {opportunities?.length > 0 && (
        <Card className="mb-6 border-brand-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-primary" />
              Opportunities
              <SampleTag show={signalsAreSample || crmIsSample} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="-mt-1 mb-1 text-xs text-fg-muted">
              Where a market signal meets an account — the brand-story angle that fits, ready to compose.
            </p>
            {opportunities.slice(0, 4).map((opp) => (
              <div key={opp.id} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg">{opp.who}</p>
                    {opp.audience && <Badge variant="muted" className="text-[10px] uppercase tracking-wide">{opp.audience}</Badge>}
                    <span className="text-xs text-fg-muted" title="Brand-fit × timeliness × account value">fit {opp.score}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-fg-muted"><span className="font-medium text-fg">Why now:</span> {opp.whyNow}</p>
                  <p className="mt-0.5 text-sm text-fg-muted"><span className="font-medium text-fg">Angle:</span> {opp.angle}</p>
                </div>
                <Button size="sm" onClick={() => compose(opp)} className="shrink-0">
                  <Sparkles className="h-4 w-4" /> Compose
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Order (Rick, 2026-07-02): Opportunities above, then Active campaigns · Market news,
          then the rest. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{live.length ? "Active campaigns" : "Campaigns in flight"}<SampleTag show={campaignsAreSample} /></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {inFlight.length === 0 ? (
              <p className="text-sm text-fg-muted">No campaigns in flight right now.</p>
            ) : inFlight.map((c) => {
              const r = readinessOf(c);
              return (
                <div key={c.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-fg">{c.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(c.channels || []).map((ch) => <span key={ch} className="rounded-full border border-border px-2 py-0.5 text-xs text-fg-muted">{CHANNELS[ch] || ch}</span>)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={STATUS_TONE[c.status] || "muted"}>{STATUS_LABEL[c.status] || c.status}</Badge>
                    {r.requiredTotal > 0 && (
                      <p className="mt-1.5 text-xs text-fg-muted">{r.requiredDone}/{r.requiredTotal} required done</p>
                    )}
                  </div>
                </div>
              );
            })}
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.("campaigns")}>All campaigns <ArrowRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <MarketNewsCard resolved={resolved} onPromoted={() => setSignalsVersion((v) => v + 1)} />

        {crm && hasCrm(resolved) && crm.pipeline?.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Pipeline by stage<SampleTag show={crmIsSample} /></CardTitle></CardHeader>
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

        {crm && crm.activity?.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recent activity<SampleTag show={crmIsSample} /></CardTitle></CardHeader>
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
            <CardHeader><CardTitle>Needs attention<SampleTag show={crmIsSample} /></CardTitle></CardHeader>
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
    </>
  );
}
