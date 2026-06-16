import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, ArrowLeft, MonitorPlay,
  Plus, Share2, ExternalLink, Trash2,
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
import { cldUrl } from "@/lib/cloudinary.js";
import { loadCatalog, addEntry, removeEntry, coverUrl } from "@/lib/presentations-store.js";

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

  // Config decks (image slide decks) → normalize to catalog entries of kind "deck".
  const configDecks = useMemo(
    () => (resolved.presentations || []).map((d) => ({ ...d, kind: "deck", cover: d.slides?.[0] })),
    [resolved.presentations]
  );
  const [saved, setSaved] = useState([]);
  useEffect(() => { setSaved(loadCatalog(tenant)); }, [tenant]);

  const entries = useMemo(() => [...saved, ...configDecks], [saved, configDecks]);

  const [activeKey, setActiveKey] = useState(null);
  const [loadOpen, setLoadOpen] = useState(false);
  const active = entries.find((d) => d.key === activeKey && d.kind === "deck");

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
    return <DeckViewer deck={active} showBack onBack={() => setActiveKey(null)} />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-heading text-3xl text-fg">Presentations</h1>
          <p className="text-fg-muted">{resolved.brand.name}'s finished proposals — catalog &amp; share.</p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => setLoadOpen(true)}>
            <Plus className="h-4 w-4" /> Load presentation
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="No presentations catalogued yet"
          description={canManage
            ? "Build a proposal in the Proposals tool, then Load it here to catalog and share it."
            : "Finished proposals will appear here."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((d) => (
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
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="muted">{d.kind === "deck" ? `${d.slides?.length || 0} slides` : (d.kind === "pdf" ? "PDF" : "Link")}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => open(d)}>
                    {d.kind === "deck" ? <MonitorPlay className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />} Open
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => share(d)}>
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
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
        onSave={(entry) => {
          setSaved(addEntry(tenant, entry));
          setLoadOpen(false);
          toast({ title: "Added to catalog", tone: "success" });
        }}
      />
    </div>
  );
}

// Dialog to load a finished proposal into the catalog. The proposal lives elsewhere (a public PDF
// or page); we store its link + a cover so it can be browsed and shared.
function LoadDialog({ open, onClose, onSave }) {
  const empty = { title: "", eyebrow: "", description: "", url: "", cover: "", kind: "link" };
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.title.trim() && form.url.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load a presentation</DialogTitle>
          <DialogDescription>Catalog a finished proposal so you can browse and share it. Build proposals in the Proposals tool, then publish/export to a shareable link or PDF and add it here.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <L label="Title *"><I value={form.title} onChange={set("title")} placeholder="e.g. Monti Trentini — Asiago Program" /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Eyebrow"><I value={form.eyebrow} onChange={set("eyebrow")} placeholder="Proposal · 2026" /></L>
            <L label="Type">
              <select value={form.kind} onChange={set("kind")} className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <option value="link">Link (web page)</option>
                <option value="pdf">PDF</option>
              </select>
            </L>
          </div>
          <L label="Proposal link *">
            <I value={form.url} onChange={set("url")} placeholder="https://… (public PDF or page buyers can open)" />
          </L>
          <L label="Cover image">
            <I value={form.cover} onChange={set("cover")} placeholder="Image URL, or a Cloudinary public_id (e.g. monti-trentini/library/asiago-dop-famiglia)" />
          </L>
          <L label="Description"><I value={form.description} onChange={set("description")} placeholder="One line for the card" /></L>
          <p className="text-xs text-fg-muted">Tip: a public Cloudinary PDF/image link is buyer-ready — anyone with the link can open it, no login.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="primary" disabled={!valid} onClick={() => onSave({ ...form, title: form.title.trim(), url: form.url.trim() })}>Add to catalog</Button>
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

export function DeckViewer({ deck, showBack, onBack }) {
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
    () => [deck.slides[index + 1], deck.slides[index - 1]].filter(Boolean),
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
        <img
          src={deck.slides[index]}
          alt={`${deck.title} — slide ${index + 1}`}
          className="mx-auto block max-h-[82vh] w-full object-contain"
          draggable={false}
        />
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
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
