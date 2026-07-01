import { useEffect, useMemo, useState } from "react";
import { Newspaper, ExternalLink, ArrowRight, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";
import { getMarketNews, NEWS_CATEGORIES, marketNewsAreSample } from "@/lib/market-news.js";
import { addLocalSignal, loadLocalSignals } from "@/lib/signals.js";

// Market News — Tier 1 of the market nerve ending, the ambient MORNING READ
// (docs/MARKET_INTELLIGENCE_SPEC.md §2a / §4.3). Two tabs (Trade / Consumer); each row is
// headline · source · date, opening the article. Deliberately lightweight: skim, not analysis.
// The house-only "→ Signal" action is the Tier 1 → Tier 2 bridge: it distills a headline into a
// structured signal (localStorage overlay) that immediately feeds the Opportunity engine.

// Rough audience mapping for a promoted headline; the house refines when authoring properly.
const CATEGORY_AUDIENCES = {
  trade: ["distributor", "retail"],
  consumer: ["retail", "foodservice"],
};

/** Distill a news item into a Tier 2 signal (deterministic — no AI pass yet). */
function distill(item) {
  return {
    id: `sig-from-${item.id}`,
    scope: "market",
    audience: CATEGORY_AUDIENCES[item.category] || ["retail"],
    type: "category-trend",
    title: item.headline,
    insight: item.summary || item.headline,
    suggestedAngle: "",
    storyHints: [],
    skus: [],
    source: "promoted-news",
    freshness: item.date,
  };
}

export function MarketNewsCard({ resolved, onPromoted }) {
  const { user } = useAuth();
  const isHouse = rolesOf(user).includes("admin");
  const { toast } = useToast();
  const [items, setItems] = useState(undefined);
  const [tab, setTab] = useState("trade");
  const [promotedIds, setPromotedIds] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    setItems(undefined);
    getMarketNews(resolved).then((news) => { if (alive) setItems(news); });
    setPromotedIds(new Set(loadLocalSignals(resolved?.id).map((s) => s.id)));
    return () => { alive = false; };
  }, [resolved]);

  const visible = useMemo(() => (items || []).filter((n) => n.category === tab), [items, tab]);

  function promote(item) {
    const signal = distill(item);
    addLocalSignal(resolved.id, signal);
    setPromotedIds((prev) => new Set(prev).add(signal.id));
    toast({ title: "Promoted to signal", description: "It now feeds the Opportunities lane.", tone: "success" });
    onPromoted?.();
  }

  if (items !== undefined && items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-brand-primary" />
          Market news
          {marketNewsAreSample && (
            <Badge variant="muted" className="ml-2 align-middle text-[10px] uppercase tracking-wide" title="Sample data — the overnight brief isn't wired yet">
              Sample
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {NEWS_CATEGORIES.map((c) => {
            const on = tab === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setTab(c.id)}
                className={"rounded-full border px-3 py-1 text-sm transition-colors " + (on ? "border-brand-primary bg-bg font-semibold text-brand-primary" : "border-border text-fg-muted hover:border-brand-primary")}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {items === undefined ? (
          <p className="text-sm text-fg-muted">Loading the morning read…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-fg-muted">Nothing in this category today.</p>
        ) : (
          visible.map((n) => {
            const promoted = promotedIds.has(`sig-from-${n.id}`);
            return (
              <div key={n.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1 text-sm font-medium text-fg hover:text-brand-primary">
                    <span>{n.headline}</span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                  </a>
                  {n.summary && <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{n.summary}</p>}
                  <p className="mt-1 text-xs text-fg-muted">{n.source} · {n.date}</p>
                </div>
                {isHouse && (
                  promoted ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-fg-muted">
                      <Check className="h-3.5 w-3.5" /> Signal
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" className="shrink-0" title="Distill into a market signal — feeds the Opportunity engine" onClick={() => promote(n)}>
                      <ArrowRight className="h-4 w-4" /> Signal
                    </Button>
                  )
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
