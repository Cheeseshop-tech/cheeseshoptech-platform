import { useEffect, useMemo, useRef, useState } from "react";
import { Search, LayoutGrid, List, ExternalLink, Download, Link as LinkIcon, ImageOff, Pencil, Upload } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import {
  getBuyerCatalog, cldThumb, cldBig, cldView, cldDownload, fmtSize, fmtTotalSize,
} from "@/lib/catalog.js";
import { loadEdits, setEdit, applyEdits, exportEdits, parseEditsFile, saveEdits } from "@/lib/catalog-edits.js";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";

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

  return <BuyerCatalog data={data} brandName={resolved.brand.name} tenantId={resolved.id} />;
}

function BuyerCatalog({ data, brandName, tenantId }) {
  const { cloud } = data;
  const { toast } = useToast();
  const { user } = useAuth();
  const userRoles = rolesOf(user);
  // Catalog editing is a Manage feature (F3): CST admin + client-admin only.
  const canManage = userRoles.includes("admin") || userRoles.includes("client-admin");
  const [edits, setEdits] = useState(() => loadEdits(tenantId));
  const images = useMemo(() => applyEdits(data.images, edits), [data.images, edits]);
  const importRef = useRef(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("grid");
  const [active, setActive] = useState(null); // image id in the lightbox

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

  // Page the grid so the browser mounts ~30 images, not 100+ at once (the all-at-once
  // mount was flooding the network and stalling first paint). Reset to page 1 whenever the
  // filter/search changes; "Load more" reveals the next batch.
  const PAGE = 30;
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setShown(PAGE); }, [query, category, view]);
  const visible = filtered.slice(0, shown);

  const totalBytes = useMemo(() => images.reduce((s, im) => s + (im.size || 0), 0), [images]);

  function copyShareLink(im) {
    navigator.clipboard?.writeText(cldView(cloud, im)).then(
      () => toast({ title: "Share link copied", description: im.title, tone: "success" }),
      () => toast({ title: "Couldn't copy link", tone: "error" }),
    );
  }

  const activeIm = active ? images.find((i) => i.id === active) : null;

  function onEdit(imageId, field, value) {
    setEdits(setEdit(tenantId, edits, imageId, field, value));
  }

  function onImportFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const incoming = parseEditsFile(ev.target.result);
        const merged = saveEdits(tenantId, { ...edits, ...incoming });
        setEdits(merged);
        toast({ title: "Edits imported", description: `${Object.keys(incoming).length} item(s) merged.`, tone: "success" });
      } catch {
        toast({ title: "Couldn't import", description: "Not a valid edits file.", tone: "error" });
      }
    };
    reader.readAsText(f);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-fg">Image Catalog</h1>
          <p className="mt-1 text-fg-muted">{brandName} product library — search, preview, download, share.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button size="sm" variant="outline" onClick={() => exportEdits(tenantId, edits)} title="Download your edits as JSON (feeds the price-list workflow)">
                <Download className="h-4 w-4" /> Export edits{Object.keys(edits).length ? ` (${Object.keys(edits).length})` : ""}
              </Button>
              <Button size="sm" variant="outline" onClick={() => importRef.current?.click()} title="Import an edits JSON file">
                <Upload className="h-4 w-4" /> Import
              </Button>
              <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportFile} />
            </>
          )}
          <div className="flex gap-1 rounded-base border border-border p-1">
            <Button size="sm" variant={view === "grid" ? "primary" : "ghost"} onClick={() => setView("grid")} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" /> Grid
            </Button>
            <Button size="sm" variant={view === "list" ? "primary" : "ghost"} onClick={() => setView("list")} aria-label="List view">
              <List className="h-4 w-4" /> List
            </Button>
          </div>
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

      <p className="mb-4 text-sm text-fg-muted">
        {visible.length < filtered.length ? `Showing ${visible.length} of ${filtered.length}` : `${filtered.length} shown`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search term or clear the filter." />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((im) => (
            <Card
              key={im.id}
              onClick={() => setActive(im.id)}
              className="group cursor-pointer overflow-hidden p-0 transition-colors hover:border-brand-primary"
            >
              <div className="aspect-square w-full overflow-hidden bg-white">
                <img
                  src={cldThumb(cloud, im)}
                  alt={im.title}
                  loading="lazy"
                  width="360"
                  height="360"
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
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
          {visible.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setActive(im.id)}
              className={
                "flex w-full items-center gap-4 bg-surface p-3 text-left transition-colors hover:bg-bg " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <img src={cldThumb(cloud, im)} alt="" loading="lazy" width="48" height="48" className="h-12 w-12 shrink-0 rounded-base bg-white object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{im.title}</p>
                <p className="text-xs text-fg-muted">{im.category} · {im.ext?.toUpperCase()} · {fmtSize(im.size || 0)}</p>
              </div>
              {im.code && <Badge variant="muted" className="font-mono text-[10px]">{im.code}</Badge>}
            </button>
          ))}
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            Load more ({filtered.length - visible.length} left)
          </Button>
        </div>
      )}

      <Dialog open={!!activeIm} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-4xl p-0">
          {activeIm && (
            <div className="grid md:grid-cols-[1.4fr_1fr]">
              <div className="flex items-center justify-center bg-bg p-4 md:rounded-l-base">
                <img
                  src={cldBig(cloud, activeIm)}
                  alt={activeIm.title}
                  className="max-h-[70vh] w-auto max-w-full rounded-base object-contain"
                />
              </div>
              <div className="max-h-[78vh] overflow-y-auto p-6">
                <Badge variant="muted">{activeIm.category}</Badge>
                <h2 className="mt-2 font-heading text-2xl text-fg">{activeIm.title}</h2>
                <p className="mt-1 break-all text-xs text-fg-muted">{activeIm.orig}</p>
                {activeIm.description && <p className="mt-2 text-sm text-fg-muted">{activeIm.description}</p>}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs uppercase text-fg-muted">Format</dt><dd className="text-fg">{activeIm.ext?.toUpperCase()}</dd></div>
                  <div><dt className="text-xs uppercase text-fg-muted">Size</dt><dd className="text-fg">{fmtSize(activeIm.size || 0)}</dd></div>
                  <div><dt className="text-xs uppercase text-fg-muted">Modified</dt><dd className="text-fg">{activeIm.modified}</dd></div>
                  {activeIm.code && (
                    <div><dt className="text-xs uppercase text-fg-muted">Item code</dt><dd className="font-mono text-fg">{activeIm.code}</dd></div>
                  )}
                  {activeIm.cl_w && (
                    <div><dt className="text-xs uppercase text-fg-muted">Dimensions</dt><dd className="text-fg">{activeIm.cl_w} × {activeIm.cl_h}</dd></div>
                  )}
                </dl>
                {canManage && (
                  <div className="mt-5 rounded-base border border-border bg-bg p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
                      <Pencil className="h-3.5 w-3.5 text-brand-primary" /> Edit details
                      {edits[activeIm.id] && <Badge variant="accent">edited</Badge>}
                    </p>
                    <div className="space-y-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="edit-code">Item code</Label>
                        <Input
                          id="edit-code"
                          defaultValue={activeIm.code || ""}
                          placeholder="e.g. 03010"
                          onBlur={(e) => onEdit(activeIm.id, "code", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="edit-title">Display title</Label>
                        <Input
                          id="edit-title"
                          defaultValue={activeIm.title || ""}
                          onBlur={(e) => onEdit(activeIm.id, "title", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Textarea
                          id="edit-desc"
                          rows={3}
                          defaultValue={activeIm.description || ""}
                          placeholder="Short description (syncs with the master price list workflow via Export)"
                          onBlur={(e) => onEdit(activeIm.id, "description", e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-fg-muted">Saves automatically. Use Export edits to back up or hand off to the price-list workflow.</p>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="primary" onClick={() => window.open(cldView(cloud, activeIm), "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-4 w-4" /> View original
                  </Button>
                  <Button variant="secondary" onClick={() => window.open(cldDownload(cloud, activeIm), "_blank", "noopener,noreferrer")}>
                    <Download className="h-4 w-4" /> Download original
                  </Button>
                  <Button variant="ghost" onClick={() => copyShareLink(activeIm)}>
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
