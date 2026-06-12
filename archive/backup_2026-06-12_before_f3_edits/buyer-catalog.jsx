import { useMemo, useState } from "react";
import { Search, LayoutGrid, List, ExternalLink, Download, Link as LinkIcon, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import {
  getBuyerCatalog, cldThumb, cldBig, cldView, cldDownload, fmtSize, fmtTotalSize,
} from "@/lib/catalog.js";

// Buyer-facing product image catalog — the platform port of the standalone
// monti-trentini-catalog app (Phase B of DEVELOPMENT_PLAN.md). Generic: any tenant with a
// buyer-catalog bundle (see lib/catalog.js) gets this page, themed by its own tokens.
// Asset *management* (upload, tag, sync) stays in the Media hub; this page is for browsing,
// search, and hand-off (view / download / share) — what a rep or buyer actually needs.
export function CatalogPage({ resolved }) {
  const data = getBuyerCatalog(resolved);

  if (!data || !data.images?.length) {
    return (
      <div>
        <h1 className="mb-1 font-heading text-3xl text-fg">Catalog</h1>
        <p className="mb-6 text-fg-muted">Product image library for {resolved.brand.name}.</p>
        <EmptyState
          icon={ImageOff}
          title="No catalog configured"
          description="This tenant doesn't have a buyer-facing image catalog yet. Add a buyer-catalog bundle to enable it."
        />
      </div>
    );
  }

  return <BuyerCatalog data={data} brandName={resolved.brand.name} />;
}

function BuyerCatalog({ data, brandName }) {
  const { cloud, images } = data;
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("grid");
  const [active, setActive] = useState(null); // image in the lightbox

  const categories = useMemo(() => {
    const counts = {};
    images.forEach((im) => { counts[im.category] = (counts[im.category] || 0) + 1; });
    return ["All", ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])].map((c) => ({
      name: c,
      count: c === "All" ? images.length : counts[c],
    }));
  }, [images]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return images.filter((im) => {
      if (category !== "All" && im.category !== category) return false;
      if (!q) return true;
      return [im.title, im.code, im.orig, im.category].some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [images, query, category]);

  const totalBytes = useMemo(() => images.reduce((s, im) => s + (im.size || 0), 0), [images]);

  function copyShareLink(im) {
    navigator.clipboard?.writeText(cldView(cloud, im)).then(
      () => toast({ title: "Share link copied", description: im.title, tone: "success" }),
      () => toast({ title: "Couldn't copy link", tone: "error" }),
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-fg">Image Catalog</h1>
          <p className="mt-1 text-fg-muted">{brandName} product library — search, preview, download, share.</p>
        </div>
        <div className="flex gap-1 rounded-base border border-border p-1">
          <Button size="sm" variant={view === "grid" ? "primary" : "ghost"} onClick={() => setView("grid")} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" /> Grid
          </Button>
          <Button size="sm" variant={view === "list" ? "primary" : "ghost"} onClick={() => setView("list")} aria-label="List view">
            <List className="h-4 w-4" /> List
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Images" value={String(images.length)} />
        <Stat label="Categories" value={String(categories.length - 1)} />
        <Stat label="Library size" value={fmtTotalSize(totalBytes)} />
      </div>

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <Input
          className="pl-9"
          placeholder="Search by name, code, or filename…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search catalog"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => setCategory(c.name)}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (category === c.name
                ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                : "border-border bg-surface text-fg-muted hover:border-brand-primary hover:text-fg")
            }
          >
            {c.name} <span className="opacity-70">{c.count}</span>
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-fg-muted">{filtered.length} shown</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search term or clear the filter." />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((im) => (
            <Card
              key={im.id}
              onClick={() => setActive(im)}
              className="group cursor-pointer overflow-hidden p-0 transition-colors hover:border-brand-primary"
            >
              <div className="aspect-square w-full overflow-hidden bg-bg">
                <img
                  src={cldThumb(cloud, im)}
                  alt={im.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium text-fg">{im.title}</h3>
                  {im.code && <Badge variant="muted" className="shrink-0 font-mono text-[10px]">{im.code}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-fg-muted">{im.category}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-base border border-border">
          {filtered.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setActive(im)}
              className={
                "flex w-full items-center gap-4 bg-surface p-3 text-left transition-colors hover:bg-bg " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <img src={cldThumb(cloud, im)} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-base object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{im.title}</p>
                <p className="text-xs text-fg-muted">{im.category} · {im.ext?.toUpperCase()} · {fmtSize(im.size || 0)}</p>
              </div>
              {im.code && <Badge variant="muted" className="font-mono text-[10px]">{im.code}</Badge>}
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-4xl p-0">
          {active && (
            <div className="grid md:grid-cols-[1.4fr_1fr]">
              <div className="flex items-center justify-center bg-bg p-4 md:rounded-l-base">
                <img
                  src={cldBig(cloud, active)}
                  alt={active.title}
                  className="max-h-[70vh] w-auto max-w-full rounded-base object-contain"
                />
              </div>
              <div className="p-6">
                <Badge variant="muted">{active.category}</Badge>
                <h2 className="mt-2 font-heading text-2xl text-fg">{active.title}</h2>
                <p className="mt-1 break-all text-xs text-fg-muted">{active.orig}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs uppercase text-fg-muted">Format</dt><dd className="text-fg">{active.ext?.toUpperCase()}</dd></div>
                  <div><dt className="text-xs uppercase text-fg-muted">Size</dt><dd className="text-fg">{fmtSize(active.size || 0)}</dd></div>
                  <div><dt className="text-xs uppercase text-fg-muted">Modified</dt><dd className="text-fg">{active.modified}</dd></div>
                  {active.code && (
                    <div><dt className="text-xs uppercase text-fg-muted">Item code</dt><dd className="font-mono text-fg">{active.code}</dd></div>
                  )}
                  {active.cl_w && (
                    <div><dt className="text-xs uppercase text-fg-muted">Dimensions</dt><dd className="text-fg">{active.cl_w} × {active.cl_h}</dd></div>
                  )}
                </dl>
                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="primary" onClick={() => window.open(cldView(cloud, active), "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-4 w-4" /> View original
                  </Button>
                  <Button variant="secondary" onClick={() => window.open(cldDownload(cloud, active), "_blank", "noopener,noreferrer")}>
                    <Download className="h-4 w-4" /> Download original
                  </Button>
                  <Button variant="ghost" onClick={() => copyShareLink(active)}>
                    <LinkIcon className="h-4 w-4" /> Copy share link
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
