import { useEffect, useMemo, useState } from "react";
import { Search, LayoutGrid, List, ExternalLink, Download, Link as LinkIcon, ImageOff, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getBuyerCatalog, cldThumb, cldBig, cldView, cldDownload, fmtSize } from "@/lib/catalog.js";
import { loadEdits, applyEdits } from "@/lib/catalog-edits.js";
import { loadItems, listItems, specLine } from "@/lib/items.js";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";

// Buyer-facing PRODUCT CATALOG — ITEM-DRIVEN (Rick, 2026-07-04): the catalog MIRRORS the item
// numbers on the price list / item data (the Media Hub item-truth doc in Cloudinary,
// `{tenant}/copy/items.json`). One row per item; photos + short/long descriptions attach FROM
// Cloudinary. Items without photos still appear (the gap is visible, not hidden).
// Identity (name, item number, specs, copy) comes ONLY from the item record — never freehand,
// never a stale image title. Asset management stays in the Media Hub; this page is browse,
// search, and hand-off (view / download / share) — what a rep or buyer actually needs.
export function CatalogPage({ resolved }) {
  const data = getBuyerCatalog(resolved);

  return (
    <BuyerCatalog
      data={data}
      brandName={resolved.brand.name}
      tenantId={resolved.id}
      itemsFolder={resolved.cloudinaryFolder}
    />
  );
}

