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

// Rendered proposal (F4) — what the buyer sees at the shared link (?page=proposal#p=…).
// Branded by the tenant's tokens; prices are quoted LIVE from the canonical data layer at
// render time, so a proposal link can never drift from the price list.
export function ProposalView({ resolved, proposal: given }) {
  const proposal = given || proposalFromLocation();
  const pricing = getPricingData(resolved);
  const config = pricing?.config;

  const items = useMemo(
    () => (proposal && pricing ? resolveSkus(pricing.catalog, proposal.skus) : []),
    [proposal, pricing]
  );

  if (!proposal) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Proposal not found"
        description="This link is missing its proposal data. Ask the sender for a fresh link."
      />
    );
  }

  const deck = (resolved.presentations || []).find((d) => d.key === proposal.deckKey);
  const tier = config?.pricing?.tiers?.find((t) => t.id === proposal.tierId);
  const quoteOpts = { tierId: proposal.tierId, basis: config?.pricing?.costBasis };
  const onPrimary = "var(--cs-color-on-primary)";

  return (
    <div className="proposal-print mx-auto max-w-5xl">
      <div className="mb-4 flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / save PDF
        </Button>
      </div>

      <div
        className="relative overflow-hidden rounded-xl px-8 py-10"
        style={{
          background:
            "linear-gradient(160deg, var(--cs-color-brand-primary), color-mix(in srgb, var(--cs-color-brand-primary) 55%, #000))",
          color: onPrimary,
        }}
      >
        <p className="cs-eyebrow" style={{ color: "color-mix(in srgb, var(--cs-color-on-primary) 75%, transparent)" }}>
          {resolved.brand.name} · {proposal.date}
        </p>
        <h1 className="cs-display mt-3 text-4xl md:text-5xl" style={{ color: onPrimary }}>
          {proposal.headline || `A proposal for ${proposal.buyer || "you"}`}
        </h1>
        {proposal.buyer && (
          <p className="mt-3 text-lg" style={{ color: "color-mix(in srgb, var(--cs-color-on-primary) 85%, transparent)" }}>
            Prepared for {proposal.buyer}
          </p>
        )}
      </div>

      {proposal.intro && (
        <p className="mx-auto mt-8 max-w-3xl whitespace-pre-line text-center font-heading text-xl leading-relaxed text-fg">
          {proposal.intro}
        </p>
      )}

      {deck && (
        <div className="mt-10 print:hidden">
          <h2 className="cs-display mb-4 text-2xl text-brand-primary">The story</h2>
          <DeckViewer deck={deck} showBack={false} />
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-10">
          <h2 className="cs-display mb-1 text-2xl text-brand-primary">The range</h2>
          <p className="mb-4 text-sm text-fg-muted">
            {items.length} selections{tier ? <> · <Badge variant="muted">{tier.label}</Badge></> : null}
          </p>
          <div className="overflow-hidden rounded-base border border-border">
            {items.map(({ product, sku }, i) => {
              const img = codeImageUrl(resolved, config, sku.code, "card");
              const unit = config ? quoteUnitPrice(sku, quoteOpts, config) : null;
              return (
                <div
                  key={sku.code}
                  className={"flex items-center gap-4 bg-surface p-4 " + (i > 0 ? "border-t border-border" : "")}
                >
                  {img ? (
                    <img src={img} alt="" loading="lazy" className="h-20 w-20 flex-none rounded-base border border-border bg-white object-contain" />
                  ) : (
                    <div className="h-20 w-20 flex-none rounded-base bg-bg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg text-fg">{product.name}</h3>
                      {product.marketing?.badge && <Badge variant="accent">{product.marketing.badge}</Badge>}
                    </div>
                    <p className="text-sm text-fg-muted">{sku.packing}</p>
                    {product.marketing?.blurb && (
                      <p className="mt-1 hidden text-xs text-fg-muted sm:block">{product.marketing.blurb}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-fg-muted">#{sku.code}</p>
                    {unit != null && (
                      <p className="mt-1 font-heading text-xl text-fg">
                        ${unit.toFixed(2)}<span className="text-sm text-fg-muted">/{sku.unit}</span>
                      </p>
                    )}
                    {sku.pack?.netLb ? <p className="text-xs text-fg-muted">{sku.pack.netLb} lb net/case</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            Merchandise pricing only ({config?.pricing?.costBasis || "FOB"}); freight & handling quoted as separate line
            items at order time. Prices reflect the live {resolved.brand.name} price list as of today.
          </p>
        </div>
      )}

      <div className="mt-12 border-t border-border pt-5 text-center">
        <p className="cs-display text-lg text-brand-primary">{resolved.brand.name}</p>
        <p className="cs-eyebrow mt-1 text-fg-muted">Prepared with CheeseShop TECH</p>
      </div>
    </div>
  );
}
