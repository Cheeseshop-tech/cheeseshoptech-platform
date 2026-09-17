import { useEffect, useMemo, useState } from "react";
import { Search, LayoutGrid, List, ExternalLink, Download, Link as LinkIcon, ImageOff, Share2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getBuyerCatalog, cldThumb, cldBig, cldView, cldDownload, cldDocUrl, cldDocDownload, cldDocThumb, fmtSize } from "@/lib/catalog.js";
import { onboardingUrl } from "@/components/catalog/onboarding-docs-page.jsx";
import { loadEdits, applyEdits } from "@/lib/catalog-edits.js";
import { loadItems, listItems, specLine } from "@/lib/items.js";
import { usageLabel } from "@/lib/media.js";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";
import { CATEGORY_ORDER, categoryForItem } from "@/lib/catalog-categories.js";

// Which usage tag, if any, is worth a small caption under a multi-photo lightbox thumbnail
// (2026-09-17, media-roles-and-spec-sheets Gap 2) — priority order so a photo with several tags
// shows the most buyer-relevant one. "product-catalog" itself is never shown (every photo here
// already has it; it says nothing about which one this is).
const ALT_PHOTO_LABEL_PRIORITY = [
  "hero", "back-shot", "unwrapped", "map-reference", "food-styling", "social", "lifestyle",
];
function altPhotoLabel(usage) {
  const id = ALT_PHOTO_LABEL_PRIORITY.find((u) => usage?.includes(u));
  return id ? usageLabel(id) : null;
}

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
    // 2026-09-17 (Gap 3): documents (spec-sheet PDFs) are excluded here -- they'd otherwise land
    // in imgs[0] and every photo-shaped call site (grid thumbnail, lightbox hero/strip) would
    // try to render a PDF as an <img>. See docsByCode below for where they actually go.
    images.forEach((im) => { if (im.code && im.kind !== "document") (map[im.code] ||= []).push(im); });
    // Hero-first ordering (2026-09-17, media-roles-and-spec-sheets Gap 1): an item's `hero`-
    // tagged photo becomes the card thumbnail + lightbox default, regardless of Cloudinary
    // listing order. Purely additive — a code with no `hero` tag keeps today's first-listed-wins
    // behavior (stable sort leaves untagged photos in their original order).
    Object.values(map).forEach((imgs) => {
      imgs.sort((a, b) => (b.usage?.includes("hero") ? 1 : 0) - (a.usage?.includes("hero") ? 1 : 0));
    });
    return map;
  }, [images]);

  // Spec sheets / documents (2026-09-17, Gap 3) -- kept separate from imagesByCode so the photo
  // grid/lightbox never has to guard against a PDF landing in imgs[0]. Rendered as a small
  // download list in the lightbox detail pane instead.
  const docsByCode = useMemo(() => {
    const map = {};
    images.forEach((im) => { if (im.code && im.kind === "document") (map[im.code] ||= []).push(im); });
    return map;
  }, [images]);

  // ROWS = the item list (mirrors the price list / item data). One row per item number.
  const rows = useMemo(() => {
    if (!itemsDoc) return null; // loading
    const mapped = listItems(itemsDoc).map((it) => ({ it, imgs: imagesByCode[it.sku] || [], docs: docsByCode[it.sku] || [] }));
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
  // Lightbox viewer pane: photos, or the item's documents (Rick, 2026-09-17 — "I want the
  // thumbnail view with an option to download or copy link, so a spec sheet tab, in the same
  // item window"). Documents used to be a text link in the detail column, which read as fine
  // print rather than something you could look at.
  const [pane, setPane] = useState("photos"); // "photos" | "docs"
  const [docPageIdx, setDocPageIdx] = useState(0);
  // Document pages whose raster came back 404 — dropped from the strip so a PDF with fewer
  // pages than assumed degrades to what it actually has instead of showing a broken tile.
  const [failedPages, setFailedPages] = useState(() => new Set());
  const markPageFailed = (doc, page) =>
    setFailedPages((prev) => new Set(prev).add(`${doc.id}#${page}`));

  // Category = the item's pack format (7 oz wedge, whole wheel, ...), not the photo's Cloudinary
  // folder — see lib/catalog-categories.js for why. Tab order is CATEGORY_ORDER, fixed, not
  // sorted by count, so "Cut & Wrap" always leads; a category with zero items in this
  // tenant's catalog just doesn't get a tab.
  const categoryOf = (r) => categoryForItem(r.it);

  const categories = useMemo(() => {
    if (!rows) return [];
    const counts = {};
    rows.forEach((r) => { const c = categoryOf(r); counts[c] = (counts[c] || 0) + 1; });
    const names = CATEGORY_ORDER.filter((c) => counts[c]);
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
  const openItem = (sku) => { setActive(sku); setHeroIdx(0); setPane("photos"); setDocPageIdx(0); };

  // Every viewable PAGE of every document on this item, flattened — a Scheda contributes its spec
  // sheet and its nutrition panel as two browsable thumbnails.
  //
  // Page 2 is offered for SPEC SHEETS ONLY, because a Monti Scheda's page 2 always IS its
  // nutritional panel — verified across all 15 on file. Cloudinary's resource LIST endpoint does
  // not return a page count (only the per-resource detail call does), so there's nothing to test
  // against without an extra API round trip per document; `failedPages` below covers the case
  // where a page genuinely isn't there, by dropping the thumbnail when its render 404s.
  // Only image-type PDFs can be rasterized at all — cldDocThumb returns "" for a legacy raw one.
  const docPages = useMemo(() => {
    const out = [];
    for (const doc of activeRow?.docs || []) {
      const isSpec = doc.docType === "spec-sheet";
      out.push({ doc, page: 1, label: isSpec ? "Spec sheet" : (doc.title || "Document") });
      if (isSpec) out.push({ doc, page: 2, label: "Nutrition panel" });
    }
    return out.filter((dp) => !failedPages.has(`${dp.doc.id}#${dp.page}`));
  }, [activeRow, failedPages]);
  const activeDocPage = docPages[Math.min(docPageIdx, Math.max(docPages.length - 1, 0))] || null;

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
          {visible.map(({ it, imgs, docs }) => (
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
                  {specLine(it) || it.shortDescription || categoryForItem(it)}
                </p>
                {imgs.length > 1 && (
                  <p className="mt-0.5 text-[10px] text-fg-muted">{imgs.length} photos</p>
                )}
                {docs.length > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-fg-muted">
                    <FileText className="h-3 w-3" /> {docs.length} spec sheet{docs.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-base border border-border">
          {visible.map(({ it, imgs, docs }, i) => (
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
                  {docs.length ? ` · ${docs.length} spec sheet${docs.length === 1 ? "" : "s"}` : ""}
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
                {/* Photos / documents switch — only worth showing when there IS a document. */}
                {docPages.length > 0 && (
                  <div className="mb-3 flex gap-1 self-start rounded-base bg-surface p-1">
                    {[
                      { id: "photos", label: `Photos${activeRow.imgs.length ? ` (${activeRow.imgs.length})` : ""}` },
                      { id: "docs", label: docPages.some((d) => d.doc.docType === "spec-sheet") ? "Spec sheet" : "Documents" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setPane(t.id)}
                        aria-pressed={pane === t.id}
                        className={"rounded-base px-3 py-1.5 text-sm transition-colors " +
                          (pane === t.id ? "bg-bg font-medium text-fg shadow-sm" : "text-fg-muted hover:text-fg")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                {pane === "docs" && activeDocPage ? (
                  <>
                    <div className="flex flex-1 items-center justify-center">
                      {cldDocThumb(cloud, activeDocPage.doc, { page: activeDocPage.page, width: 1000 }) ? (
                        <a
                          href={cldDocUrl(cloud, activeDocPage.doc)}
                          target="_blank"
                          rel="noreferrer"
                          title="Open the full PDF"
                          className="block"
                        >
                          <img
                            src={cldDocThumb(cloud, activeDocPage.doc, { page: activeDocPage.page, width: 1000 })}
                            alt={`${activeDocPage.label} — ${activeRow.it.name || activeRow.it.sku}`}
                            onError={() => { markPageFailed(activeDocPage.doc, activeDocPage.page); setDocPageIdx(0); }}
                            className="max-h-[62vh] w-auto max-w-full rounded-base border border-border bg-white object-contain"
                          />
                        </a>
                      ) : (
                        // Raw-stored document: no page can be rasterized, so offer the file itself.
                        <div className="flex flex-col items-center gap-3 py-24 text-fg-muted">
                          <FileText className="h-10 w-10" />
                          <p className="text-sm">Preview unavailable — open or download the PDF</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {docPages.map((dp, i) => (
                        <button
                          key={`${dp.doc.id}-${dp.page}`}
                          onClick={() => setDocPageIdx(i)}
                          title={dp.label}
                          className="flex flex-col items-center gap-1"
                        >
                          <span className={
                            "block h-14 w-14 overflow-hidden rounded-base border bg-white " +
                            (i === docPageIdx ? "border-brand-primary ring-2 ring-brand-primary/30" : "border-border")
                          }>
                            {cldDocThumb(cloud, dp.doc, { page: dp.page, width: 120 }) ? (
                              <img src={cldDocThumb(cloud, dp.doc, { page: dp.page, width: 120 })} alt=""
                                onError={() => markPageFailed(dp.doc, dp.page)}
                                className="h-full w-full object-contain" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-fg-muted"><FileText className="h-5 w-5" /></span>
                            )}
                          </span>
                          <span className="max-w-16 truncate text-[10px] leading-none text-fg-muted">{dp.label}</span>
                        </button>
                      ))}
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => {
                          const a = document.createElement("a");
                          a.href = cldDocDownload(cloud, activeDocPage.doc);
                          a.download = `${activeRow.it.sku}-${activeDocPage.doc.docType || "document"}.pdf`;
                          a.click();
                        }}>
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const url = cldDocUrl(cloud, activeDocPage.doc);
                          navigator.clipboard?.writeText(url).then(
                            () => toast({ title: "Link copied", description: `${activeDocPage.label} — ${activeRow.it.name || activeRow.it.sku}`, tone: "success" }),
                            () => toast({ title: "Couldn't copy link", tone: "error" }),
                          );
                        }}>
                          <LinkIcon className="h-4 w-4" /> Copy link
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                        {activeRow.imgs.map((im, i) => {
                          const label = altPhotoLabel(im.usage);
                          return (
                            <button key={im.id} onClick={() => setHeroIdx(i)} title={label || undefined}
                              className="flex flex-col items-center gap-1">
                              <span className={
                                "block h-14 w-14 overflow-hidden rounded-base border bg-white " +
                                (i === heroIdx ? "border-brand-primary ring-2 ring-brand-primary/30" : "border-border")
                              }>
                                <img src={cldThumb(cloud, im)} alt="" className="h-full w-full object-contain" />
                              </span>
                              {label && <span className="text-[10px] leading-none text-fg-muted">{label}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="max-h-[78vh] overflow-y-auto p-6">
                <Badge variant="muted">{categoryForItem(activeRow.it)}</Badge>
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
                {activeRow.docs?.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
                      Spec sheet{activeRow.docs.length > 1 ? "s" : ""}
                    </p>
                    <ul className="space-y-1.5">
                      {activeRow.docs.map((doc) => (
                        <li key={doc.id}>
                          <a
                            href={cldDocDownload(cloud, doc)}
                            className="flex items-center gap-2 text-sm text-brand-primary underline"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            {doc.title || "Spec sheet PDF"}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {canManage && (
                  <p className="mt-4 text-xs text-fg-muted">
                    Identity + copy live in Media Hub → Items (<span className="font-mono">{activeRow.it.sku}</span>).
                    Link or unlink photos in the Media Hub asset editor.
                  </p>
                )}
                {/* Onboarding docs — the whole point of the link: ONE url carrying the image, the
                    pack details, the spec sheet and the nutrition panel, instead of a three- or
                    four-email exchange with attachments. Deliberately OUTSIDE the `hero` guard
                    below: an item with a spec sheet but no photo yet is still worth sending. */}
                {activeRow.it.sku && (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button variant="primary" onClick={() => window.open(onboardingUrl(activeRow.it.sku), "_blank", "noopener,noreferrer")}>
                      <FileText className="h-4 w-4" /> Open onboarding docs
                    </Button>
                    <Button variant="secondary" onClick={async () => {
                      const url = onboardingUrl(activeRow.it.sku);
                      try {
                        await navigator.clipboard.writeText(url);
                        toast({ title: "Onboarding link copied", description: "Paste it into an email — it always serves the current files.", tone: "success" });
                      } catch {
                        toast({ title: "Couldn't copy", description: url, tone: "warning" });
                      }
                    }}>
                      <LinkIcon className="h-4 w-4" /> Copy onboarding link
                    </Button>
                  </div>
                )}
                {hero && (
                  <div className="mt-2 flex flex-col gap-2">
                    <Button variant="primary" onClick={() => window.open(cldView(cloud, hero), "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="h-4 w-4" /> View original
                    </Button>
                    <Button variant="secondary" onClick={() => window.open(cldDownload(cloud, hero), "_blank", "noopener,noreferrer")}>
                      <Download className="h-4 w-4" /> Download original
                    </Button>
                    <Button variant="secondary" onClick={() => {
                      // Same recipe as the Media Hub: fl_attachment forces download, f_png guarantees PNG.
                      // c_limit,w_2400 caps the PNG re-encode: Cloudinary Free rejects any derived image >10MB,
                      // and bulk-loaded masters (up to 6732px) blow past that as PNG. c_limit is a no-op under 2400px.
                      const name = (activeRow.it.name || activeRow.it.sku).replace(/[^a-zA-Z0-9_-]+/g, "-");
                      const a = document.createElement("a");
                      a.href = `https://res.cloudinary.com/${cloud}/image/upload/fl_attachment:${name},c_limit,w_2400,f_png/${hero.cl_id}.png`;
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
