// One shareable page per item: everything a partner needs to set a SKU up in their own system.
//
// WHY THIS EXISTS (Rick, 2026-09-17): onboarding one item at a distributor currently takes three
// or four emails — hunting through folders, downloading them, attaching images — and every round
// trip is a chance to send a stale spec sheet or the wrong packshot. A partner processing
// thousands of products can't absorb that. This replaces the whole exchange with one link: the
// rep pastes it into an email, and the buyer gets the current, canonical set, pulled live from
// Media Hub rather than from whatever was attached to a thread months ago.
//
// Deep link: ?client=<tenant>&page=onboarding&code=<item number>
//
// Contents are deliberately the "onboarding docs" tier only — main image, the identity/pack
// details, spec sheet, nutrition panel. Enrichment (long description, regional map, pairing
// guide) belongs to the fuller Onboarding Kit (docs/ONBOARDING_KIT_SPEC.md); none of it is needed
// to get an item into a partner's system, and none of it has content yet.
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Link as LinkIcon, FileText } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getBuyerCatalog, cldThumb, cldBig, cldView, cldDocUrl, cldDocDownload, cldDocThumb, fmtSize } from "@/lib/catalog.js";
import { loadItems, emptyDoc, getItem } from "@/lib/items.js";
import { usageLabel } from "@/lib/media.js";

/** The item number this page is for (?code=02091). */
function codeFromLocation() {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("code") || "").trim();
}

/**
 * Shareable URL for one item's onboarding docs — what the rep pastes into an email.
 * Built from the CURRENT location so it inherits whichever tenant param is already in play
 * (?client=<subdomain> on a tenant subdomain, ?app=1 on the house app) — callers don't have to
 * thread `resolved` through just to construct a link.
 */
export function onboardingUrl(code) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("page", "onboarding");
  url.searchParams.set("code", code);
  return url.toString();
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-32 flex-none text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-fg">{value}</dd>
    </div>
  );
}

