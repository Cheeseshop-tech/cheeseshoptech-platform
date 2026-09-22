import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Check, FolderOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context.jsx";
import { listAssetsPage, USAGE, APPROVAL, IS_MOCK_MODE, MOCK_MODE_MSG } from "@/lib/media.js";
import { cldUrl, pdfThumbUrl, CLOUD_NAME } from "@/lib/cloudinary.js";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";

// Same raw-vs-image delivery-URL logic as the Media Hub's own asset detail dialog
// (media-hub.jsx's DetailDialog, `deliveryUrl`/`docPath`) -- a raw-type public_id already ends
// in its extension, an image-type one doesn't, so appending blindly produces "....pdf.pdf" (a
// dead link, already fixed once there). Not extracted into a shared helper here so this file
// doesn't create a cross-import between the two -- if this drifts, media-hub.jsx is the source
// of truth to re-sync from.
function deliveryInfoOf(asset) {
  const isDoc = asset.kind === "document";
  const docIsRaw = isDoc && /\.[a-z0-9]+$/i.test(asset.publicId || "");
  const docPath = docIsRaw ? asset.publicId : `${asset.publicId}.${asset.format || "pdf"}`;
  const docRoot = `https://res.cloudinary.com/${CLOUD_NAME}/${docIsRaw ? "raw" : "image"}/upload`;
  const url = isDoc ? `${docRoot}/${docPath}` : cldUrl(asset.publicId, "original");
  const format = (asset.format || (docIsRaw ? (asset.publicId.split(".").pop() || "") : "") || "").toLowerCase();
  const name = asset.title || asset.publicId.split("/").pop();
  return { url, name, format };
}

/** Grid-tile thumbnail. Photos use the normal card preset; documents reuse the Media Hub's
 *  page-1 raster trick (image-type PDFs only -- a raw-stored file has no renderable page, so it
 *  falls back to a plain file icon in the grid). */
function tileThumb(asset) {
  if (asset.kind !== "document") return cldUrl(asset.publicId, "thumb");
  const isRaw = /\.[a-z0-9]+$/i.test(asset.publicId || "");
  return isRaw ? "" : pdfThumbUrl(asset.publicId, { width: 220 });
}