function BuyerCatalog({ data, brandName, tenantId, itemsFolder }) {
  const cloud = data?.cloud;
  const { toast } = useToast();
  const { user } = useAuth();
  const userRoles = rolesOf(user);
  const canManage = userRoles.includes("admin") || userRoles.includes("client-admin");

  // Item truth — the catalog's backbone. Photos are attachments, items are the rows.
  const [itemsDoc, setItemsDoc] = useState(null);
  useEffect(() => {
    let on = true;
    if (!itemsFolder) return undefined;
    loadItems(itemsFolder, tenantId).then((doc) => { if (on) setItemsDoc(doc); }).catch(() => {});
    return () => { on = false; };
  }, [itemsFolder]);

  // Images: canonical manifest + the legacy local-edits overlay (applied read-only so codes
  // Rick fixed by hand in the old editor still link; editing now lives in the Media Hub).
  const [edits] = useState(() => loadEdits(tenantId));
  const images = useMemo(() => applyEdits(data?.images || [], edits), [data, edits]);
  const imagesByCode = useMemo(() => {
    const map = {};
    images.forEach((im) => { if (im.code) (map[im.code] ||= []).push(im); });
    return map;
  }, [images]);

  // ROWS = the item list (mirrors the price list / item data). One row per item number.
  const rows = useMemo(() => {
    if (!itemsDoc) return null; // loading
    const mapped = listItems(itemsDoc).map((it) => ({ it, imgs: imagesByCode[it.sku] || [] }));
    // Product Catalog loads alphabetically by product NAME (2026-07-18, Rick asked for this) —
    // deliberately separate from listItems()'s own order (by item number/SKU), which the Media
    // Hub's Items tab still uses so it keeps mirroring the price sheet's row order.
    return mapped.sort((a, b) =>
      (a.it.name || "").localeCompare(b.it.name || "", undefined, { sensitivity: "base" })
    );
  }, [itemsDoc, imagesByCode]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("grid");
  const [active, setActive] = useState(null);   // active item number (sku)
  const [heroIdx, setHeroIdx] = useState(0);    // selected photo inside the lightbox

  const NO_PHOTO = "No photo yet";
  const categoryOf = (r) => r.imgs[0]?.category || NO_PHOTO;

  const categories = useMemo(() => {
    if (!rows) return [];
    const counts = {};
    rows.forEach((r) => { const c = categoryOf(r); counts[c] = (counts[c] || 0) + 1; });
    const names = Object.keys(counts).sort((a, b) => (a === NO_PHOTO) - (b === NO_PHOTO) || counts[b] - counts[a]);
    return ["All", ...names].map((c) => ({ name: c, count: c === "All" ? rows.length : counts[c] }));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "All" && categoryOf(r) !== category) return false;
      if (!q) return true;
      return [r.it.name, r.it.sku, r.it.shortDescription, r.it.longDescription, r.it.certification]
        .some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [rows, query, category]);

  // Page the grid so the browser mounts ~30 tiles at once, not the whole list.
  const PAGE = 30;
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setShown(PAGE); }, [query, category, view]);
  const visible = filtered.slice(0, shown);

  const withPhotos = useMemo(() => (rows || []).filter((r) => r.imgs.length).length, [rows]);
  const photoTotal = useMemo(() => (rows || []).reduce((s, r) => s + r.imgs.length, 0), [rows]);

  const activeRow = active && rows ? rows.find((r) => r.it.sku === active) : null;
  const hero = activeRow?.imgs[Math.min(heroIdx, Math.max(activeRow.imgs.length - 1, 0))] || null;
  const openItem = (sku) => { setActive(sku); setHeroIdx(0); };

  function copyShareLink(im, itName) {
    navigator.clipboard?.writeText(cldView(cloud, im)).then(
      () => toast({ title: "Share link copied", description: itName, tone: "success" }),
      () => toast({ title: "Couldn't copy link", tone: "error" }),
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-fg">Product Catalog</h1>
          <p className="mt-1 text-fg-muted">
            {brandName} products — mirrors the price-list item numbers; photos + copy from the Media Hub.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <Stat label="Items" value={rows ? String(rows.length) : "—"} />
        <Stat label="With photos" value={rows ? String(withPhotos) : "—"} />
        <Stat label="Photos" value={rows ? String(photoTotal) : "—"} />
      </div>

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <Input
          className="pl-9"
          placeholder="Search by product, item number, or description…"
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

      {rows && (
        <p className="mb-4 text-sm text-fg-muted">
          {visible.length < filtered.length ? `Showing ${visible.length} of ${filtered.length}` : `${filtered.length} shown`}
        </p>
      )}

      {!rows ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-base border border-border bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search term or clear the filter." />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ it, imgs }) => (
            <Card
              key={it.sku}
              onClick={() => openItem(it.sku)}
              className="group cursor-pointer overflow-hidden p-0 transition-colors hover:border-brand-primary"
            >
              <div className="aspect-square w-full overflow-hidden bg-white">
                {imgs[0] ? (
                  <img
                    src={cldThumb(cloud, imgs[0])}
                    alt={it.name || it.sku}
                    loading="lazy"
                    width="360"
                    height="360"
                    className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface text-fg-muted">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">No photo yet</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium text-fg">{it.name || it.sku}</h3>
                  <Badge variant="muted" className="shrink-0 font-mono text-[10px]">{it.sku}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {specLine(it) || it.shortDescription || categoryOf({ imgs })}
                </p>
                {imgs.length > 1 && (
                  <p className="mt-0.5 text-[10px] text-fg-muted">{imgs.length} photos</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-base border border-border">
          {visible.map(({ it, imgs }, i) => (
            <button
              key={it.sku}
              onClick={() => openItem(it.sku)}
              className={
                "flex w-full items-center gap-4 bg-surface p-3 text-left transition-colors hover:bg-bg " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              {imgs[0] ? (
                <img src={cldThumb(cloud, imgs[0])} alt="" loading="lazy" width="48" height="48" className="h-12 w-12 shrink-0 rounded-base bg-white object-contain" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-base bg-bg">
                  <ImageOff className="h-4 w-4 text-fg-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{it.name || it.sku}</p>
                <p className="truncate text-xs text-fg-muted">
                  {specLine(it) || it.shortDescription || "—"}
                  {imgs.length ? ` · ${imgs.length} photo${imgs.length === 1 ? "" : "s"}` : " · no photo"}
                </p>
              </div>
              <Badge variant="muted" className="font-mono text-[10px]">{it.sku}</Badge>
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

      <Dialog open={!!activeRow} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-4xl p-0">
          {activeRow && (
            <div className="grid md:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col bg-bg p-4 md:rounded-l-base">
                <div className="flex flex-1 items-center justify-center">
                  {hero ? (
                    <img
                      src={cldBig(cloud, hero)}
                      alt={activeRow.it.name || activeRow.it.sku}
                      className="max-h-[62vh] w-auto max-w-full rounded-base object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-24 text-fg-muted">
                      <ImageOff className="h-10 w-10" />
                      <p className="text-sm">No photo linked yet{canManage ? " — link one in Media Hub → asset editor" : ""}</p>
                    </div>
                  )}
                </div>
                {activeRow.imgs.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeRow.imgs.map((im, i) => (
                      <button
                        key={im.id}
                        onClick={() => setHeroIdx(i)}
                        className={
                          "h-14 w-14 overflow-hidden rounded-base border bg-white " +
                          (i === heroIdx ? "border-brand-primary ring-2 ring-brand-primary/30" : "border-border")
                        }
                      >
                        <img src={cldThumb(cloud, im)} alt="" className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="max-h-[78vh] overflow-y-auto p-6">
                {hero?.category && <Badge variant="muted">{hero.category}</Badge>}
                <h2 className="mt-2 font-heading text-2xl text-fg">{activeRow.it.name || activeRow.it.sku}</h2>
                {specLine(activeRow.it) && (
                  <p className="mt-1 text-sm text-fg-muted">{specLine(activeRow.it)}</p>
                )}
                {/* Copy comes from the item record (Media Hub → Cloudinary items.json). */}
                {activeRow.it.shortDescription && (
                  <p className="mt-3 text-sm text-fg">{activeRow.it.shortDescription}</p>
                )}
                {activeRow.it.longDescription && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">{activeRow.it.longDescription}</p>
                )}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs uppercase text-fg-muted">Item number</dt><dd className="font-mono text-fg">{activeRow.it.sku}</dd></div>
                  {activeRow.it.upc && (
                    <div><dt className="text-xs uppercase text-fg-muted">UPC</dt><dd className="font-mono text-fg">{activeRow.it.upc}</dd></div>
                  )}
                  {activeRow.it.certification && (
                    <div><dt className="text-xs uppercase text-fg-muted">Certification</dt><dd className="text-fg">{activeRow.it.certification}</dd></div>
                  )}
                  {hero && (
                    <>
                      <div><dt className="text-xs uppercase text-fg-muted">Format</dt><dd className="text-fg">{hero.ext?.toUpperCase()}</dd></div>
                      <div><dt className="text-xs uppercase text-fg-muted">Size</dt><dd className="text-fg">{fmtSize(hero.size || 0)}</dd></div>
                      {hero.cl_w && (
                        <div><dt className="text-xs uppercase text-fg-muted">Dimensions</dt><dd className="text-fg">{hero.cl_w} × {hero.cl_h}</dd></div>
                      )}
                    </>
                  )}
                </dl>
                {canManage && (
                  <p className="mt-4 text-xs text-fg-muted">
                    Identity + copy live in Media Hub → Items (<span className="font-mono">{activeRow.it.sku}</span>).
                    Link or unlink photos in the Media Hub asset editor.
                  </p>
                )}
                {hero && (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button variant="primary" onClick={() => window.open(cldView(cloud, hero), "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="h-4 w-4" /> View original
                    </Button>
                    <Button variant="secondary" onClick={() => window.open(cldDownload(cloud, hero), "_blank", "noopener,noreferrer")}>
                      <Download className="h-4 w-4" /> Download original
                    </Button>
                    <Button variant="secondary" onClick={() => {
                      // Same recipe as the Media Hub: fl_attachment forces download, f_png guarantees PNG.
                      const name = (activeRow.it.name || activeRow.it.sku).replace(/[^a-zA-Z0-9_-]+/g, "-");
                      const a = document.createElement("a");
                      a.href = `https://res.cloudinary.com/${cloud}/image/upload/fl_attachment:${name},f_png/${hero.cl_id}.png`;
                      a.click();
                    }}>
                      <Download className="h-4 w-4" /> Download PNG
                    </Button>
                    <Button variant="ghost" onClick={async () => {
                      // Native share sheet where available; the link is copied either way so it
                      // always rides along for paste-anywhere hand-off.
                      const url = cldView(cloud, hero);
                      if (navigator.share) {
                        try { await navigator.share({ title: activeRow.it.name || activeRow.it.sku, url }); } catch { /* cancelled */ }
                      }
                      copyShareLink(hero, activeRow.it.name || activeRow.it.sku);
                    }}>
                      <Share2 className="h-4 w-4" /> Share
                    </Button>
                    <Button variant="ghost" onClick={() => copyShareLink(hero, activeRow.it.name || activeRow.it.sku)}>
                      <LinkIcon className="h-4 w-4" /> Copy share link
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
