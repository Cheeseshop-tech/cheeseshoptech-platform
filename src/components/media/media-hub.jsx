import { useEffect, useState, useRef, useMemo } from "react";
import { Upload, Copy, Image as ImageIcon, Pencil, Trash2, Download, Share2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { cldUrl, uploadAsset, UPLOAD_PRESET, CLOUD_NAME } from "@/lib/cloudinary.js";
import { listAssetsPage, updateAsset, deleteAsset, APPROVAL, USAGE, usageLabel, canUpload, canManageMedia, canDeleteMedia, PRODUCT_USAGE_ID } from "@/lib/media.js";
import { loadItems, emptyDoc, canManageItems, emptyItem, upsertItem, saveItems, getItem, specLine } from "@/lib/items.js";
import { ItemsPanel } from "@/components/media/items-panel.jsx";

export function MediaHub({ resolved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Tabs MIRROR the usage tags (Asset Library model): every tab is a saved view filtered by tag,
  // not a storage folder. Special tabs: "items" (the item records — source of truth for product
  // identity, description cards, pricing), "recent" (your latest uploads), and "all" (everything).
  const TABS = [{ id: "items", label: "Items" }, { id: "recent", label: "Recent" }, { id: "all", label: "All" }, ...USAGE.map((u) => ({ id: u.id, label: u.label }))];
  const [tab, setTab] = useState("all");
  const [assets, setAssets] = useState(null);
  const [active, setActive] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  // Files chosen but not yet uploaded — the "Asset details" dialog (name + usage) gates them.
  const [pending, setPending] = useState(null);
  // "Recent": the assets you've uploaded + tagged, newest first. Persisted in the browser so they
  // survive reloads even while the hub is still mock-backed (interim until the live Cloudinary
  // backend lists them for real). Keyed per tenant.
  const RECENT_KEY = `cs-recent-uploads-${resolved.cloudinaryFolder}`;
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  // Page the grid so we mount ~30 tiles, not the whole view at once (a 100+ image set floods the
  // browser on load). Reset when the tab changes.
  const PAGE = 30;
  const [shown, setShown] = useState(PAGE);
  // Free-text search over the active tab's grid (title / SKU / alt / description). The Items tab
  // has its own search (ItemsPanel) — this is for the asset grid (All/Recent/usage tabs).
  const [query, setQuery] = useState("");
  // Items document (source of truth for item records + description cards). Hoisted here so the
  // rail can count items and future surfaces (asset dialog, catalog) can share it.
  const [itemsDoc, setItemsDoc] = useState(null);
  // True while more pages are still streaming in behind the first one (see the effect below).
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch the asset set PAGE BY PAGE (2026-07-18, load-time fix) instead of awaiting the whole
  // tenant set (main folder + every legacy folder) before the grid can render a single tile.
  // Page 1 lands fast and paints immediately; the rest stream in in the background and get
  // appended, so tabs/search/counts fill in progressively instead of the hub sitting on a
  // skeleton for however long the FULL fetch takes — which only grows as more assets get tagged.
  useEffect(() => {
    let alive = true;
    setAssets(null);
    setLoadingMore(true);
    (async () => {
      let cursor;
      let first = true;
      try {
        do {
          const { assets: page, nextCursor } = await listAssetsPage({
            tenantFolder: resolved.cloudinaryFolder, legacyFolders: resolved.cloudinaryLegacyFolders, user, cursor,
          });
          if (!alive) return;
          setAssets((prev) => (first ? page : [...(prev || []), ...page]));
          first = false;
          cursor = nextCursor;
        } while (cursor && alive);
      } catch (e) {
        // 401 (read guard, 2026-07-16) throws RELOGIN_MSG — surface the actual fix (sign out /
        // re-enter passcode) instead of leaving the grid on a skeleton forever.
        if (!alive) return;
        setAssets((prev) => prev || []);
        toast({ title: "Media didn't load", description: String(e?.message || e), tone: "warning" });
      } finally {
        if (alive) setLoadingMore(false);
      }
    })();
    return () => { alive = false; };
  }, [resolved.cloudinaryFolder, user]);

  useEffect(() => { setShown(PAGE); }, [tab, query]);

  // Load the items document once per tenant. Failure degrades to an empty doc (UI still works).
  useEffect(() => {
    let alive = true;
    setItemsDoc(null);
    loadItems(resolved.cloudinaryFolder)
      .then((d) => { if (alive) setItemsDoc(d); })
      .catch(() => { if (alive) setItemsDoc(emptyDoc()); });
    return () => { alive = false; };
  }, [resolved.cloudinaryFolder]);

  // The pool = persisted recent uploads merged over the fetched set, de-duped by publicId.
  const merged = assets ? [...recent, ...assets].filter((a, i, arr) => arr.findIndex((x) => x.publicId === a.publicId) === i) : null;
  // What the grid shows for the active tab.
  const display = tab === "recent" ? recent
    : tab === "all" ? merged
    : merged ? merged.filter((a) => (a.usage || []).includes(tab)) : null;

  // Query narrows whatever the current tab shows — title / SKU / alt text / description.
  const q = query.trim().toLowerCase();
  const filteredDisplay = useMemo(() => {
    if (!display) return display;
    if (!q) return display;
    return display.filter((a) =>
      [a.title, a.sku, a.alt, a.description].some((f) => (f || "").toLowerCase().includes(q)));
  }, [display, q]);

  // Per-view count for the left rail. null while the set is still loading (except Recent, which
  // is local). Recent counts persisted uploads; usage views count the merged pool by tag.
  const countFor = (id) => {
    if (id === "items") return itemsDoc ? Object.keys(itemsDoc.items || {}).length : null;
    if (id === "recent") return recent.length;
    if (!merged) return null;
    if (id === "all") return merged.length;
    return merged.filter((a) => (a.usage || []).includes(id)).length;
  };

  function onUpload() {
    if (!UPLOAD_PRESET) {
      toast({
        title: "Upload not configured",
        description: "Set a Cloudinary unsigned upload preset (VITE_CLOUDINARY_UPLOAD_PRESET) to enable uploads.",
        tone: "warning",
      });
      return;
    }
    fileRef.current?.click();
  }

  // Step 1: choosing files just opens the Asset details dialog — no upload yet.
  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file
    if (files.length) setPending(files);
  }

  // Step 2: the dialog returns named files + the shared usage tags, then we upload.
  async function doUpload(items, usage) {
    setPending(null);
    setUploading(true);
    try {
      const uploaded = [];
      for (const it of items) {
        const asset = await uploadAsset({
          file: it.file, tenantFolder: resolved.cloudinaryFolder, subfolder: "library",
          displayName: it.name, usage,
        });
        uploaded.push(asset);
      }
      // New uploads are tagged "draft" — show them if the current role can see drafts.
      setAssets((list) => [...uploaded, ...(list || [])]);
      // Also push to the persisted "Recent" list (newest first, capped) so they're easy to find.
      setRecent((prev) => {
        const next = [...uploaded, ...prev].slice(0, 60);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore quota */ }
        return next;
      });
      toast({
        title: `Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}`,
        description: usage.length ? `Usage: ${usage.map(usageLabel).join(", ")}` : "Tagged draft — set approval to publish.",
        tone: "success",
      });
    } catch (err) {
      toast({ title: "Upload failed", description: String(err?.message || err), tone: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-fg">Media hub</h1>
          <p className="mt-1 text-fg-muted">
            {resolved.brand.name} · <code className="font-mono text-sm">{resolved.cloudinaryFolder}</code>
          </p>
        </div>
        {canUpload(user) && (
          <>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.webp,.svg,.gif" multiple hidden onChange={onFilesSelected} />
            <Button variant="primary" onClick={onUpload} disabled={uploading}>
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left rail — usage views (file-explorer style). Each is a saved view filtered by tag. */}
        <nav className="w-44 flex-none" aria-label="Asset views">
          <ul className="space-y-0.5">
            {TABS.map((t, i) => {
              const on = t.id === tab;
              const count = countFor(t.id);
              return (
                <li key={t.id}>
                  {(i === 1 || i === 3) && <div className="my-1.5 border-t border-border" />}
                  <button
                    onClick={() => setTab(t.id)}
                    aria-current={on ? "true" : undefined}
                    className={"flex w-full items-center justify-between rounded-base px-3 py-1.5 text-left text-sm transition-colors " + (on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:bg-surface hover:text-fg")}
                  >
                    <span className="truncate">{t.label}</span>
                    {count != null && <span className="ml-2 text-xs text-fg-muted">{count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Items view — item records with description cards (the truth for product copy/pricing) */}
        {tab === "items" ? (
          <ItemsPanel
            resolved={resolved}
            assets={merged}
            doc={itemsDoc}
            setDoc={setItemsDoc}
            canManage={canManageItems(user)}
          />
        ) : (
        <div className="min-w-0 flex-1">{/* Grid */}
          <div className="mb-4 relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input
              className="pl-9"
              placeholder="Search by name, item number, alt text…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search assets"
            />
          </div>
          {filteredDisplay === null ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full" />)}
            </div>
          ) : filteredDisplay.length === 0 ? (
            <EmptyState
              icon={q ? Search : ImageIcon}
              title={q ? "No matches" : tab === "recent" ? "No recent uploads yet" : tab === "all" ? "Nothing here yet" : `Nothing tagged “${TABS.find((t) => t.id === tab)?.label}” yet`}
              description={q
                ? "Try a different search term or clear it to see everything in this view."
                : tab === "recent"
                ? "Images you upload (with their name and usage tags) show up here, newest first — so you can find what you just tagged."
                : "Upload an image and check this usage in the Asset details step to file it here. One image can carry several usages."}
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-fg-muted">
                {q && display ? `${filteredDisplay.length} of ${display.length} shown` : `${filteredDisplay.length} shown`}
                {loadingMore && " · loading more from Cloudinary…"}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredDisplay.slice(0, shown).map((a) => (
                  <AssetTile key={a.publicId} asset={a} item={getItem(itemsDoc, a.sku)} onOpen={() => setActive(a)} />
                ))}
              </div>
              {shown < filteredDisplay.length && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
                    Load more ({filteredDisplay.length - shown} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>

      <UploadDetailsDialog files={pending} uploading={uploading} onCancel={() => setPending(null)} onConfirm={doUpload} />

      <AssetDialog
        asset={active}
        onClose={() => setActive(null)}
        canManage={canManageMedia(user)}
        itemsDoc={itemsDoc}
        canManageItem={canManageItems(user)}
        onSaveItem={async (sku, fields) => {
          // Write-through to the ITEM RECORD (single truth, shared by the Items tab and every
          // photo of this SKU). Optimistic update, rolled back on failure.
          const base = itemsDoc || emptyDoc();
          const existing = base.items?.[sku] || emptyItem(sku);
          const next = upsertItem(base, { ...existing, ...fields });
          const prev = itemsDoc;
          setItemsDoc(next);
          try {
            await saveItems(resolved.cloudinaryFolder, next);
            return true;
          } catch (err) {
            setItemsDoc(prev);
            toast({ title: "Item save failed", description: String(err?.message || err), tone: "error" });
            return false;
          }
        }}
        onCopy={(text, label = "Link copied") => { navigator.clipboard?.writeText(text); toast({ title: label, tone: "success" }); }}
        onSave={async (fields) => {
          const id = active.publicId;
          try {
            const patch = await updateAsset({ publicId: id, ...fields });
            const apply = (x) => x.publicId === id ? { ...x, ...patch } : x;
            setActive((a) => (a ? { ...a, ...patch } : a));
            setAssets((list) => list?.map(apply));
            setRecent((prev) => {
              const next = prev.map(apply);
              try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
              return next;
            });
            toast({ title: "Asset updated", tone: "success" });
            return true;
          } catch (err) {
            toast({ title: "Update failed", description: String(err?.message || err), tone: "error" });
            return false;
          }
        }}
        canDelete={canDeleteMedia(user)}
        onDelete={async () => {
          const id = active.publicId;
          try {
            await deleteAsset({ publicId: id });
            const drop = (list) => (list || []).filter((x) => x.publicId !== id);
            setAssets(drop);
            setRecent((prev) => {
              const next = drop(prev);
              try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
              return next;
            });
            setActive(null);
            toast({ title: "Asset deleted", tone: "success" });
            return true;
          } catch (err) {
            toast({ title: "Delete failed", description: String(err?.message || err), tone: "error" });
            return false;
          }
        }}
      />
    </div>
  );
}

// Small labeled-field wrapper for the asset edit form.
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function AssetTile({ asset, item, onOpen }) {
  const ap = APPROVAL[asset.approvalState];
  // Approved-for-press is the norm for finished packshots — don't badge it (keeps the grid clean).
  // Only flag exceptions worth attention: drafts and influencer-only assets.
  const showBadge = asset.approvalState !== "approved-for-press";
  return (
    <button onClick={onOpen} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-base">
      <Card className="overflow-hidden">
        <img
          src={cldUrl(asset.publicId, "card")}
          alt={asset.title}
          loading="lazy"
          className="aspect-square w-full bg-white object-cover transition-opacity group-hover:opacity-90"
        />
        <div className="p-3">
          <p className="truncate text-sm font-medium text-fg">{asset.title}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {asset.sku ? <span className="font-mono text-xs text-fg-muted">{asset.sku}</span> : <span />}
            {showBadge && <Badge variant={ap.tone}>{ap.label}</Badge>}
          </div>
          {/* Usage tags intentionally NOT shown on tiles (Rick, 2026-07-03) — they cluttered the
              grid. Instead the ITEM SPEC LINE rides on the tile: weight · pack · milk · age. */}
          {specLine(item) && (
            <p className="mt-1 truncate text-[11px] leading-4 text-fg-muted">{specLine(item)}</p>
          )}
        </div>
      </Card>
    </button>
  );
}

// The "Asset details" step shown after files are chosen: name each file + pick usage tags
// (multi-select). Usage drives where the asset may appear — only "Product Catalog" reaches the
// Product Catalog. Names default to the filename (extension stripped).
function UploadDetailsDialog({ files, uploading, onCancel, onConfirm }) {
  const [names, setNames] = useState([]);
  const [usage, setUsage] = useState([]);
  useEffect(() => {
    setNames((files || []).map((f) => f.name.replace(/\.[^.]+$/, "")));
    setUsage([]);
  }, [files]);
  if (!files) return null;
  const toggle = (id) => setUsage((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  const setName = (i, v) => setNames((n) => n.map((x, j) => (j === i ? v : x)));
  return (
    <Dialog open={!!files} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asset details</DialogTitle>
          <DialogDescription>
            Name {files.length > 1 ? `these ${files.length} files` : "this file"} and choose where they can be used.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[28vh] space-y-2 overflow-auto pr-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              {files.length > 1 && <span className="w-5 text-xs text-fg-muted">{i + 1}.</span>}
              <input
                value={names[i] ?? ""}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={f.name}
                className="h-9 flex-1 rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>
          ))}
        </div>

        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-fg">Usage <span className="text-xs font-normal text-fg-muted">— pick all that apply</span></p>
          <div className="flex flex-wrap gap-2">
            {USAGE.map((u) => {
              const on = usage.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={"rounded-full border px-3 py-1 text-sm transition-colors " + (on ? "border-brand bg-surface font-medium text-fg" : "border-border text-fg-muted hover:border-brand")}
                >
                  {on ? "✓ " : ""}{u.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-fg-muted">Only “Product Catalog” assets appear in the Product Catalog.</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={uploading || names.some((n) => !n.trim())}
            onClick={() => onConfirm(files.map((f, i) => ({ file: f, name: names[i] })), usage)}
          >
            {uploading ? "Uploading…" : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Asset detail + EDIT. View mode shows the asset; managers can flip to Edit to rename, re-tag
// usage, link a SKU, add alt text, and set approval — persisted via media-update. When a SKU is
// linked, the ITEM RECORD fields (weight, pack size, short/long description) are edited right
// here too — but they write through to the shared items doc (one truth, same as the Items tab).
function AssetDialog({ asset, onClose, canManage, canDelete, onCopy, onSave, onDelete, itemsDoc, canManageItem, onSaveItem }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [itemForm, setItemForm] = useState(null); // weight/packSize/milk/age/short/long — item-record slice
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLong, setShowLong] = useState(false); // long-description reveal in view mode
  useEffect(() => { setEditing(false); setForm(null); setItemForm(null); setShowLong(false); }, [asset?.publicId]);
  const remove = async () => {
    if (!window.confirm(`Permanently delete "${asset.title}"?\n\nThis removes it from Cloudinary and cannot be undone.`)) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };
  if (!asset) return null;
  const heroUrl = cldUrl(asset.publicId, "hero");
  const deliveryUrl = cldUrl(asset.publicId, "original");

  // Item record linked to this asset (by SKU) — display in view mode, edit via itemForm.
  const linkedItem = getItem(itemsDoc, editing ? (form?.sku || "").trim() : asset?.sku);

  // TAG-DRIVEN FIELDS (Rick, 2026-07-04): the "Product Catalog" usage decides which attribute
  // fields an asset gets. Product photos: SKU + full item record. Everything else (a cow, a
  // pasture, a press shot): one Description field — no milk type / pack size noise.
  const isProductEdit = !!form?.usage?.includes(PRODUCT_USAGE_ID);
  const isProductView = (asset?.usage || []).includes(PRODUCT_USAGE_ID);

  const startEdit = () => {
    setForm({
      displayName: asset.title || "",
      usage: asset.usage || [],
      sku: asset.sku || "",
      alt: asset.alt || "",
      description: asset.description || "",
      approvalState: asset.approvalState || "draft",
    });
    const it = getItem(itemsDoc, asset.sku) || emptyItem(asset.sku || "");
    setItemForm({
      name: it.name || "",
      weight: it.weight || "",
      packSize: it.packSize || "",
      milkType: it.milkType || "",
      minAge: it.minAge || "",
      shortDescription: it.shortDescription || "",
      longDescription: it.longDescription || "",
    });
    setEditing(true);
  };
  const toggleUsage = (id) => setForm((f) => ({ ...f, usage: f.usage.includes(id) ? f.usage.filter((x) => x !== id) : [...f.usage, id] }));
  const setItemField = (k, v) => setItemForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    const ok = await onSave({ ...form, displayName: form.displayName.trim() || asset.title });
    // Item fields write through to the shared item record — only when a SKU is linked and the
    // user may manage items. A failed item save keeps the dialog open so nothing is lost.
    let itemOk = true;
    const sku = (form.sku || "").trim();
    if (ok && sku && canManageItem && itemForm && isProductEdit) {
      itemOk = await onSaveItem(sku, itemForm);
    }
    setSaving(false);
    if (ok && itemOk) setEditing(false);
  };

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset.title}</DialogTitle>
          <DialogDescription>
            <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 pr-6">
              <span>{asset.sku ? <span className="font-mono">{asset.sku}</span> : "Brand / lifestyle asset"} · {asset.folder}</span>
              {/* Spec line rides with the name + item number (weight · pack · milk · age) */}
              {specLine(linkedItem) && <span className="text-fg">{specLine(linkedItem)}</span>}
            </span>
          </DialogDescription>
        </DialogHeader>

        <img src={heroUrl} alt={asset.alt || asset.title} className={`${editing ? "max-h-[26vh]" : "max-h-[45vh]"} w-full rounded-base bg-white object-contain`} />

        {!editing ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Badge variant={APPROVAL[asset.approvalState].tone}>{APPROVAL[asset.approvalState].label}</Badge>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  // fl_attachment forces a download; f_png guarantees PNG regardless of f_auto.
                  const name = (asset.title || asset.publicId).replace(/[^a-zA-Z0-9_-]+/g, "-");
                  const a = document.createElement("a");
                  a.href = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment:${name},f_png/${asset.publicId}.png`;
                  a.click();
                }}>
                  <Download className="h-4 w-4" /> PNG
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  // Native share sheet where available (mobile/Safari); clipboard fallback elsewhere.
                  if (navigator.share) {
                    try { await navigator.share({ title: asset.title, url: deliveryUrl }); } catch { /* user cancelled */ }
                  } else {
                    onCopy(deliveryUrl);
                  }
                }}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCopy(deliveryUrl)}>
                  <Copy className="h-4 w-4" /> Copy delivery URL
                </Button>
              </div>
            </div>
            {asset.usage?.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-fg-muted">Usage:</span>
                {asset.usage.map((id) => <Badge key={id} variant="muted">{usageLabel(id)}</Badge>)}
              </div>
            )}
            {asset.alt && <p className="mt-2 text-sm text-fg-muted">{asset.alt}</p>}
            {!isProductView && asset.description && (
              <p className="mt-2 text-sm text-fg">{asset.description}</p>
            )}
            {isProductView && linkedItem && (
              <div className="mt-3 rounded-base border border-border p-3">
                {linkedItem.name && <p className="text-sm font-medium text-fg">{linkedItem.name}</p>}
                <p className="text-xs font-medium text-fg-muted">
                  Item <span className="font-mono">{linkedItem.sku}</span>
                  {specLine(linkedItem) && <span> · {specLine(linkedItem)}</span>}
                </p>
                {linkedItem.shortDescription && <p className="mt-1.5 text-sm text-fg">{linkedItem.shortDescription}</p>}
                {linkedItem.longDescription && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowLong((v) => !v)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
                    >
                      {showLong ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {showLong ? "Hide long description" : "View long description"}
                    </button>
                    {showLong && (
                      <div className="mt-1.5 flex items-start justify-between gap-2">
                        <p className="whitespace-pre-wrap text-sm text-fg">{linkedItem.longDescription}</p>
                        <Button size="sm" variant="ghost" title="Copy long description"
                          onClick={() => onCopy(linkedItem.longDescription, "Long description copied")}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Viewer tiers (sales rep / broker / external) get a CLEAN dialog — no edit
                affordances, no lock notice, no footer Close (the X handles it). Rick, 2026-07-06. */}
            {canManage && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="h-4 w-4" /> Edit asset</Button>
                {canDelete && (
                  <Button size="sm" variant="outline" onClick={remove} disabled={deleting}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <Field label="Name">
              <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Usage <span className="text-xs font-normal text-fg-muted">— pick all that apply</span></p>
              <div className="flex flex-wrap gap-2">
                {USAGE.map((u) => {
                  const on = form.usage.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUsage(u.id)}
                      className={"rounded-full border px-3 py-1 text-sm transition-colors " + (on ? "border-brand bg-surface font-medium text-fg" : "border-border text-fg-muted hover:border-brand")}>
                      {on ? "✓ " : ""}{u.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {isProductEdit ? (<>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Linked SKU (for product photos)">
                <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="e.g. MT-ASIA-200"
                  className="h-9 w-full rounded-base border border-border bg-bg px-2 font-mono text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
              </Field>
              <Field label="Approval">
                <select value={form.approvalState} onChange={(e) => setForm((f) => ({ ...f, approvalState: e.target.value }))}
                  className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {Object.entries(APPROVAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Alt text (accessibility / image description)">
              <input value={form.alt} onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
            </Field>

            {/* Item record fields — shown when a SKU is linked. These write through to the SHARED
                item record (items.json), the same truth the Items tab edits. NO pricing here. */}
            {canManageItem && itemForm && (form.sku || "").trim() ? (
              <div className="rounded-base border border-border p-3">
                <p className="mb-2 text-sm font-medium text-fg">
                  Item record — <span className="font-mono text-xs">{form.sku.trim()}</span>{" "}
                  <span className="text-xs font-normal text-fg-muted">shared across all photos of this item</span>
                </p>
                <div className="mb-3">
                  <Field label="Product name — the identity every surface displays">
                    <input value={itemForm.name || ""} onChange={(e) => setItemField("name", e.target.value)} placeholder="e.g. Asiago Stagionato DOP"
                      className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight">
                    <input value={itemForm.weight} onChange={(e) => setItemField("weight", e.target.value)} placeholder="e.g. 16-18 lbs"
                      className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                  <Field label="Pack size">
                    <input value={itemForm.packSize} onChange={(e) => setItemField("packSize", e.target.value)} placeholder="e.g. 1 wheel/case"
                      className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                  <Field label="Milk type">
                    <input value={itemForm.milkType} onChange={(e) => setItemField("milkType", e.target.value)} placeholder="e.g. Cow milk"
                      className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                  <Field label="Minimum age">
                    <input value={itemForm.minAge} onChange={(e) => setItemField("minAge", e.target.value)} placeholder="e.g. min. 10 months"
                      className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Short description — social, email, catalog blurb">
                    <textarea rows={2} value={itemForm.shortDescription} onChange={(e) => setItemField("shortDescription", e.target.value)}
                      className="w-full rounded-base border border-border bg-bg px-2 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Long description — slides, blog, sell sheets">
                    <textarea rows={4} value={itemForm.longDescription} onChange={(e) => setItemField("longDescription", e.target.value)}
                      className="w-full rounded-base border border-border bg-bg px-2 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  </Field>
                </div>
              </div>
            ) : canManageItem && itemForm ? (
              <p className="text-xs text-fg-muted">Link a SKU above to edit the item's weight, pack size, and descriptions here.</p>
            ) : null}
            </>) : (<>
            {/* Non-product photo (no Product Catalog tag): the tags carry the organizational
                info, so one description is all the attribute editing it needs. */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Approval">
                <select value={form.approvalState} onChange={(e) => setForm((f) => ({ ...f, approvalState: e.target.value }))}
                  className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {Object.entries(APPROVAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description — what this photo shows">
              <textarea rows={3} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Cows grazing at alpine pasture above Grigno, summer."
                className="w-full rounded-base border border-border bg-bg px-2 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
            </Field>
            </>)}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
