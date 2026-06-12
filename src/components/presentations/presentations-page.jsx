import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, ArrowLeft, MonitorPlay } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";

// Presentations tool — the platform port of the standalone Trade Portal slide decks
// (Phase C of DEVELOPMENT_PLAN.md). Generic + config-driven: any tenant with a
// `presentations` block gets this page. One responsive viewer replaces the separate
// desktop/mobile builds; slides are plain image URLs (local /presentations/<id>/… now,
// Cloudinary later — config-only swap).
export function PresentationsPage({ resolved }) {
  const decks = resolved.presentations || [];
  const [activeKey, setActiveKey] = useState(decks.length === 1 ? decks[0].key : null);
  const active = decks.find((d) => d.key === activeKey);

  if (!decks.length) {
    return (
      <div>
        <h1 className="mb-1 font-heading text-3xl text-fg">Presentations</h1>
        <p className="mb-6 text-fg-muted">Buyer-facing decks for {resolved.brand.name}.</p>
        <EmptyState
          icon={MonitorPlay}
          title="No presentations yet"
          description="Add a presentations block to this tenant's config to publish a deck."
        />
      </div>
    );
  }

  if (active) {
    return (
      <DeckViewer
        deck={active}
        showBack={decks.length > 1}
        onBack={() => setActiveKey(null)}
      />
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-heading text-3xl text-fg">Presentations</h1>
      <p className="mb-6 text-fg-muted">{resolved.brand.name}'s buyer-facing decks.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => (
          <Card
            key={d.key}
            onClick={() => setActiveKey(d.key)}
            className="group cursor-pointer overflow-hidden p-0 transition-colors hover:border-brand-primary"
          >
            <div className="aspect-video w-full overflow-hidden bg-bg">
              <img src={d.slides[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              {d.eyebrow && <p className="text-xs uppercase tracking-wide text-fg-muted">{d.eyebrow}</p>}
              <h3 className="mt-1 font-heading text-lg text-fg">{d.title}</h3>
              {d.description && <p className="mt-1 text-sm text-fg-muted">{d.description}</p>}
              <Badge variant="muted" className="mt-3">{d.slides.length} slides</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DeckViewer({ deck, showBack, onBack }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef(null);
  const touch = useRef(null);
  const count = deck.slides.length;

  const go = (next) => setIndex((i) => Math.min(count - 1, Math.max(0, next ?? i)));
  const prev = () => go(index - 1);
  const next = () => go(index + 1);

  // Keyboard: arrows + space advance, Esc exits fullscreen.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setIndex((i) => Math.min(count - 1, i + 1)); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  // Native fullscreen on the stage; state follows the fullscreenchange event.
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  }

  // Preload the neighbouring slides so swiping never shows a blank frame.
  const preload = useMemo(
    () => [deck.slides[index + 1], deck.slides[index - 1]].filter(Boolean),
    [deck.slides, index]
  );
  useEffect(() => { preload.forEach((src) => { const im = new Image(); im.src = src; }); }, [preload]);

  // Touch swipe (the reason the old build needed a separate mobile site).
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