// Multi-select Media Hub browser for attaching EXISTING assets -- spec sheets, sell sheets, or
// photos -- to a campaign's Documents list, alongside the existing "upload a new file" path.
// Rick, 2026-09-21: "the campaign template needs a media hub image selector for documents."
//
// Deliberately its own component rather than reusing <MediaPicker>: that one is a single-image
// "slot" that EXCLUDES kind:"document" assets on purpose (see photoAssets() in media.js, and its
// own comment: "a photo slot, never a document slot"). This one is a growing, multi-add list and
// documents are the whole point, so both photos and documents are shown, filterable by the same
// content tabs (usage tags + a Documents tab) and approval badges the Media Hub itself uses.
export function MediaDocumentPicker({ resolved, onAdd, disabled }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("all"); // "all" | "documents" | a usage id
  const [selected, setSelected] = useState(() => new Set());
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Lazy-load the tenant's full asset set the first time the dialog opens -- same paginated
  // seam as MediaPicker/Media Hub (listAssetsPage streams pages in after first paint), just
  // WITHOUT the photoAssets() filter, since documents are exactly what belongs here.
  useEffect(() => {
    if (!open || assets.length || loading) return;
    setLoading(true); setErr("");
    let cancelled = false;
    const loadPage = (cursor) => {
      listAssetsPage({ tenantFolder: resolved.cloudinaryFolder, legacyFolders: resolved.cloudinaryLegacyFolders, user, cursor, tenantId: resolved.id })
        .then(({ assets: page, nextCursor }) => {
          if (!mountedRef.current || cancelled) return;
          setAssets((prev) => [...prev, ...page]);
          setLoading(false); // first page in -- picker usable even if more is still streaming
          if (nextCursor) loadPage(nextCursor);
        })
        .catch((e) => {
          if (!mountedRef.current || cancelled) return;
          setLoading((wasLoading) => { if (wasLoading) setErr(String(e?.message || e)); return false; });
        });
    };
    loadPage(undefined);
    return () => { cancelled = true; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const tagsPresent = useMemo(() => {
    const s = new Set();
    assets.forEach((a) => (a.usage || []).forEach((u) => s.add(u)));
    return USAGE.filter((u) => s.has(u.id));
  }, [assets]);

  const docCount = useMemo(() => assets.filter((a) => a.kind === "document").length, [assets]);

  const shown = useMemo(() => {
    if (tab === "all") return assets;
    if (tab === "documents") return assets.filter((a) => a.kind === "document");
    return assets.filter((a) => (a.usage || []).includes(tab));
  }, [assets, tab]);

  function toggle(publicId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId); else next.add(publicId);
      return next;
    });
  }

  function confirmAdd() {
    const picked = assets.filter((a) => selected.has(a.publicId));
    const docs = picked.map((a) => ({ publicId: a.publicId, bytes: a.bytes, ...deliveryInfoOf(a) }));
    onAdd(docs);
    setSelected(new Set());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(new Set()); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <FolderOpen className="h-4 w-4" /> Add from Media Hub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add from Media Hub</DialogTitle>
          <DialogDescription>
            Pick one or more existing assets already in the Media Hub -- spec sheets, sell sheets, or photos.
            They&apos;re attached to this campaign, not re-uploaded.
          </DialogDescription>
        </DialogHeader>

        {IS_MOCK_MODE && (
          <p className="mb-2 rounded-base border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-800">
            {MOCK_MODE_MSG}
          </p>
        )}

        {/* Content-type tabs, mirroring the Media Hub's own All / Documents / usage tabs. */}
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
          <button
            type="button" onClick={() => setTab("all")}
            className={`rounded-base px-2 py-1 text-xs font-medium transition-colors ${tab === "all" ? "bg-brand-primary text-white" : "bg-surface text-fg-muted hover:text-fg"}`}
          >
            All ({assets.length})
          </button>
          <button
            type="button" onClick={() => setTab("documents")}
            className={`rounded-base px-2 py-1 text-xs font-medium transition-colors ${tab === "documents" ? "bg-brand-primary text-white" : "bg-surface text-fg-muted hover:text-fg"}`}
          >
            Documents ({docCount})
          </button>
          {tagsPresent.map((u) => (
            <button
              key={u.id} type="button" onClick={() => setTab(u.id)}
              className={`rounded-base px-2 py-1 text-xs font-medium transition-colors ${tab === u.id ? "bg-brand-primary text-white" : "bg-surface text-fg-muted hover:text-fg"}`}
            >
              {u.label}
            </button>
          ))}
        </div>

        {loading && !assets.length ? (
          <p className="p-6 text-center text-sm text-fg-muted">Loading Media Hub…</p>
        ) : err ? (
          <p className="p-6 text-center text-sm text-error">{err}</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-fg-muted">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {shown.map((a) => {
              const thumb = tileThumb(a);
              const isSel = selected.has(a.publicId);
              const ap = APPROVAL[a.approvalState];
              return (
                <button
                  key={a.publicId} type="button" onClick={() => toggle(a.publicId)}
                  title={a.title || a.publicId}
                  className={`relative flex flex-col overflow-hidden rounded-base border text-left transition-colors ${isSel ? "border-brand-primary ring-2 ring-brand-primary/40" : "border-border hover:border-brand-primary"}`}
                >
                  <span className="relative flex aspect-square items-center justify-center bg-white">
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" className="h-full w-full object-contain" />
                    ) : (
                      <FileText className="h-8 w-8 text-fg-muted" />
                    )}
                    {isSel && (
                      <span className="absolute right-1 top-1 rounded-full bg-brand-primary p-0.5 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </span>
                  <span className="truncate px-1.5 py-1 text-[11px] text-fg">{a.title || a.publicId.split("/").pop()}</span>
                  {ap && <Badge variant={ap.tone} className="mx-1.5 mb-1.5 w-fit text-[9px]">{ap.label}</Badge>}
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="text-xs text-fg-muted">{selected.size} selected</span>
          <div className="flex gap-2">
            <DialogClose asChild><Button type="button" variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button type="button" size="sm" disabled={!selected.size} onClick={confirmAdd}>
              Add {selected.size || ""} document{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
