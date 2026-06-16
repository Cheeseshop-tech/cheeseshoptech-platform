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
import { getTheme, themeColors, themeSpec } from "@/lib/themes.js";
import { cldUrl } from "@/lib/cloudinary.js";

// Rendered proposal (v2) — what the buyer sees at the shared link (?page=proposal#p=…).
// Composed from the tenant's BRAND KIT (logo, imagery, story blocks, colors) and the selected
// THEME (which colors lead, density, type register, cover + product layout — the fixed
// image-placement zones). Prices quote LIVE from the canonical price list, so a link can never
// drift. The kit is the single source; the theme is a register of it.
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
  const sp = themeSpec(theme);
  const deck = (resolved.presentations || []).find((d) => d.key === proposal.deckKey);
  const tier = config?.pricing?.tiers?.find((t) => t.id === proposal.tierId);
  const quoteOpts = { tierId: proposal.tierId, basis: config?.pricing?.costBasis };

  // tc.lead = the color that LEADS filled surfaces; tc.onCanvas = the legible color for type
  // (equals lead for dark/colored leads; equals the primary brand color for a light "cream" lead
  // so headings stay readable). A "cream"-led theme leads with a light canvas.
  const leadIsLight = theme.tokens.lead === "cream";

  const stories = (kit?.storyBlocks || []).filter((b) => (proposal.storyKeys || []).includes(b.key));
  const logoId = kit?.identity?.logo?.primary;
  // Media Hub picks override brand-kit defaults: the proposal can set its own cover (heroImageId)
  // and per-story images (storyImages[key]); fall back to the kit when unset.
  const heroId = proposal.heroImageId || kit?.imagery?.hero;
  const lifestyle = kit?.imagery?.lifestyle || [];
  // A fixed image-placement zone: a composed brand color block is ALWAYS the backdrop (so the
  // composition/spacing holds even before assets exist or if an image 404s), with the Cloudinary
  // image layered on top when it loads. The zone is tinted with onCanvas so a light-led theme still
  // gets a composed (green) placeholder rather than an invisible one.
  const Zone = ({ id, className }) => (
    <div className={`${className} relative overflow-hidden`} style={{ background: `linear-gradient(150deg, ${tc.onCanvas}, color-mix(in srgb, ${tc.onCanvas} 55%, #000))` }}>
      {id && <img src={cldUrl(id, "hero")} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => e.currentTarget.remove()} />}
    </div>
  );

  return (
    <div className={`proposal-print mx-auto ${sp.measure}`} style={{ "--lead": tc.onCanvas, "--ink": tc.ink }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Badge variant="muted">{theme.name}</Badge>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-fg-muted sm:inline">Save as PDF, then upload it in <b>Content Library</b> to share &amp; email.</span>
          <Button variant="primary" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Export PDF</Button>
        </div>
      </div>

      {/* COVER — composition per theme. */}
      {theme.tokens.cover === "minimal" ? (
        // MINIMAL — premium, gallery-quiet: centered title on the cream canvas, lots of air, a
        // thin rule, no dominant photo. Restraint signals quality.
        <div className={`flex flex-col items-center rounded-xl border border-border text-center ${sp.coverPad} py-16`} style={{ background: tc.cream }}>
          {logoId && <img src={cldUrl(logoId, "card")} alt={resolved.brand.name} className="mb-6 h-14 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
          <p className={sp.eyebrow} style={{ color: tc.onCanvas }}>{resolved.brand.name} · {proposal.date}</p>
          <h1 className={`${sp.coverTitle} mt-3`} style={{ color: tc.onCanvas }}>{proposal.headline || `A proposal for ${proposal.buyer || "you"}`}</h1>
          <div className="mt-6 h-px w-24" style={{ background: tc.onCanvas, opacity: 0.5 }} />
          {proposal.buyer && <p className="mt-6 text-lg" style={{ color: tc.ink }}>Prepared for {proposal.buyer}</p>}
        </div>
      ) : theme.tokens.cover === "split" ? (
        // SPLIT — title block on cream, hero image zone alongside.
        <div className="grid overflow-hidden rounded-xl border border-border md:grid-cols-2">
          <div className={`flex flex-col justify-center ${sp.coverPad}`} style={{ background: tc.cream }}>
            {logoId && <img src={cldUrl(logoId, "card")} alt={resolved.brand.name} className="mb-5 h-12 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <p className={sp.eyebrow} style={{ color: tc.onCanvas }}>{resolved.brand.name} · {proposal.date}</p>
            <h1 className={`${sp.coverTitle} mt-2`} style={{ color: tc.ink }}>{proposal.headline || `A proposal for ${proposal.buyer || "you"}`}</h1>
            {proposal.buyer && <p className="mt-3 text-lg" style={{ color: tc.ink }}>Prepared for {proposal.buyer}</p>}
          </div>
          <Zone id={heroId} className="min-h-[260px] w-full"/>
        </div>
      ) : (
        // HERO-OVERLAY — full-bleed hero zone, title overlaid lower. Darkens with the lead color.
        <div className="relative overflow-hidden rounded-xl">
          <Zone id={heroId} className={`${sp.coverH} w-full`}/>
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${tc.lead} 20%, transparent), color-mix(in srgb, ${tc.lead} 88%, #000))` }} />
          <div className={`absolute inset-0 flex flex-col text-white ${sp.coverPad}`}>
            {logoId && <img src={cldUrl(logoId, "card")} alt={resolved.brand.name} className="h-11 w-auto self-start object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <div className="mt-auto">
              <p className={`${sp.eyebrow} text-white/80`}>{resolved.brand.name} · {proposal.date}</p>
              <h1 className={`${sp.coverTitle} mt-2 text-white`}>{proposal.headline || `A proposal for ${proposal.buyer || "you"}`}</h1>
              {proposal.buyer && <p className="mt-3 text-lg text-white/90">Prepared for {proposal.buyer}</p>}
            </div>
          </div>
        </div>
      )}

      {proposal.intro && (
        <p className={`mx-auto whitespace-pre-line text-center font-heading leading-relaxed ${sp.intro}`} style={{ color: tc.ink }}>{proposal.intro}</p>
      )}

      {/* STORY BLOCKS — alternating text / image-placement zones. */}
      {stories.length > 0 && (
        <div className={`${sp.section} ${sp.storyGap}`}>
          {stories.map((b, i) => {
            const pool = [heroId, ...lifestyle].filter(Boolean);
            const imgId = proposal.storyImages?.[b.key] || pool[i % Math.max(1, pool.length)];
            const flip = i % 2 === 1;
            return (
              <div key={b.key} className={"grid items-center gap-6 md:grid-cols-2 " + (flip ? "md:[&>*:first-child]:order-2" : "")}>
                <Zone id={imgId} className="aspect-[4/3] w-full rounded-xl" />
                <div>
                  <h2 className={`${sp.heading} text-2xl`} style={{ color: tc.onCanvas }}>{b.title}</h2>
                  <p className="mt-3 leading-relaxed" style={{ color: tc.ink }}>{b.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deck && (
        <div className={`${sp.section} print:hidden`}>
          <h2 className={`${sp.heading} mb-4 text-2xl`} style={{ color: tc.onCanvas }}>The story deck</h2>
          <DeckViewer deck={deck} showBack={false} />
        </div>
      )}

      {/* RANGE — product layout per theme. */}
      {items.length > 0 && (
        <div className={sp.section}>
          <h2 className={`${sp.heading} mb-1 text-2xl`} style={{ color: tc.onCanvas }}>The range</h2>
          <p className="mb-4 text-sm text-fg-muted">{items.length} selections{tier ? <> · <Badge variant="muted">{tier.label}</Badge></> : null}</p>

          {theme.tokens.product === "grid-three-up" ? (
            // GRID-THREE-UP — premium gallery: small quiet cards, image-forward, lots of air.
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(({ product, sku }) => {
                const img = codeImageUrl(resolved, config, sku.code, "card");
                const unit = config ? quoteUnitPrice(sku, quoteOpts, config) : null;
                return (
                  <div key={sku.code} className="overflow-hidden rounded-base border border-border">
                    {img ? <img src={img} alt="" loading="lazy" className="aspect-square w-full bg-white object-contain" /> : <div className="aspect-square w-full bg-bg" />}
                    <div className="p-3 text-center">
                      <h3 className="font-heading text-base" style={{ color: tc.ink }}>{product.name}</h3>
                      <p className="text-xs text-fg-muted">{sku.packing}</p>
                      {unit != null && <p className="mt-1 font-heading text-lg" style={{ color: tc.ink }}>${unit.toFixed(2)}<span className="text-xs text-fg-muted">/{sku.unit}</span></p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : theme.tokens.product === "grid-two-up" ? (
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
          ) : theme.tokens.product === "list-compact" ? (
            // LIST-COMPACT — distributor range table: thumb + name + code + pack + live price,
            // dense rows, the full line scannable at a glance.
            <div className="overflow-hidden rounded-base border border-border">
              <div className="flex items-center gap-3 border-b border-border bg-bg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <span className="w-10" />
                <span className="flex-1">Product</span>
                <span className="hidden w-24 sm:block">Pack</span>
                <span className="w-20 text-right">Code</span>
                <span className="w-24 text-right">Price</span>
              </div>
              {items.map(({ product, sku }, i) => {
                const img = codeImageUrl(resolved, config, sku.code, "card");
                const unit = config ? quoteUnitPrice(sku, quoteOpts, config) : null;
                return (
                  <div key={sku.code} className={"flex items-center gap-3 bg-surface px-3 py-2 " + (i > 0 ? "border-t border-border" : "")}>
                    {img ? <img src={img} alt="" loading="lazy" className="h-10 w-10 flex-none rounded-base border border-border bg-white object-contain" /> : <div className="h-10 w-10 flex-none rounded-base bg-bg" />}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <h3 className="truncate font-heading text-sm" style={{ color: tc.ink }}>{product.name}</h3>
                      {product.marketing?.badge && <Badge variant="accent">{product.marketing.badge}</Badge>}
                    </div>
                    <span className="hidden w-24 text-xs text-fg-muted sm:block">{sku.packing}</span>
                    <span className="w-20 text-right font-mono text-xs text-fg-muted">#{sku.code}</span>
                    <span className="w-24 text-right font-heading text-sm" style={{ color: tc.ink }}>{unit != null ? <>${unit.toFixed(2)}<span className="text-fg-muted">/{sku.unit}</span></> : "—"}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            // IMAGE-LEFT — editorial rows: large image, name, blurb, code + price.
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

      {/* CLOSING — brand kit voice. Light-led themes close on cream with ink type; otherwise the
          lead color fills with white type. */}
      <div className={`mt-14 rounded-xl px-8 py-10 text-center ${leadIsLight ? "border border-border" : ""}`} style={{ background: leadIsLight ? tc.cream : tc.lead, color: leadIsLight ? tc.onCanvas : "#fff" }}>
        {kit?.voice?.motto && <p className={`${sp.heading} text-2xl`}>{kit.voice.motto}</p>}
        {kit?.voice?.heritage && <p className="mt-2" style={{ color: leadIsLight ? tc.ink : "rgba(255,255,255,0.85)" }}>{kit.voice.heritage}</p>}
        <p className={`${sp.eyebrow} mt-4`} style={{ color: leadIsLight ? tc.onCanvas : "rgba(255,255,255,0.7)" }}>{resolved.brand.name} · Prepared with CheeseShop TECH</p>
      </div>
    </div>
  );
}