/** A document (spec sheet / nutrition page) with a page preview, open and download. */
function DocCard({ title, note, thumb, viewHref, downloadHref, downloadName }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      {thumb ? (
        <a href={viewHref} target="_blank" rel="noreferrer" className="block border-b border-border bg-white">
          <img src={thumb} alt={title} loading="lazy" className="h-56 w-full object-contain" />
        </a>
      ) : (
        <div className="flex h-56 items-center justify-center border-b border-border bg-surface text-fg-muted">
          <FileText className="h-10 w-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          {note ? <p className="mt-0.5 text-xs text-fg-muted">{note}</p> : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={viewHref} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> View</a>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a href={downloadHref} download={downloadName}><Download className="h-4 w-4" /> Download</a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function OnboardingDocsPage({ resolved }) {
  const { toast } = useToast();
  const [code] = useState(codeFromLocation);
  const [itemsDoc, setItemsDoc] = useState(null);
  const catalog = useMemo(() => getBuyerCatalog(resolved), [resolved]);

  useEffect(() => {
    let alive = true;
    loadItems(resolved.cloudinaryFolder, resolved.id)
      .then((d) => { if (alive) setItemsDoc(d); })
      .catch(() => { if (alive) setItemsDoc(emptyDoc()); });
    return () => { alive = false; };
  }, [resolved.cloudinaryFolder, resolved.id]);

  const cloud = catalog?.cloud;
  const assets = useMemo(
    () => (catalog?.images || []).filter((im) => im.code && im.code === code),
    [catalog, code],
  );
  const photos = assets.filter((a) => a.kind !== "document");
  // Hero-tagged photo leads, matching the Buyer Catalog's own ordering.
  const ordered = [...photos].sort((a, b) => (b.usage?.includes("hero") ? 1 : 0) - (a.usage?.includes("hero") ? 1 : 0));
  const main = ordered[0];
  const alternates = ordered.slice(1);
  const specSheet = assets.find((a) => a.kind === "document" && a.docType === "spec-sheet");
  const item = getItem(itemsDoc, code);

  if (!code) {
    return <EmptyState icon={FileText} title="No item specified" description="This link needs an item number — add ?code=<item number> to the URL." />;
  }
  if (!catalog) {
    return <EmptyState icon={FileText} title="Catalog unavailable" description="The product manifest didn't load. Refresh, or check back shortly." />;
  }
  if (!main && !specSheet && !item) {
    return (
      <EmptyState
        icon={FileText}
        title={`Nothing on file for item ${code}`}
        description="No photo, spec sheet, or item record carries this item number yet. Check the number, or add the assets in Media Hub."
      />
    );
  }

  const name = item?.name || main?.title || `Item ${code}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(onboardingUrl(code));
      toast({ title: "Link copied", description: "Paste it into an email — it always serves the current files." });
    } catch {
      toast({ title: "Couldn't copy", description: "Copy the address from your browser's address bar instead.", tone: "warning" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-fg-muted">Onboarding docs</p>
          <h1 className="cs-display mt-1 text-2xl text-brand-primary">{name}</h1>
          <p className="mt-1 font-mono text-sm text-fg-muted">Item #{code}</p>
        </div>
        <Button variant="outline" onClick={copyLink}><LinkIcon className="h-4 w-4" /> Copy link</Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Main image — the packshot a partner puts on their own shelf listing. */}
        <Card className="overflow-hidden">
          {main ? (
            <>
              <a href={cldView(cloud, main)} target="_blank" rel="noreferrer" className="block bg-white">
                <img src={cldBig(cloud, main)} alt={main.title} className="h-72 w-full object-contain" />
              </a>
              <div className="flex flex-wrap items-center gap-2 p-4">
                <Button asChild size="sm" variant="secondary">
                  <a href={cldView(cloud, main)} download><Download className="h-4 w-4" /> Download image</a>
                </Button>
                {main.size ? <span className="text-xs text-fg-muted">{fmtSize(main.size)} · {main.cl_w}×{main.cl_h}</span> : null}
              </div>
            </>
          ) : (
            <div className="flex h-72 items-center justify-center bg-surface text-sm italic text-fg-muted">
              Photo coming soon
            </div>
          )}
        </Card>

        {/* Title card — the identity and pack facts a buyer keys into their own system. */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-fg">Product details</h2>
          {item ? (
            <dl className="mt-3 divide-y divide-border">
              <DetailRow label="Item number" value={code} />
              <DetailRow label="Pack size" value={item.packSize} />
              <DetailRow label="Weight" value={item.weight} />
              <DetailRow label="Milk type" value={item.milkType} />
              <DetailRow label="Age" value={item.minAge} />
              <DetailRow label="Certification" value={item.certification} />
              <DetailRow label="UPC" value={item.upc} />
            </dl>
          ) : (
            <p className="mt-3 text-sm italic text-fg-muted">No item record yet — add one in Media Hub → Items.</p>
          )}
          {item?.shortDescription ? (
            <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-fg">{item.shortDescription}</p>
          ) : null}
        </Card>
      </div>

      {/* Spec sheet + nutrition panel. Page 2 of every Monti Scheda IS the nutritional panel, so
          the producer's own approved values render directly — nothing is transcribed or composed. */}
      <h2 className="mt-8 text-sm font-semibold text-fg">Documents</h2>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        {specSheet ? (
          <>
            <DocCard
              title="Spec sheet"
              note="Producer-issued, full specification"
              thumb={cldDocThumb(cloud, specSheet, { page: 1, width: 500 })}
              viewHref={cldDocUrl(cloud, specSheet)}
              downloadHref={cldDocDownload(cloud, specSheet)}
              downloadName={`${code}-spec-sheet.pdf`}
            />
            <DocCard
              title="Nutrition panel"
              note="Page 2 of the spec sheet — the producer's own values"
              thumb={cldDocThumb(cloud, specSheet, { page: 2, width: 500 })}
              viewHref={cldDocUrl(cloud, specSheet)}
              downloadHref={cldDocDownload(cloud, specSheet)}
              downloadName={`${code}-nutrition.pdf`}
            />
          </>
        ) : (
          <Card className="p-5 sm:col-span-2">
            <p className="text-sm italic text-fg-muted">
              No spec sheet on file for this item yet. Upload the PDF in Media Hub tagged with this
              item number and it appears here — nutrition panel included.
            </p>
          </Card>
        )}
      </div>

      {alternates.length > 0 ? (
        <>
          <h2 className="mt-8 text-sm font-semibold text-fg">Alternate images</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {alternates.map((a) => (
              <Card key={a.id} className="overflow-hidden">
                <a href={cldView(cloud, a)} target="_blank" rel="noreferrer" className="block bg-white">
                  <img src={cldThumb(cloud, a)} alt={a.title} loading="lazy" className="aspect-square w-full object-contain" />
                </a>
                <div className="flex items-center justify-between gap-2 p-2.5">
                  {a.usage?.length ? <Badge variant="muted">{usageLabel(a.usage[0])}</Badge> : <span />}
                  <a href={cldView(cloud, a)} download className="text-fg-muted hover:text-fg" aria-label={`Download ${a.title}`}>
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <p className="mt-10 border-t border-border pt-4 text-xs text-fg-muted">
        These files are served live from the Media Hub — this link always shows the current
        approved version, so it never goes stale the way an emailed attachment does.
      </p>
    </div>
  );
}
