import { useMemo, useState } from "react";
import { FileText, Link as LinkIcon, Eye, Trash2, FileX, Sparkles, Plus, Images } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getPricingData } from "@/lib/pricing.js";
import {
  emptyProposal, loadDraft, saveDraft, buildShareUrl, flattenSkus,
} from "@/lib/proposals.js";
import { codeImageUrl } from "@/lib/images.js";
import { getBrandKit, AUDIENCES, storyBlocksFor } from "@/lib/brandKit.js";
import { THEMES, getTheme } from "@/lib/themes.js";
import { MediaPicker } from "@/components/media/media-picker.jsx";
import { DeckComposer } from "@/components/presentations/presentations-page.jsx";
import { addEntry } from "@/lib/presentations-store.js";
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
  const [composeOpen, setComposeOpen] = useState(false);

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
        <h1 className="mb-1 font-heading text-3xl text-fg">Content Studio</h1>
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
  const kit = getBrandKit(resolved);
  // Story blocks suggested for the chosen audience (all if none chosen) — from the brand kit.
  const suggestedStories = storyBlocksFor(resolved, p.audience);
  function toggleStory(key) {
    update("storyKeys", p.storyKeys?.includes(key) ? p.storyKeys.filter((k) => k !== key) : [...(p.storyKeys || []), key]);
  }
  function setStoryImage(key, publicId) {
    update("storyImages", { ...(p.storyImages || {}), [key]: publicId });
  }
  // Story topics = brand-voice angles (from the kit) the seller can drop into the pitch. Clicking
  // one appends its line to the Introduction so the narrative starts in the brand's own voice.
  function addTopic(line) {
    const cur = (p.intro || "").trim();
    update("intro", cur ? `${cur}\n${line}` : line);
    toast({ title: "Added to introduction", tone: "success" });
  }

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
          <h1 className="font-heading text-3xl text-fg">Content Studio</h1>
          <p className="mt-1 text-fg-muted">
            Build a branded proposal from the live catalog — story deck, selections, and class-of-trade pricing.
          </p>
        </div>
        <div className="flex gap-2">
          {/* PARKED(ai-embed): an "Auto-compose" button would sit here, calling a Netlify
              ai-compose function that drafts this proposal from tags + story blocks.
              Held off 2026-06-16 by Rick. Spec: docs/AI_TOOL_EMBED_SPEC.md. Build Slice 2
              (deterministic composer) first; AI is the optional layer on top. */}
          <Button variant="ghost" size="sm" onClick={() => setP(saveDraft(resolved.id, emptyProposal()))}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
            <Images className="h-4 w-4" /> Compose deck
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
              <Label htmlFor="pb-audience">Audience</Label>
              <select
                id="pb-audience"
                className="h-10 rounded-base border border-border bg-bg px-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                value={p.audience}
                onChange={(e) => update("audience", e.target.value)}
              >
                <option value="">Any audience</option>
                {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <p className="text-xs text-fg-muted">Filters the brand story blocks to ones written for this buyer type.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-theme">Design theme</Label>
              <select
                id="pb-theme"
                className="h-10 rounded-base border border-border bg-bg px-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                value={p.themeId}
                onChange={(e) => update("themeId", e.target.value)}
              >
                {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.channel}</option>)}
              </select>
              <p className="text-xs text-fg-muted">{getTheme(p.themeId).register}. {getTheme(p.themeId).description}</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Cover image <span className="text-xs text-fg-muted">(from Media Hub)</span></Label>
              <MediaPicker resolved={resolved} value={p.heroImageId} defaultTag="hero" label="Choose a cover image" onChange={(id) => update("heroImageId", id)} />
              <p className="text-xs text-fg-muted">Overrides the brand-kit hero. Filter by tag (Hero, Lifestyle, Brand asset…); hover a thumbnail to preview.</p>
            </div>
            {kit?.storyBlocks?.length > 0 && (
              <div className="grid gap-1.5">
                <Label>Brand story blocks <span className="text-xs text-fg-muted">({p.storyKeys?.length || 0} selected)</span></Label>
                <div className="space-y-1">
                  {suggestedStories.map((b) => {
                    const on = p.storyKeys?.includes(b.key);
                    return (
                      <div key={b.key} className={"rounded-base border p-2 transition-colors " + (on ? "border-brand-primary bg-bg" : "border-transparent hover:bg-bg")}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <input type="checkbox" checked={on} onChange={() => toggleStory(b.key)} className="mt-0.5 h-4 w-4 accent-[var(--cs-color-brand-primary)]" />
                          <span><span className="font-medium text-fg">{b.title}</span><span className="ml-1 text-fg-muted">— {(b.audience || []).join(", ")}</span></span>
                        </label>
                        {on && (
                          <div className="mt-2 pl-6">
                            <MediaPicker resolved={resolved} value={p.storyImages?.[b.key]} defaultTag="story-block" label="Image for this block" onChange={(id) => setStoryImage(b.key, id)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="pb-deck">Story deck (optional)</Label>
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

        <div className="space-y-5">
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
                    const img = codeImageUrl(resolved, config, sku.code, "card");
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
                        {img && <img src={img} alt="" loading="lazy" className="h-12 w-12 flex-none rounded-base border border-border bg-white object-contain" />}
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

        {(kit?.storyTopics?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-primary" /> Story topics</CardTitle>
              <CardDescription>Brand-voice angles from {resolved.brand.name}. Click one to add it to the introduction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {kit.storyTopics.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => addTopic(t.line)}
                  className="group flex w-full items-start gap-2 rounded-base border border-transparent p-2 text-left transition-colors hover:border-brand-primary hover:bg-bg"
                >
                  <Plus className="mt-0.5 h-4 w-4 flex-none text-fg-muted group-hover:text-brand-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{t.title}</span>
                    <span className="block text-xs text-fg-muted">{t.line}</span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      <DeckComposer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        resolved={resolved}
        onSave={(entry) => { addEntry(resolved.id, entry); setComposeOpen(false); toast({ title: "Deck saved to Content Library", tone: "success" }); }}
      />
    </div>
  );
}
