import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, ArrowLeft, MonitorPlay,
  Plus, Share2, ExternalLink, Trash2, Upload, FileText, ArrowUp, ArrowDown, X, Download,
} from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";
import { cldUrl, uploadFileAuto, pdfThumbUrl } from "@/lib/cloudinary.js";
import { loadCatalog, fetchCatalog, subscribeSaveState, addEntry, removeEntry, updateEntry, coverUrl, CONTENT_CATEGORIES, categoryLabel, entryCategory, entryStatus, duplicateKeys, DEFAULT_QUOTA, downloadHref } from "@/lib/presentations-store.js";
import { MediaPicker } from "@/components/media/media-picker.jsx";
import { SlideRenderer } from "./slide-renderer.jsx";

// Content Library = the organized CATALOG of finished work (CONTENT_ORCHESTRATION_SPEC §2).
// Config decks (image slide decks) still render in the built-in viewer; saved entries link out to the
// finished piece (a public PDF/page) so buyers can open them.
// 2026-08-03: the catalog is now per-tenant in Netlify Blobs (netlify/functions/content-library.js),
// not localStorage — so a piece saved from Compose is visible to the whole team and can actually be
// reviewed, which the spec's Compose → Submit → Review → Post flow requires.
export function PresentationsPage({ resolved }) {
  const { user } = useAuth();
  const roles = rolesOf(user);
  const canManage = roles.includes("admin") || roles.includes("client") || roles.includes("client-admin");
  const { toast } = useToast();
  const tenant = resolved.id;
  const quota = resolved.contentQuota || DEFAULT_QUOTA;

  // Config decks (image slide decks) → normalize to catalog entries of kind "deck".
  const configDecks = useMemo(
    () => (resolved.presentations || []).map((d) => ({ ...d, kind: "deck", category: d.category || "slide-deck", cover: d.slides?.[0] })),
    [resolved.presentations]
  );
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Show whatever this browser already has immediately, then replace it with the shared
    // catalog once Blobs answers — so the Library never flashes empty for a returning user.
    setSaved(loadCatalog(tenant));
    fetchCatalog(tenant).then((list) => { if (alive) { setSaved(list); setLoading(false); } });
    return () => { alive = false; };
  }, [tenant]);
  useEffect(() => subscribeSaveState(setSaveState), []);

  const entries = useMemo(() => [...saved, ...configDecks], [saved, configDecks]);

  const [activeKey, setActiveKey] = useState(null);
  const [loadOpen, setLoadOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [preview, setPreview] = useState(null); // entry being previewed
  const [activeCategory, setActiveCategory] = useState("all");
  const active = entries.find((d) => d.key === activeKey && d.kind === "deck");

  // Gated publishing: house (CST = admin role) reviews; non-managers only ever see "posted".
  // Managers also see pending/returned so they can track + review. Dedup flags shared title/url.
  const canReview = roles.includes("admin");
  const dupes = useMemo(() => duplicateKeys(entries), [entries]);
  const visible = useMemo(
    () => (canManage ? entries : entries.filter((e) => entryStatus(e) === "posted")),
    [entries, canManage]
  );

  // Category counts + the filtered view (Content Library tabs = views over the content-type dimension).
  const counts = useMemo(() => {
    const c = { all: visible.length };
    for (const e of visible) { const cat = entryCategory(e); c[cat] = (c[cat] || 0) + 1; }
    return c;
  }, [visible]);
  const filtered = useMemo(
    () => (activeCategory === "all" ? visible : visible.filter((e) => entryCategory(e) === activeCategory)),
    [visible, activeCategory]
  );

  function onApprove(entry) {
    setSaved(updateEntry(tenant, entry.key, { status: "posted", reviewNote: "" }));
    toast({ title: "Posted to the library", tone: "success" });
  }
  function onReturn(entry) {
    const note = window.prompt(`Return "${entry.title}" — reason (optional):`, "");
    if (note === null) return; // cancelled
    setSaved(updateEntry(tenant, entry.key, { status: "returned", reviewNote: note }));
    toast({ title: "Returned to sender", tone: "success" });
  }

  async function share(entry) {
    const url = entry.url || `${location.origin}${location.pathname}${location.search}`;
    if (navigator.share) {
      try { await navigator.share({ title: entry.title, text: entry.description || "", url }); return; }
      catch { /* user cancelled or unsupported — fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url); toast({ title: "Share link copied", tone: "success" }); }
    catch { toast({ title: "Couldn't copy link", description: url, tone: "error" }); }
  }

  function open(entry) {
    if (entry.kind === "deck") setActiveKey(entry.key);
    else if (entry.url) window.open(entry.url, "_blank", "noopener");
  }

  function onDelete(entry) {
    if (!window.confirm(`Remove "${entry.title}" from the catalog?`)) return;
    setSaved(removeEntry(tenant, entry.key));
    toast({ title: "Removed from catalog", tone: "success" });
  }

  if (active) {
    return <DeckViewer deck={active} showBack onBack={() => setActiveKey(null)} resolved={resolved} />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-heading text-3xl text-fg">Content Library</h1>
          <p className="text-fg-muted">{resolved.brand.name}'s finished content — organized by type, shareable.</p>
          {/* Catalog status. The catalog is shared now, so a failed write is a real event and
              must never pass silently the way a localStorage quota error used to. */}
          <p className="mt-1 text-xs" role="status" aria-live="polite">
            {loading ? <span className="text-fg-muted">Loading the shared catalog…</span>
              : saveState === "saving" ? <span className="text-fg-muted">Auto-saves · Saving…</span>
              : saveState === "saved" ? <span className="text-success">Auto-saves · Saved ✓</span>
              : saveState === "denied" ? <span className="text-warning">Read-only — admin passcode required to save</span>
              : saveState === "failed" ? <span className="text-warning">Save failed — the catalog may be out of sync</span>
              : <span className="text-fg-muted">Shared across the team · auto-saves</span>}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={saved.length >= quota} onClick={() => setStageOpen(true)}>
                <Upload className="h-4 w-4" /> Stage files
              </Button>
              <Button variant="primary" disabled={saved.length >= quota} onClick={() => setLoadOpen(true)}>
                <Plus className="h-4 w-4" /> Load content
              </Button>
            </div>
            <span className={"text-xs " + (saved.length >= quota ? "font-medium text-red-600" : "text-fg-muted")}>
              {saved.length}/{quota} stored{saved.length >= quota ? " — delete or download to add" : ""}
            </span>
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[{ id: "all", label: "All" }, ...CONTENT_CATEGORIES].map((c) => {
            const n = counts[c.id] || 0;
            const on = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={"rounded-full border px-3 py-1 text-sm transition-colors " + (on ? "border-brand-primary bg-bg font-semibold text-brand-primary" : "border-border text-fg-muted hover:border-brand-primary")}
              >
                {c.label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="Nothing in your Content Library yet"
          description={canManage
            ? "Build a proposal in Content Studio, then Load it here to catalog and share it."
            : "Finished proposals will appear here."}
        />
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-muted">Nothing in this category yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.key} className="group overflow-hidden p-0 transition-colors hover:border-brand-primary">
              <button onClick={() => open(d)} className="block w-full text-left" aria-label={`Open ${d.title}`}>
                <CardThumb entry={d} />
              </button>
              <div className="p-4">
                {d.eyebrow && <p className="text-xs uppercase tracking-wide text-fg-muted">{d.eyebrow}</p>}
                <h3 className="mt-1 font-heading text-lg text-fg">{d.title}</h3>
                {d.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{d.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="brand">{categoryLabel(entryCategory(d))}</Badge>
                  <Badge variant="muted">{
                    d.kind === "deck" ? `${d.slides?.length || 0} slides`
                    : d.kind === "pdf" ? "PDF"
                    : d.kind === "pptx" ? "PPTX"
                    : d.kind === "image" ? "Image"
                    // Copy authored in the platform (campaign email copy, call scripts). It has a
                    // body rather than a URL, so it must not be labelled — or opened — as a link.
                    : d.kind === "text" ? "Text"
                    : "Link"
                  }</Badge>
                  {d.campaignId && <Badge variant="outline">Campaign</Badge>}
                  {entryStatus(d) === "submitted" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending review</span>}
                  {entryStatus(d) === "returned" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Returned</span>}
                  {canReview && dupes.has(d.key) && <span className="rounded-full border border-amber-400 px-2 py-0.5 text-xs text-amber-700">Possible duplicate</span>}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {/* A text piece has a body, not a destination — Open would be a button that
                      does nothing, which is worse than no button. Show its length instead. */}
                  {d.kind === "text" && !d.url ? (
                    <Button size="sm" variant="outline" onClick={() => setPreview(d)}>
                      <FileText className="h-4 w-4" /> {isHtml(d.body) ? "Preview" : "Read"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => open(d)}>
                      {d.kind === "deck" ? <MonitorPlay className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />} Open
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => share(d)}>
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                  {d.url && d.url.includes("res.cloudinary.com") && (
                    <Button size="sm" variant="outline" onClick={() => window.open(downloadHref(d.url), "_blank", "noopener")}>
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  )}
                  {canReview && entryStatus(d) !== "posted" && (
                    <>
                      <Button size="sm" variant="primary" onClick={() => onApprove(d)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => onReturn(d)}>Return</Button>
                    </>
                  )}
                  {canManage && d.savedAt && (
                    <Button size="sm" variant="outline" onClick={() => onDelete(d)} aria-label="Remove"
                      className="ml-auto border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PreviewDialog entry={preview} onClose={() => setPreview(null)} />

      <StageDialog
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        tenantFolder={resolved.cloudinaryFolder}
        room={quota - saved.length}
        onStaged={(entries) => {
          let next = saved;
          for (const e of entries) next = addEntry(tenant, e);
          setSaved(next);
          setStageOpen(false);
          toast({ title: `${entries.length} piece${entries.length === 1 ? "" : "s"} staged for review`, tone: "success" });
        }}
      />

      <LoadDialog
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        tenantFolder={resolved.cloudinaryFolder}
        onSave={(entry) => {
          if (saved.length >= quota) { toast({ title: `Content Library full (${quota}/${quota})`, description: "Delete or download an item to add more.", tone: "error" }); return; }
          // Review gate OFF by default; per-client opt-in via resolved.reviewRequired.
          const needsReview = resolved.reviewRequired && !canReview;
          setSaved(addEntry(tenant, { ...entry, status: needsReview ? "submitted" : "posted" }));
          setLoadOpen(false);
          toast({ title: needsReview ? "Submitted for review" : "Added to the library", tone: "success" });
        }}
      />
    </div>
  );
}

// Dialog to load a finished proposal into the catalog. Three ways in: paste a URL, browse files,
// or drag & drop. Files (PDF / image) upload to Cloudinary and become the proposal link.
// (PowerPoint is intentionally NOT supported in-app — export to PDF first; PPTX is handled outside.)
function LoadDialog({ open, onClose, onSave, tenantFolder }) {
  const empty = { title: "", eyebrow: "", description: "", url: "", cover: "", kind: "link", category: "presentation" };
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);
  const { toast } = useToast();
  useEffect(() => { if (open) { setForm(empty); setFileName(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.title.trim() && form.url.trim();

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const up = await uploadFileAuto({ file, tenantFolder });
      const fmt = up.format;
      const kind = fmt === "pdf" ? "pdf"
        : (up.resourceType === "image" ? "image" : "link");
      // Auto cover: a PDF gets its FIRST PAGE rendered to a thumbnail; a plain image is its own cover.
      const autoCover = fmt === "pdf"
        ? pdfThumbUrl(up.publicId)
        : (up.resourceType === "image" && fmt !== "pdf" ? up.secureUrl : "");
      setForm((f) => ({
        ...f,
        url: up.secureUrl,
        kind,
        cover: autoCover || f.cover,
        title: f.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      setFileName(file.name);
      toast({ title: "File uploaded", tone: "success" });
    } catch (err) {
      toast({ title: "Upload failed", description: String(err?.message || err), tone: "error" });
    } finally { setUploading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load content</DialogTitle>
          <DialogDescription>Catalog a finished proposal so you can browse and share it. Paste a link, or upload a PDF or image.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <L label="Title *"><I value={form.title} onChange={set("title")} placeholder="e.g. Monti Trentini — Asiago Program" /></L>
          <L label="Category">
            <select value={form.category} onChange={set("category")} className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              {CONTENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </L>

          {/* Upload zone: browse + drag & drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={"flex flex-col items-center gap-2 rounded-base border-2 border-dashed p-5 text-center text-sm " + (dragOver ? "border-brand bg-surface" : "border-border")}
          >
            <input ref={fileRef} type="file" hidden onChange={(e) => handleFile(e.target.files?.[0])}
              accept=".pdf,image/*,application/pdf" />
            {uploading ? (
              <span className="flex items-center gap-2 text-fg-muted"><Upload className="h-4 w-4 animate-pulse" /> Uploading…</span>
            ) : fileName ? (
              <span className="flex items-center gap-2 text-fg"><FileText className="h-4 w-4 text-brand" /> {fileName}</span>
            ) : (
              <>
                <Upload className="h-6 w-6 text-fg-muted" />
                <span className="text-fg-muted">Drag &amp; drop a PDF or image — or <button type="button" className="font-medium text-brand underline" onClick={() => fileRef.current?.click()}>browse files</button></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-fg-muted"><span className="h-px flex-1 bg-border" />or paste a link<span className="h-px flex-1 bg-border" /></div>

          <L label="Proposal link">
            <I value={form.url} onChange={set("url")} placeholder="https://… (public PDF or page buyers can open)" />
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Eyebrow"><I value={form.eyebrow} onChange={set("eyebrow")} placeholder="Proposal · 2026" /></L>
            <L label="Cover image"><I value={form.cover} onChange={set("cover")} placeholder="Auto for PDF / image — or paste one" /></L>
          </div>
          <L label="Description"><I value={form.description} onChange={set("description")} placeholder="One line for the card" /></L>
          <p className="text-xs text-fg-muted">Upload a <b>PDF</b> and its first page becomes the cover automatically; PDFs &amp; images preview and open from the link. (PowerPoint? Export it to a PDF first — PPTX is handled outside the app.)</p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" disabled={uploading}>Cancel</Button></DialogClose>
          <Button variant="primary" disabled={!valid || uploading} onClick={() => onSave({ ...form, title: form.title.trim(), url: form.url.trim() })}>Add to catalog</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function L({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>{children}</label>;
}
function I(props) {
  return <input {...props} className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />;
}

export function DeckViewer({ deck, showBack, onBack, resolved }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef(null);
  const touch = useRef(null);
  const count = deck.slides.length;

  const go = (next) => setIndex((i) => Math.min(count - 1, Math.max(0, next ?? i)));
  const prev = () => go(index - 1);
  const next = () => go(index + 1);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setIndex((i) => Math.min(count - 1, i + 1)); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  }

  const preload = useMemo(
    () => [deck.slides[index + 1], deck.slides[index - 1]].filter((x) => typeof x === "string"),
    [deck.slides, index]
  );
  useEffect(() => { preload.forEach((src) => { const im = new Image(); im.src = src; }); }, [preload]);

  function onTouchStart(e) { touch.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    touch.current = null;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button size="sm" variant="ghost" onClick={onBack} aria-label="All presentations">
              <ArrowLeft className="h-4 w-4" /> All decks
            </Button>
          )}
          <div>
            {deck.eyebrow && <p className="text-xs uppercase tracking-wide text-fg-muted">{deck.eyebrow}</p>}
            <h1 className="font-heading text-2xl text-fg">{deck.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="muted">{index + 1} / {count}</Badge>
          <Button size="sm" variant="outline" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
          </Button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="group relative select-none overflow-hidden rounded-base border border-border bg-fg/95"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {typeof deck.slides[index] === "string" ? (
          <img
            src={deck.slides[index]}
            alt={`${deck.title} — slide ${index + 1}`}
            className="mx-auto block max-h-[82vh] w-full object-contain"
            draggable={false}
          />
        ) : (
          <SlideRenderer slide={deck.slides[index]} resolved={resolved} />
        )}
        <button
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous slide"
          className="absolute left-0 top-0 flex h-full w-1/4 items-center justify-start p-3 text-white/0 transition-colors hover:text-white/90 disabled:cursor-default disabled:hover:text-white/0"
        >
          <ChevronLeft className="h-9 w-9 drop-shadow" />
        </button>
        <button
          onClick={next}
          disabled={index === count - 1}
          aria-label="Next slide"
          className="absolute right-0 top-0 flex h-full w-1/4 items-center justify-end p-3 text-white/0 transition-colors hover:text-white/90 disabled:cursor-default disabled:hover:text-white/0"
        >
          <ChevronRight className="h-9 w-9 drop-shadow" />
        </button>
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {deck.slides.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === index ? "w-5 bg-white/90" : "w-1.5 bg-white/40")
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {deck.slides.map((src, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
            className={
              "h-16 w-28 shrink-0 overflow-hidden rounded-base border transition-colors " +
              (i === index ? "border-brand-primary ring-2 ring-brand-primary/40" : "border-border opacity-70 hover:opacity-100")
            }
          >
            {typeof src === "string"
              ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              : <SlideRenderer slide={src} resolved={resolved} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// Bulk-stage finished work into the review queue (Rick, 2026-08-03: "stage all content that has
// been created for review"). Everything lands as SUBMITTED — staging is not publishing.
//
// Files are read IN THE BROWSER. Nothing is copied into the repo and nothing is written to
// public/, which is served publicly — client copy must not become world-readable at a URL.
//
// Split per CONTENT_ORCHESTRATION_SPEC §4 (composition vs artifact):
//   · TEXT (.md/.html/.txt) is COPY. It becomes the entry's `body`. No Cloudinary — there is no
//     file to store, and round-tripping copy through a CDN would just give it a second home.
//   · BINARY (pdf/images) is an ARTIFACT. It uploads to Cloudinary via the same uploadFileAuto()
//     the Load dialog uses, and the catalog keeps the link + thumbnail.
const TEXT_EXT = /\.(md|markdown|html?|txt)$/i;

// Category from the filename — a guess the reviewer can correct, not a claim.
function guessCategory(name) {
  const n = name.toLowerCase();
  if (/script/.test(n)) return "call-script";
  if (/social|instagram|post/.test(n)) return "social-post";
  if (/blog|article|story/.test(n)) return "blog-post";
  if (/sell.?sheet|flyer|one.?sheet|sheet/.test(n)) return "presentation";
  if (/email|sequence|outreach|newsletter|nurture/.test(n)) return "email-campaign";
  return "presentation";
}
function prettyTitle(name) {
  return name.replace(/\.[^.]+$/, "").replace(/^\d+[_-]/, "")
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function StageDialog({ open, onClose, onStaged, tenantFolder, room }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(fileList) {
    setErr("");
    const files = [...fileList];
    const out = [];
    for (const f of files) {
      out.push({
        file: f,
        name: f.name,
        title: prettyTitle(f.name),
        category: guessCategory(f.name),
        isText: TEXT_EXT.test(f.name),
        include: true,
      });
    }
    setRows(out);
  }

  async function stage() {
    setBusy(true); setErr("");
    try {
      const chosen = rows.filter((r) => r.include);
      if (chosen.length > room) throw new Error(`Only ${room} slot${room === 1 ? "" : "s"} left in the library — deselect ${chosen.length - room} or raise the quota.`);
      const entries = [];
      for (const r of chosen) {
        if (r.isText) {
          const body = await r.file.text();
          entries.push({ title: r.title, category: r.category, kind: "text", body, status: "submitted" });
        } else {
          const up = await uploadFileAuto({ file: r.file, tenantFolder, subfolder: "library" });
          entries.push({
            title: r.title, category: r.category,
            kind: up.format === "pdf" ? "pdf" : "link",
            url: up.secureUrl,
            cover: up.format === "pdf" ? pdfThumbUrl(up.publicId) : up.publicId,
            status: "submitted",
          });
        }
      }
      onStaged(entries);
      setRows([]);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const chosen = rows.filter((r) => r.include).length;
  const uploads = rows.filter((r) => r.include && !r.isText).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stage files for review</DialogTitle>
          <DialogDescription>
            Everything lands as <strong>Submitted</strong> — review each piece, then Post or delete it.
            Text is read in your browser and stored as copy; PDFs and images upload to Cloudinary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            type="file" multiple
            accept=".md,.markdown,.html,.htm,.txt,.pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => pick(e.target.files)}
            className="block w-full text-sm text-fg file:mr-3 file:rounded-base file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
          />

          {rows.length > 0 && (
            <>
              <div className="max-h-80 overflow-y-auto rounded-base border border-border">
                {rows.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 border-b border-border p-2 last:border-0">
                    <input
                      type="checkbox" checked={r.include}
                      onChange={() => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, include: !x.include } : x)))}
                    />
                    <input
                      className="min-w-[12rem] flex-1 rounded-base border border-border bg-surface px-2 py-1 text-sm"
                      value={r.title}
                      onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    />
                    <select
                      className="rounded-base border border-border bg-surface px-2 py-1 text-xs"
                      value={r.category}
                      onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))}
                    >
                      {CONTENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <Badge variant="muted">{r.isText ? "Text" : "Upload"}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-fg-muted">
                {chosen} of {rows.length} selected · {room} slot{room === 1 ? "" : "s"} left
                {uploads > 0 && <> · {uploads} will upload to Cloudinary</>}
              </p>
            </>
          )}

          {err && <p className="text-sm text-error">{err}</p>}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="primary" onClick={stage} disabled={busy || chosen === 0}>
            {busy ? "Staging…" : `Stage ${chosen} for review`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A body that is a full HTML document / fragment rather than markdown or plain text. */
function isHtml(body) {
  const b = (body || "").trim().slice(0, 2000).toLowerCase();
  return b.startsWith("<!doctype html") || b.startsWith("<html") || /<(div|table|body|section|img|p)\b/.test(b);
}

// Read a staged piece without leaving the Library. HTML sell sheets and social posts are the
// point of this (Rick, 2026-08-03: "PDF, PowerPoint and HTML with images — sell sheets and
// social media posts") — those reference their images as absolute Cloudinary URLs, so the
// markup is self-contained and renders as the finished piece.
//
// SANDBOXED deliberately: srcdoc in an iframe with no allow-scripts and no allow-same-origin.
// Staged files are arbitrary documents from disk; they get to draw, not to run or to reach the
// session. Images still load, which is all a sell sheet needs.
function PreviewDialog({ entry, onClose }) {
  if (!entry) return null;
  const html = isHtml(entry.body);
  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{entry.title}</DialogTitle>
          <DialogDescription>
            {categoryLabel(entryCategory(entry))} · {html ? "rendered preview" : "plain text"} · not published until Posted
          </DialogDescription>
        </DialogHeader>
        {html ? (
          <iframe
            title={entry.title}
            sandbox=""
            srcDoc={entry.body}
            className="h-[65vh] w-full rounded-base border border-border bg-white"
          />
        ) : (
          <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-base border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {entry.body}
          </pre>
        )}
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Card thumbnail. Order of preference:
//   1. A real cover image (Cloudinary) — config decks and uploaded PDFs already have one.
//   2. For an HTML body, a LIVE scaled render of the document itself. No image generation, no
//      second asset to keep in sync, and it can never go stale against the copy it represents.
//   3. For markdown / plain text, the opening lines set small — a document-looking preview.
//   4. Otherwise the placeholder icon.
//
// The render is the same hard sandbox as the full preview (no scripts, no same-origin) plus
// pointer-events:none, so the card stays one click target rather than a live page you can poke.
// The document is rendered at a page-shaped design size and scaled to FIT ENTIRELY inside the
// card — both dimensions, not cropped to the top (Rick, 2026-08-03: "the whole doc shrunk to
// fit"). THUMB_HEIGHT is an assumption: a sandboxed iframe cannot be measured from outside
// (no allow-same-origin, deliberately), so the real document height is unknowable here. A long
// page is assumed; anything shorter simply leaves whitespace at the bottom of its thumbnail.
const THUMB_WIDTH = 1280;
const THUMB_HEIGHT = 1760;

function CardThumb({ entry }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(0);
  const html = entry.kind === "text" && isHtml(entry.body);

  // Scale is measured, not assumed — the grid is 1/2/3 columns depending on viewport, so a
  // hardcoded factor would be wrong at two of the three breakpoints.
  useEffect(() => {
    if (!html || !boxRef.current) return;
    const el = boxRef.current;
    // Fit, not fill: the smaller of the two ratios, so the whole page lands inside the box.
    const set = () => setScale(Math.min(el.clientWidth / THUMB_WIDTH, el.clientHeight / THUMB_HEIGHT));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  if (entry.cover) {
    return (
      <div className="aspect-[4/3] w-full overflow-hidden bg-bg">
        <img src={coverUrl(entry.cover, cldUrl)} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (html) {
    return (
      <div ref={boxRef} className="relative flex aspect-[4/3] w-full items-start justify-center overflow-hidden bg-neutral-100">
        {scale > 0 && (
          <div style={{ width: THUMB_WIDTH * scale, height: THUMB_HEIGHT * scale }} className="shadow-sm">
            <iframe
              title=""
              aria-hidden="true"
              tabIndex={-1}
              sandbox=""
              loading="lazy"
              srcDoc={entry.body}
              style={{
                border: 0, background: "#fff",
                width: `${THUMB_WIDTH}px`, height: `${THUMB_HEIGHT}px`,
                transform: `scale(${scale})`, transformOrigin: "top left",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (entry.kind === "text" && entry.body) {
    return (
      <div className="aspect-[4/3] w-full overflow-hidden bg-white p-3">
        <pre className="whitespace-pre-wrap font-mono text-[5px] leading-[1.5] text-neutral-600">
          {entry.body.slice(0, 1400)}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-bg text-fg-muted">
      <MonitorPlay className="h-8 w-8" />
    </div>
  );
}
