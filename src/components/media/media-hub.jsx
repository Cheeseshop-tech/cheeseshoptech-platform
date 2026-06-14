import { useEffect, useState, useRef } from "react";
import { Upload, Copy, Image as ImageIcon, Lock, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { cldUrl, uploadAsset, UPLOAD_PRESET } from "@/lib/cloudinary.js";
import { listAssets, updateAsset, APPROVAL, USAGE, usageLabel, canUpload, canManageMedia } from "@/lib/media.js";

export function MediaHub({ resolved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Tabs MIRROR the usage tags (Asset Library model): every tab is a saved view filtered by tag,
  // not a storage folder. Special tabs: "recent" (your latest uploads) and "all" (everything).
  const TABS = [{ id: "recent", label: "Recent" }, { id: "all", label: "All" }, ...USAGE.map((u) => ({ id: u.id, label: u.label }))];
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

  // Fetch the whole asset set ONCE; tabs filter it client-side by usage tag (instant switching).
  useEffect(() => {
    let alive = true;
    setAssets(null);
    listAssets({ folder: null, tenantFolder: resolved.cloudinaryFolder, user }).then((a) => {
      if (alive) setAssets(a);
    });
    return () => { alive = false; };
  }, [resolved.cloudinaryFolder, user]);

  useEffect(() => { setShown(PAGE); }, [tab]);

  // The pool = persisted recent uploads merged over the fetched set, de-duped by publicId.
  const merged = assets ? [...recent, ...assets].filter((a, i, arr) => arr.findIndex((x) => x.publicId === a.publicId) === i) : null;
  // What the grid shows for the active tab.
  const display = tab === "recent" ? recent
    : tab === "all" ? merged
    : merged ? merged.filter((a) => (a.usage || []).includes(tab)) : null;

  // Per-view count for the left rail. null while the set is still loading (except Recent, which
  // is local). Recent counts persisted uploads; usage views count the merged pool by tag.
  const countFor = (id) => {
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
                  {i === 2 && <div className="my-1.5 border-t border-border" />}
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

        {/* Grid */}
        <div className="min-w-0 flex-1">
          {display === null ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full" />)}
            </div>
          ) : display.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title={tab === "recent" ? "No recent uploads yet" : tab === "all" ? "Nothing here yet" : `Nothing tagged “${TABS.find((t) => t.id === tab)?.label}” yet`}
              description={tab === "recent"
                ? "Images you upload (with their name and usage tags) show up here, newest first — so you can find what you just tagged."
                : "Upload an image and check this usage in the Asset details step to file it here. One image can carry several usages."}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {display.slice(0, shown).map((a) => (
                  <AssetTile key={a.publicId} asset={a} onOpen={() => setActive(a)} />
                ))}
              </div>
              {shown < display.length && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
                    Load more ({display.length - shown} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <UploadDetailsDialog files={pending} uploading={uploading} onCancel={() => setPending(null)} onConfirm={doUpload} />

      <AssetDialog
        asset={active}
        onClose={() => setActive(null)}
        canManage={canManageMedia(user)}
        onCopy={(url) => { navigator.clipboard?.writeText(url); toast({ title: "Link copied", tone: "success" }); }}
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

function AssetTile({ asset, onOpen }) {
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
          {asset.usage?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {asset.usage.slice(0, 3).map((id) => <Badge key={id} variant="muted">{usageLabel(id)}</Badge>)}
              {asset.usage.length > 3 && <span className="text-xs text-fg-muted">+{asset.usage.length - 3}</span>}
            </div>
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
// usage, link a SKU, add alt text, and set approval — all persisted via media-update (the asset is
// the Media Hub's to own; product copy is NOT here, it lives with the SKU).
function AssetDialog({ asset, onClose, canManage, onCopy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setEditing(false); setForm(null); }, [asset?.publicId]);
  if (!asset) return null;
  const heroUrl = cldUrl(asset.publicId, "hero");
  const deliveryUrl = cldUrl(asset.publicId, "original");

  const startEdit = () => {
    setForm({
      displayName: asset.title || "",
      usage: asset.usage || [],
      sku: asset.sku || "",
      alt: asset.alt || "",
      approvalState: asset.approvalState || "draft",
    });
    setEditing(true);
  };
  const toggleUsage = (id) => setForm((f) => ({ ...f, usage: f.usage.includes(id) ? f.usage.filter((x) => x !== id) : [...f.usage, id] }));
  const save = async () => {
    setSaving(true);
    const ok = await onSave({ ...form, displayName: form.displayName.trim() || asset.title });
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset.title}</DialogTitle>
          <DialogDescription>
            {asset.sku ? <span className="font-mono">{asset.sku}</span> : "Brand / lifestyle asset"} · {asset.folder}
          </DialogDescription>
        </DialogHeader>

        <img src={heroUrl} alt={asset.alt || asset.title} className={`${editing ? "max-h-[26vh]" : "max-h-[45vh]"} w-full rounded-base bg-white object-contain`} />

        {!editing ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Badge variant={APPROVAL[asset.approvalState].tone}>{APPROVAL[asset.approvalState].label}</Badge>
              <Button size="sm" variant="outline" onClick={() => onCopy(deliveryUrl)}>
                <Copy className="h-4 w-4" /> Copy delivery URL
              </Button>
            </div>
            {asset.usage?.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-fg-muted">Usage:</span>
                {asset.usage.map((id) => <Badge key={id} variant="muted">{usageLabel(id)}</Badge>)}
              </div>
            )}
            {asset.alt && <p className="mt-2 text-sm text-fg-muted">{asset.alt}</p>}
            {canManage ? (
              <div className="mt-4 border-t border-border pt-4">
                <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="h-4 w-4" /> Edit asset</Button>
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-fg-muted">
                <Lock className="h-3.5 w-3.5" /> Asset details are managed by the brand team.
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
            </DialogFooter>
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
