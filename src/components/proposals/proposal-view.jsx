import { useMemo } from "react";
import { Printer, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { DeckViewer } from "@/components/presentations/presentations-page.jsx";
import { getPricingData } from "@/lib/pricing.js";
import { quoteUnitPrice } from "@/lib/pricing-core.js";
import { proposalFromLocation, resolveSkus } from "@/lib/proposals.js";
import { codeImageUrl } from "@/lib/images.js";
import { getBrandKit } from "@/lib/brandKit.js";
import { getTheme, themeColors } from "@/lib/themes.js";
import { cldUrl } from "@/lib/cloudinary.js";

// Rendered proposal (v2) — what the buyer sees at the shared link (?page=proposal#p=…).
// Composed from the tenant's BRAND KIT (logo, imagery, story blocks, colors) and the selected
// THEME (which colors lead, density, cover + product layout — the fixed image-placement zones).
// Prices quote LIVE from the canonical price list, so a link can never drift. The kit is the
// single source; the theme is a register of it.
export function ProposalView({ resolved, proposal: given }) {
  const proposal = given || proposalFromLocation();
  const pricing = getPricingData(resolved);
  const config = pricing?.config;
  const kit = getBrandKit(resolved);

  const items = useMemo(
    () => (proposal && pricing ? resolveSkus(pricing.catalog, proposal.skus) : []),
    [proposal, pricing]
  );

  if (!proposal) {
    return <EmptyState icon={FileWarning} title="Proposal not found" description="This link is missing its proposal data. Ask the sender for a fresh link." />;
  }

  const theme = getTheme(proposal.themeId);
  const tc = themeColors(theme, kit);
  const deck = (resolved.presentations || []).find((d) => d.key === proposal.deckKey);
  const tier = config?.pricing?.tiers?.find((t) => t.id === proposal.tierId);
  const quoteOpts = { tierId: proposal.tierId, basis: config?.pricing?.costBasis };

  const stories = (kit?.storyBlocks || []).filter((b) => (proposal.storyKeys || []).includes(b.key));
  const logoId = kit?.identity?.logo?.primary;
  const heroId = kit?.imagery?.hero;
  const lifestyle = kit?.imagery?.lifestyle || [];
  // A fixed image-placement zone: render the Cloudinary image if present, else a composed brand
  // color block at the same dimensions — so spacing/composition holds even before assets exist.
  const Zone = ({ id, className, ratioFallback = "aspect-video" }) =>
    id ? (
      <img src={cldUrl(id, "hero")} alt="" className={`${className} object-cover`} onError={(e) => (e.currentTarget.style.display = "none")} />
    ) : (
      <div className={`${className} ${ratioFallback}`} style={{ background: `linear-gradient(150deg, ${tc.lead}, color-mix(in srgb, ${tc.lead} 55%, #000))` }} />
    );

  return (
    <div className="proposal-print mx-auto max-w-5xl" style={{ "--lead": tc.lead, "--ink": tc.ink }}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Badge variant="muted">{theme.name}</Badge>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / save PDF</Button>
      </div>

      {/* COVER — layout per theme. Logo zone (top), title zone, hero image zone. */}
      {theme.tokens.cover === "split" ? (
        <div className="grid overflow-hidden rounded-xl border border-border md:grid-cols-2">
          <div className="flex flex-col justify-center p-8" style={{ background: tc.cream }}>
            {logoId && <img src={cldUrl(logoId, "card")} alt={resolved.brand.name} className="mb-5 h-12 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <p className="cs-eyebrow" style={{ color: tc.lead }}>{resolved.brand.name} · {proposal.date}</p>
            <h1 className="cs-display mt-2 text-3xl md:text-4xl" style={{ color: tc.ink }}>{proposal.headline || `A proposal for ${proposal.buyer || "you"}`}</h1>
            {proposal.buyer && <p className="mt-3 text-lg" style={{ color: tc.ink }}>Prepared for {proposal.buyer}</p>}
          </div>
          <Zone id={heroId} className="min-h-[260px] w-full" ratioFallback="" />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl">
          <Zone id={heroId} className="h-[360px] w-full" ratioFallback="h-[360px]" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${tc.lead} 20%, transparent), color-mix(in srgb, ${tc.lead} 88%, #000))` }} />
          <div className="absolute inset-0 flex flex-col p-8 text-white">
            {logoId && <img src={cldUrl(logoId, "card")} alt={resolved.brand.name} className="h-11 w-auto self-start object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <div className="mt-auto">
              <p className="cs-eyebrow text-white/80">{resolved.brand.name} · {proposal.date}</p>
              <h1 className="cs-display mt-2 text-4xl md:text-5xl text-white">{proposal.headline || `A proposal for ${proposal.buyer || "you"}`}</h1>
              {proposal.buyer && <p className="mt-3 text-lg text-white/90">Prepared for {proposal.buyer}</p>}
            </div>
          </div>
        </div>
      )}

      {proposal.intro && (
        <p className="mx-auto mt-8 max-w-3xl whitespace-pre-line text-center font-heading text-xl leading-relaxed" style={{ color: tc.ink }}>{proposal.intro}</p>
      )}

      {/* STORY BLOCKS — alternating text / image-placement zones. */}
      {stories.length > 0 && (
        <div className="mt-12 space-y-10">
          {stories.map((b, i) => {
            const imgId = [heroId, ...lifestyle].filter(Boolean)[i % Math.max(1, [heroId, ...lifestyle].filter(Boolean).length)];
            const flip = i % 2 === 1;
            return (
              <div key={b.key} className={"grid items-center gap-6 md:grid-cols-2 " + (flip ? "md:[&>*:first-child]:order-2" : "")}>
                <Zone id={imgId} className="aspect-[4/3] w-full rounded-xl" />
                <div>
                  <h2 className="cs-display text-2xl" style={{ color: tc.lead }}>{b.title}</h2>
                  <p className="mt-3 leading-relaxed" style={{ color: tc.ink }}>{b.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deck && (
        <div className="mt-12 print:hidden">
          <h2 className="cs-display mb-4 text-2xl" style={{ color: tc.lead }}>The story deck</h2>
          <DeckViewer deck={deck} showBack={false} />
        </div>
      )}

      {/* RANGE — product layout per theme (image-left rows vs two-up grid with top image zone). */}
      {items.length > 0 && (
        <div className="mt-12">
          <h2 className="cs-display mb-1 text-2xl" style={{ color: tc.lead }}>The range</h2>
          <p className="mb-4 text-sm text-fg-muted">{items.length} selections{tier ? <> · <Badge variant="muted">{tier.label}</Badge></> : null}</p>

          {theme.tokens.product === "grid-two-up" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map(({ product, sku }) => {
                const img = codeImageUrl(resolved, config, sku.code, "card");
                const unit = config ? quoteUnitPrice(sku, quoteOpts, config) : null;
                return (
                  <div key={sku.code} className="overflow-hidden rounded-base border border-border">
                    {img ? <img src={img} alt="" loading="lazy" className="aspect-square w-full bg-white object-contain" /> : <div className="aspect-square w-full bg-bg" />}
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-lg" style={{ color: tc.ink }}>{product.name}</h3>
                        {product.marketing?.badge && <Badge variant="accent">{product.marketing.badge}</Badge>}
                      </div>
                      <p className="text-sm text-fg-muted">{sku.packing}</p>
                      {unit != null && <p className="mt-2 font-heading text-xl" style={{ color: tc.ink }}>${unit.toFixed(2)}<span className="text-sm text-fg-muted">/{sku.unit}</span></p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-base border border-border">
              {items.map(({ product, sku }, i) => {
                const img = codeImageUrl(resolved, config, sku.code, "card");
                const unit = config ? quoteUnitPrice(sku, quoteOpts, config) : null;
                return (
                  <div key={sku.code} className={"flex items-center gap-4 bg-surface p-4 " + (i > 0 ? "border-t border-border" : "")}>
                    {img ? <img src={img} alt="" loading="lazy" className="h-24 w-24 flex-none rounded-base border border-border bg-white object-contain" /> : <div className="h-24 w-24 flex-none rounded-base bg-bg" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg" style={{ color: tc.ink }}>{product.name}</h3>
                        {product.marketing?.badge && <Badge variant="accent">{product.marketing.badge}</Badge>}
                      </div>
                      <p className="text-sm text-fg-muted">{sku.packing}</p>
                      {product.marketing?.blurb && <p className="mt-1 hidden text-xs text-fg-muted sm:block">{product.marketing.blurb}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-fg-muted">#{sku.code}</p>
                      {unit != null && <p className="mt-1 font-heading text-xl" style={{ color: tc.ink }}>${unit.toFixed(2)}<span className="text-sm text-fg-muted">/{sku.unit}</span></p>}
                      {sku.pack?.netLb ? <p className="text-xs text-fg-muted">{sku.pack.netLb} lb net/case</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-fg-muted">
            Merchandise pricing only ({config?.pricing?.costBasis || "FOB"}); freight & handling quoted as separate line items at order time. Prices reflect the live {resolved.brand.name} price list as of today.
          </p>
        </div>
      )}

      {/* CLOSING — brand kit voice. */}
      <div className="mt-14 rounded-xl px-8 py-10 text-center" style={{ background: tc.lead, color: "#fff" }}>
        {kit?.voice?.motto && <p className="cs-display text-2xl">{kit.voice.motto}</p>}
        {kit?.voice?.heritage && <p className="mt-2 text-white/85">{kit.voice.heritage}</p>}
        <p className="cs-eyebrow mt-4 text-white/70">{resolved.brand.name} · Prepared with CheeseShop TECH</p>
      </div>
    </div>
  );
}
