import { useMemo, useState } from "react";
import { FileText, Link as LinkIcon, Eye, Trash2, FileX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getPricingData } from "@/lib/pricing.js";
import {
  emptyProposal, loadDraft, saveDraft, buildShareUrl, flattenSkus, skuImageUrl,
} from "@/lib/proposals.js";
import { ProposalView } from "./proposal-view.jsx";

// Proposal builder (F4, Manage tier) — assemble a branded buyer proposal from canonical
// data: copy + a presentation deck + a SKU selection priced at a class of trade. One
// generic engine for both tiers: the house pitches prospects with CST's brand/data, a
// client admin pitches buyers with theirs. Output = preview + shareable gated link
// (the proposal travels in the URL; prices always quote live).
export function ProposalBuilder({ resolved }) {
  const pricing = getPricingData(resolved);
  const { toast } = useToast();
  const [p, setP] = useState(() => loadDraft(resolved.id));
  const [preview, setPreview] = useState(false);

  const allSkus = useMemo(() => (pricing ? flattenSkus(pricing.catalog) : []), [pricing]);
  const byCategory = useMemo(() => {
    const groups = {};
    for (const item of allSkus) {
      const cat = item.product.category || "Other";
      (groups[cat] = groups[cat] || []).push(item);
    }
    return groups;
  }, [allSkus]);

  if (!pricing) {
    return (
      <div>
        <h1 className="mb-1 font-heading text-3xl text-fg">Proposals</h1>
        <EmptyState
          icon={FileX}
          title="No canonical data for this tenant"
          description="The proposal engine builds from the tenant's catalog + price list. Wire the data bundle first (lib/pricing.js)."
        />
      </div>
    );
  }

  const config = pricing.config;
  const tiers = config?.pricing?.tiers || [];
  const decks = resolved.presentations || [];

  function update(field, value) {
    const next = { ...p, [field]: value };
    setP(saveDraft(resolved.id, next));
  }

  function toggleSku(code) {
    const has = p.skus.includes(code);
    update("skus", has ? p.skus.filter((c) => c !== code) : [...p.skus, code]);
  }

  function copyLink() {
    const url = buildShareUrl(resolved, p);
    navigator.clipboard?.writeText(url).then(
      () => toast({ title: "Share link copied", description: "Passcode-gated; prices quote live at open.", tone: "success" }),
      () => toast({ title: "Couldn't copy link", tone: "error" }),
    );
  }

  if (preview) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Button variant="ghost" size="sm" onClick={() => setPreview(false)}>← Back to builder</Button>
          <Button variant="primary" size="sm" onClick={copyLink}><LinkIcon className="h-4 w-4" /> Copy share link</Button>
        </div>
        <ProposalView resolved={resolved} proposal={p} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-fg">Proposals</h1>
          <p className="mt-1 text-fg-muted">
            Build a branded proposal from the live catalog — story deck, selections, and class-of-trade pricing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setP(saveDraft(resolved.id, emptyProposal()))}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button variant="primary" size="sm" onClick={copyLink}>
            <LinkIcon className="h-4 w-4" /> Copy share link
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-brand-primary" /> The pitch</CardTitle>
            <CardDescription>Who it's for and what it says. Drafts save automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pb-buyer">Prepared for</Label>
              <Input id="pb-buyer" value={p.buyer} placeholder="e.g. H-E-B · San Antonio" onChange={(e) => update("buyer", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-headline">Headline</Label>
              <Input id="pb-headline" value={p.headline} placeholder="e.g. Authentic Italian Alpine cheese for your shelves" onChange={(e) => update("headline", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-intro">Introduction</Label>
              <Textarea id="pb-intro" rows={4} value={p.intro} placeholder="Two or three sentences. Why this range, why now." onChange={(e) => update("intro", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-deck">Story deck</Label>
              <select
                id="pb-deck"
                className="h-10 rounded-base border border-border bg-bg px-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                value={p.deckKey}
                onChange={(e) => update("deckKey", e.target.value)}
              >
                <option value="">No deck</option>
                {decks.map((d) => <option key={d.key} value={d.key}>{d.title} ({d.slides.length} slides)</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-tier">Class of trade (pricing)</Label>
              <select
                id="pb-tier"
                className="h-10 rounded-base border border-border bg-bg px-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                value={p.tierId}
                onChange={(e) => update("tierId", e.target.value)}
              >
                <option value="">No pricing shown</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.adjustPct >= 0 ? "+" : ""}{t.adjustPct}%)</option>)}
              </select>
              <p className="text-xs text-fg-muted">Prices quote live from the canonical price list — the link can never go stale.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-date">Date</Label>
              <Input id="pb-date" type="date" value={p.date} onChange={(e) => update("date", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>The range</CardTitle>
            <CardDescription>
              Pick the SKUs to feature — <Badge variant="brand">{p.skus.length} selected</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[65vh] space-y-5 overflow-y-auto">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <p className="cs-eyebrow mb-2 text-brand-primary">{cat}</p>
                <div className="space-y-1">
                  {items.map(({ product, sku }) => {
                    const checked = p.skus.includes(sku.code);
                    const img = skuImageUrl(config, sku, 80);
                    return (
                      <label
                        key={sku.code}
                        className={
                          "flex cursor-pointer items-center gap-3 rounded-base border p-2 transition-colors " +
                          (checked ? "border-brand-primary bg-bg" : "border-transparent hover:bg-bg")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSku(sku.code)}
                          className="h-4 w-4 accent-[var(--cs-color-brand-primary)]"
                        />
                        {img && <img src={img} alt="" loading="lazy" className="h-9 w-9 rounded-base border border-border bg-white object-contain" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{product.name}</span>
                          <span className="block truncate text-xs text-fg-muted">{sku.packing}</span>
                        </span>
                        <span className="font-mono text-xs text-fg-muted">#{sku.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
