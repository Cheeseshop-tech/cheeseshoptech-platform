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
import { loadCatalog, addEntry, removeEntry, updateEntry, coverUrl, CONTENT_CATEGORIES, categoryLabel, entryCategory, entryStatus, duplicateKeys, DEFAULT_QUOTA, downloadHref } from "@/lib/presentations-store.js";
import { MediaPicker } from "@/components/media/media-picker.jsx";
import { SlideRenderer } from "./slide-renderer.jsx";
import { SLIDE_TEMPLATES, getSlideTemplate, firstImageId } from "@/lib/slide-templates.js";
import { getBrandKit } from "@/lib/brandKit.js";

// Presentations = a CATALOG of finished proposals (built in the Proposals tool) to organize and SHARE.
// Config decks (image slide decks) still render in the built-in viewer; saved entries link out to the
// finished proposal (a public PDF/page) so buyers can open them. Catalog persists per-tenant in
// localStorage (same overlay model as the brand kit); a save backend drops in behind the same seam.
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
  useEffect(() => { setSaved(loadCatalog(tenant)); }, [tenant]);

  const entries = useMemo(() => [...saved, ...configDecks], [saved, configDecks]);

  const [activeKey, setActiveKey] = useState(null);
  const [loadOpen, setLoadOpen] = useState(false);
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
        </div>
        {canManage && (
          <div className="flex flex-col items-end gap-1">
            <Button variant="primary" disabled={saved.length >= quota} onClick={() => setLoadOpen(true)}>
              <Plus className="h-4 w-4" /> Load content
            </Button>
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
                <div className="aspect-video w-full overflow-hidden bg-bg">
                  {d.cover
                    ? <img src={coverUrl(d.cover, cldUrl)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-fg-muted"><MonitorPlay className="h-8 w-8" /></div>}
                </div>
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
                    : "Link"
                  }</Badge>
                  {entryStatus(d) === "submitted" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending review</span>}
                  {entryStatus(d) === "returned" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Returned</span>}
                  {canReview && dupes.has(d.key) && <span className="rounded-full border border-amber-400 px-2 py-0.5 text-xs text-amber-700">Possible duplicate</span>}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => open(d)}>
                    {d.kind === "deck" ? <MonitorPlay className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />} Open
                  </Button>
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

// Compose a slide deck from TEMPLATES (Template Engine v1 — TEMPLATE_ENGINE_SPEC.md). Each slide picks a
// template (Image / Cover / Statement / Story); slots are filled from the Media Hub (image), brand voice
// (copy), or free text, and the slide is painted by the Brand Kit via SlideRenderer. Saves a LINK-BASED
// "deck" entry (structured slides {t,slots} — references, no upload). Plays in DeckViewer; shares by link.
export function DeckComposer({ open, onClose, onSave, resolved }) {
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [slides, setSlides] = useState([]); // [{ t, slots }]
  const [tpl, setTpl] = useState(SLIDE_TEMPLATES[0].id);
  const [editIndex, setEditIndex] = useState(null);
  useEffect(() => { if (open) { setTitle(""); setEyebrow(""); setSlides([]); setTpl(SLIDE_TEMPLATES[0].id); setEditIndex(null); } }, [open]);

  const kit = getBrandKit(resolved);
  const copyOptions = [
    ...(kit?.storyBlocks || []).map((b) => ({ label: `Story — ${b.title}`, value: b.body })),
    ...(kit?.storyTopics || []).map((t) => ({ label: `Topic — ${t.title}`, value: t.line })),
    ...(kit?.voice?.readyPhrases || []).map((p, i) => ({ label: `Phrase ${i + 1}`, value: p })),
  ];

  const addSlide = () => { setEditIndex(slides.length); setSlides((s) => [...s, { t: tpl, slots: {} }]); };
  const removeSlide = (i) => { setEditIndex(null); setSlides((s) => s.filter((_, k) => k !== i)); };
  const move = (i, dir) => setSlides((s) => { const n = [...s]; const j = i + dir; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const setSlot = (i, key, val) => setSlides((s) => s.map((sl, k) => (k === i ? { ...sl, slots: { ...sl.slots, [key]: val } } : sl)));

  const valid = title.trim() && slides.length > 0;
  function save() {
    const coverId = slides.map(firstImageId).find(Boolean);
    onSave({
      title: title.trim(),
      eyebrow: eyebrow.trim(),
      kind: "deck",
      category: "slide-deck",
      cover: coverId ? cldUrl(coverId, "card") : "",
      slides,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose a slide deck</DialogTitle>
          <DialogDescription>Pick a template per slide and fill the slots — each paints in {resolved.brand.name}'s brand. Saved link-based; plays + shares from the Content Library.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <L label="Title *"><I value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monti Trentini — Asiago Story" /></L>
            <L label="Eyebrow"><I value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Presentation · 2026" /></L>
          </div>

          <div className="flex items-end gap-2">
            <L label="Add a slide">
              <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {SLIDE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </L>
            <Button variant="outline" onClick={addSlide}><Plus className="h-4 w-4" /> Add</Button>
          </div>

          {slides.length === 0 ? (
            <p className="rounded-base border border-dashed border-border p-4 text-center text-xs text-fg-muted">No slides yet — choose a template and Add. Each slide paints in the brand automatically.</p>
          ) : (
            <div className="space-y-2">
              {slides.map((sl, i) => {
                const tplDef = getSlideTemplate(sl.t);
                const editing = editIndex === i;
                return (
                  <div key={i} className="rounded-base border border-border bg-bg p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs text-fg-muted">{i + 1}</span>
                      <div className="h-12 w-20 flex-none overflow-hidden rounded-base border border-border"><SlideRenderer slide={sl} resolved={resolved} /></div>
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{tplDef.label}</span>
                      <button type="button" onClick={() => setEditIndex(editing ? null : i)} className="rounded px-2 py-1 text-xs font-medium text-brand-primary hover:underline">{editing ? "Done" : "Edit"}</button>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 text-fg-muted hover:text-fg disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Move down" className="rounded p-1 text-fg-muted hover:text-fg disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => removeSlide(i)} aria-label="Remove" className="rounded p-1 text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                    </div>
                    {editing && (
                      <div className="mt-2 space-y-2 border-t border-border pt-2 pl-7">
                        {tplDef.slots.map((slot) => (
                          <L key={slot.key} label={slot.label}>
                            {slot.type === "image" ? (
                              <MediaPicker resolved={resolved} value={sl.slots[slot.key] || ""} defaultTag="" label={`Pick ${slot.label.toLowerCase()}`} onChange={(id) => setSlot(i, slot.key, id)} />
                            ) : slot.type === "brandCopy" ? (
                              <div className="space-y-1">
                                <select value="" onChange={(e) => { if (e.target.value) setSlot(i, slot.key, e.target.value); }} className="h-8 w-full rounded-base border border-border bg-bg px-2 text-xs text-fg">
                                  <option value="">Insert from brand voice…</option>
                                  {copyOptions.map((o, k) => <option key={k} value={o.value}>{o.label}</option>)}
                                </select>
                                <textarea value={sl.slots[slot.key] || ""} onChange={(e) => setSlot(i, slot.key, e.target.value)} rows={2} placeholder="…or type" className="w-full rounded-base border border-border bg-bg px-2 py-1 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                              </div>
                            ) : (
                              <I value={sl.slots[slot.key] || ""} onChange={(e) => setSlot(i, slot.key, e.target.value)} placeholder={slot.label} />
                            )}
                          </L>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="primary" disabled={!valid} onClick={save}>Save deck to library</Button>
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
