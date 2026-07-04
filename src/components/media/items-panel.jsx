// Items view — Media Hub as source of truth for the item IDENTITY + COPY record. Fields, in the
// price & inventory sheet's order: item number, pack size, weight, UPC, short description, long
// description, certification. NO PRICING here — that's the Custom Price List Creator's domain.
// Short/long descriptions are the reusable copy blocks slides, blogs, emails, and social pull
// (see descriptionFor in lib/items.js); each has a one-click copy button.

import { useMemo, useState } from "react";
import { Plus, Copy, Pencil, Trash2, Package, Search, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { cldUrl } from "@/lib/cloudinary.js";
import { emptyItem, listItems, upsertItem, removeItem, saveItems } from "@/lib/items.js";

const inputCls = "h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * @param {object} p
 * @param {object} p.resolved   Tenant config (cloudinaryFolder).
 * @param {Array|null} p.assets Merged asset pool from MediaHub — used to show each item's photos.
 * @param {object|null} p.doc   Items document (hoisted state, loaded by MediaHub).
 * @param {Function} p.setDoc   Setter for the doc.
 * @param {boolean} p.canManage Role gate for editing.
 */
export function ItemsPanel({ resolved, assets, doc, setDoc, canManage }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // item being edited (copy), or null
  const [isNew, setIsNew] = useState(false);

  const items = useMemo(() => (doc ? listItems(doc) : null), [doc]);
  const shown = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.sku, it.name, it.upc, it.shortDescription, it.certification].some((s) => (s || "").toLowerCase().includes(q)));
  }, [items, query]);

  // First linked image per item number (assets carry a `sku` field set in the asset editor).
  const thumbFor = (sku) => assets?.find((a) => a.sku === sku)?.publicId || null;
  const photoCount = (sku) => assets?.filter((a) => a.sku === sku).length || 0;

  async function persist(nextDoc, okTitle) {
    const prev = doc;
    setDoc(nextDoc); // optimistic
    try {
      await saveItems(resolved.cloudinaryFolder, nextDoc);
      toast({ title: okTitle, tone: "success" });
      return true;
    } catch (err) {
      setDoc(prev); // roll back
      toast({ title: "Save failed", description: String(err?.message || err), tone: "error" });
      return false;
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item #, UPC, description…"
            className={inputCls + " pl-8"}
          />
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => { setEditing(emptyItem()); setIsNew(true); }}>
            <Plus className="h-4 w-4" /> New item
          </Button>
        )}
      </div>

      {shown === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Package}
          title={query ? "No items match" : "No items yet"}
          description={query
            ? "Try a different search."
            : "Items hold the identity + copy record: item number, pack size, weight, UPC, descriptions, certification. Pricing stays in the price list tool. Link photos to an item by SKU in the asset editor."}
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((it) => {
            const thumb = thumbFor(it.sku);
            return (
              <li key={it.sku}>
                <Card className="flex items-center gap-4 p-3">
                  {thumb ? (
                    <img src={cldUrl(thumb, "thumb")} alt={it.shortDescription || it.sku} className="h-16 w-16 flex-none rounded-base bg-white object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-16 w-16 flex-none items-center justify-center rounded-base bg-surface">
                      <Package className="h-6 w-6 text-fg-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {it.name && <span className="text-sm font-medium text-fg">{it.name}</span>}
                      <span className="font-mono text-sm font-medium text-fg">{it.sku}</span>
                      {it.certification && (
                        <Badge variant="info"><BadgeCheck className="mr-1 h-3 w-3" />{it.certification}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">
                      {it.packSize && <span>{it.packSize}</span>}
                      {it.weight && <span>{it.weight}</span>}
                      {it.milkType && <span>{it.milkType}</span>}
                      {it.minAge && <span>{it.minAge}</span>}
                      {it.upc && <span className="font-mono">UPC {it.upc}</span>}
                    </p>
                    {it.shortDescription && <p className="mt-1 truncate text-sm text-fg-muted">{it.shortDescription}</p>}
                    <p className="mt-1 text-xs text-fg-muted">
                      {photoCount(it.sku)} photo{photoCount(it.sku) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(JSON.parse(JSON.stringify(it))); setIsNew(false); }}>
                    {canManage ? <><Pencil className="h-4 w-4" /> Edit</> : "View"}
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ItemDialog
        item={editing}
        isNew={isNew}
        canManage={canManage}
        skuTaken={(sku) => isNew && !!doc?.items?.[sku]}
        onClose={() => setEditing(null)}
        onSave={async (item) => {
          const ok = await persist(upsertItem(doc, item), isNew ? "Item created" : "Item saved");
          if (ok) setEditing(null);
        }}
        onDelete={async () => {
          if (!window.confirm(`Delete item "${editing.sku}"?\n\nPhotos are NOT deleted — they just lose the item link.`)) return;
          const ok = await persist(removeItem(doc, editing.sku), "Item deleted");
          if (ok) setEditing(null);
        }}
      />
    </div>
  );
}

// Item editor. Field order MIRRORS the price & inventory sheet: item number → pack size → weight
// → UPC → short description → long description → certification. Copy buttons on both descriptions
// make this the distribution point for item copy.
function ItemDialog({ item, isNew, canManage, skuTaken, onClose, onSave, onDelete }) {
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Re-seed local form whenever a different item opens.
  const openId = item ? `${isNew ? "new" : item.sku}` : null;
  const [seeded, setSeeded] = useState(null);
  if (item && seeded !== openId) { setForm(JSON.parse(JSON.stringify(item))); setSeeded(openId); }
  if (!item || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const copyText = (label, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast({ title: `${label} copied`, tone: "success" });
  };

  const submit = async () => {
    const sku = form.sku.trim();
    if (!sku) { toast({ title: "Item number is required", tone: "warning" }); return; }
    if (skuTaken(sku)) { toast({ title: "Item number already exists", description: "Edit the existing item instead.", tone: "warning" }); return; }
    setSaving(true);
    await onSave({ ...form, sku });
    setSaving(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "New item" : form.sku}</DialogTitle>
          <DialogDescription>
            Identity + copy record (no pricing — that lives in the price list tool). Link photos by SKU in the asset editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Product name = THE identity — everything downstream (Product Catalog, slides,
              emails) displays this, never an image title. */}
          <Field label="Product name">
            <input value={form.name || ""} disabled={!canManage} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Asiago Stagionato DOP" className={inputCls} />
          </Field>
          {/* Price & inventory sheet order: item # → pack size → weight → UPC */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Item number">
              <input value={form.sku} disabled={!isNew || !canManage} onChange={(e) => set("sku", e.target.value)}
                placeholder="MT-ASIA-200" className={inputCls + " font-mono"} />
            </Field>
            <Field label="Pack size">
              <input value={form.packSize} disabled={!canManage} onChange={(e) => set("packSize", e.target.value)}
                placeholder="12 × 200 g" className={inputCls} />
            </Field>
            <Field label="Weight">
              <input value={form.weight} disabled={!canManage} onChange={(e) => set("weight", e.target.value)}
                placeholder="200 g" className={inputCls} />
            </Field>
            <Field label="UPC">
              <input value={form.upc} disabled={!canManage} onChange={(e) => set("upc", e.target.value)}
                placeholder="8 001234 567890" className={inputCls + " font-mono"} />
            </Field>
            <Field label="Milk type">
              <input value={form.milkType} disabled={!canManage} onChange={(e) => set("milkType", e.target.value)}
                placeholder="Cow milk" className={inputCls} />
            </Field>
            <Field label="Minimum age">
              <input value={form.minAge} disabled={!canManage} onChange={(e) => set("minAge", e.target.value)}
                placeholder="min. 10 months" className={inputCls} />
            </Field>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted">Short description — social, email, catalog blurb</span>
              <Button size="sm" variant="ghost" onClick={() => copyText("Short description", form.shortDescription)} title="Copy short description">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <textarea rows={2} value={form.shortDescription} disabled={!canManage}
              onChange={(e) => set("shortDescription", e.target.value)}
              placeholder="One or two lines. The quick sell."
              className="w-full rounded-base border border-border bg-bg px-2 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted">Long description — slides, blog, sell sheets</span>
              <Button size="sm" variant="ghost" onClick={() => copyText("Long description", form.longDescription)} title="Copy long description">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <textarea rows={5} value={form.longDescription} disabled={!canManage}
              onChange={(e) => set("longDescription", e.target.value)}
              placeholder="The full story: provenance, production, tasting notes, pairings."
              className="w-full rounded-base border border-border bg-bg px-2 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60" />
          </div>

          <Field label="Certification">
            <input value={form.certification} disabled={!canManage} onChange={(e) => set("certification", e.target.value)}
              placeholder="e.g. DOP · EU PDO" className={inputCls} />
          </Field>
        </div>

        <DialogFooter>
          {!isNew && canManage && (
            <Button variant="outline" onClick={onDelete}
              className="mr-auto border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4" /> Delete item
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          {canManage && (
            <Button variant="primary" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create item" : "Save item"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
