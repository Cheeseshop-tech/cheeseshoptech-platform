import { useState } from "react";
import { Plus, ArrowLeft, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { MediaPicker } from "@/components/media/media-picker.jsx";
import { SlideRenderer } from "./slide-renderer.jsx";
import { SLIDE_TEMPLATES, getSlideTemplate, firstImageId } from "@/lib/slide-templates.js";
import { voiceOptions } from "@/lib/brand-tokens.js";
import { directDraft } from "@/lib/studio-director.js";
import { useAuth } from "@/lib/auth-context.jsx";
import { cldUrl } from "@/lib/cloudinary.js";

// Full-window Content Studio composer. A content-type switcher (slide deck live; others coming soon),
// a slide filmstrip, a per-slide template dropdown, and a slot inspector beside the live brand-painted
// preview. Saves a link-based deck to the Content Library via onSave.
const CONTENT_TYPES = [
  { id: "slide-deck", label: "Slide deck" },
  { id: "blog", label: "Blog" },
  { id: "email", label: "Email" },
  { id: "social-post", label: "Social post" },
  { id: "social-carousel", label: "Social carousel" },
  { id: "sales-sheet", label: "Sales sheet" },
];

function L({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-fg">{label}</span>{children}</label>;
}
// Per-image adjust: fit, zoom (resize), reposition, skew.
function AdjustPanel({ slot, slide, onSet, onReset }) {
  const a = { fit: "cover", scale: 1, x: 50, y: 50, skewX: 0, skewY: 0, ...((slide.slots.__img || {})[slot.id] || {}) };
  const sliders = [["Zoom (resize)", "scale", 1, 3, 0.05], ["Horizontal", "x", 0, 100, 1], ["Vertical", "y", 0, 100, 1], ["Skew X", "skewX", -25, 25, 1], ["Skew Y", "skewY", -25, 25, 1]];
  return (
    <div className="mt-2 rounded-base border border-border bg-bg p-2">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Adjust image</div>
      <div className="mb-2 flex gap-1.5">
        {["cover", "contain"].map((f) => (
          <button key={f} type="button" onClick={() => onSet(slot.id, "fit", f)} className={"rounded border px-2.5 py-0.5 text-xs capitalize " + (a.fit === f ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-border text-fg")}>{f}</button>
        ))}
      </div>
      {sliders.map(([label, key, min, max, step]) => (
        <label key={key} className="mb-1.5 block text-[11px] text-fg-muted">{label}
          <input type="range" min={min} max={max} step={step} value={a[key]} onChange={(e) => onSet(slot.id, key, parseFloat(e.target.value))} className="w-full" />
        </label>
      ))}
      <button type="button" onClick={() => onReset(slot.id)} className="text-[11px] text-amber-700 hover:underline">Reset image</button>
    </div>
  );
}
function I(props) {
  return <input {...props} className="h-9 w-full rounded-base border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />;
}

export function SlideStudio({ resolved, onClose, onSave, opportunity }) {
  const [ctype, setCtype] = useState("slide-deck");
  const [deck, setDeck] = useState([]);   // [{ t, slots }]
  const [idx, setIdx] = useState(0);
  const [title, setTitle] = useState("");
  const [tpl, setTpl] = useState(SLIDE_TEMPLATES[0].id);
  const [composing, setComposing] = useState(false);
  const { user } = useAuth();
  const voice = voiceOptions(resolved);

  // Studio Director Stage 0/1 (CONTENT_ENGINE_WIRING_SPEC §3): deterministic auto-fill —
  // kit voice → text slots, Media Hub → image slots, catalog → product slots, optional
  // opportunity seed. Human's job collapses to review-and-swap. Stage 2 (AI) plugs in behind
  // the same call later.
  async function autoCompose() {
    setComposing(true);
    try {
      const draft = await directDraft({ resolved, user, opportunity });
      if (draft) {
        setDeck(draft.deck);
        setTitle((t) => t || draft.title);
        setIdx(0);
      }
    } finally { setComposing(false); }
  }

  const setSlot = (key, val) => setDeck((d) => d.map((sl, k) => (k === idx ? { ...sl, slots: { ...sl.slots, [key]: val } } : sl)));
  const setOff = (id, hidden) => setDeck((d) => d.map((sl, k) => {
    if (k !== idx) return sl;
    const off = { ...(sl.slots.__off || {}) };
    if (hidden) off[id] = true; else delete off[id];
    return { ...sl, slots: { ...sl.slots, __off: off } };
  }));
  const addSlide = (tid) => { const t = tid || tpl; setIdx(deck.length); setDeck((d) => [...d, { t, slots: { ...(getSlideTemplate(t).sample || {}) } }]); };
  const removeSlide = (i) => { const n = deck.filter((_, k) => k !== i); setDeck(n); setIdx((x) => Math.max(0, Math.min(x, n.length - 1))); };
  const clearSlide = () => setDeck((d) => d.map((sl, k) => (k === idx ? { ...sl, slots: {} } : sl)));
  const setImgAdj = (id, key, val) => setDeck((d) => d.map((sl, k) => {
    if (k !== idx) return sl;
    const img = { ...(sl.slots.__img || {}) };
    const a = img[id] = { fit: "cover", scale: 1, x: 50, y: 50, skewX: 0, skewY: 0, ...(img[id] || {}) };
    a[key] = val;
    return { ...sl, slots: { ...sl.slots, __img: img } };
  }));
  const clearImgAdj = (id) => setDeck((d) => d.map((sl, k) => {
    if (k !== idx) return sl;
    const img = { ...(sl.slots.__img || {}) }; delete img[id];
    return { ...sl, slots: { ...sl.slots, __img: img } };
  }));

  const cur = deck[idx];
  const curTpl = cur ? getSlideTemplate(cur.t) : null;
  const valid = deck.length > 0 && (title.trim() || deck[0]?.slots?.slide_title);

  function save() {
    const coverId = deck.map(firstImageId).find(Boolean);
    onSave({
      title: title.trim() || deck[0]?.slots?.slide_title || "Untitled deck",
      kind: "deck", category: "slide-deck",
      cover: coverId ? cldUrl(coverId, "card") : "",
      slides: deck,
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {onClose
          ? <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4" /> Back</Button>
          : <div><h1 className="font-heading text-3xl text-fg">Content Studio</h1><p className="text-sm text-fg-muted">Pick a template, fill it from your Media Hub + brand voice, save to the Library.</p></div>}
        <Button variant="primary" size="sm" disabled={!valid} onClick={save}>Save to Library</Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
        {CONTENT_TYPES.map((t) => (
          <button key={t.id} onClick={() => setCtype(t.id)}
            className={"rounded-full border px-4 py-1.5 text-sm transition " + (t.id === ctype ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-border bg-bg text-fg hover:bg-fg/5")}>
            {t.label}
          </button>
        ))}
      </div>

      {ctype !== "slide-deck" ? (
        <div className="rounded-base border border-dashed border-border bg-bg p-12 text-center">
          <h2 className="font-heading text-2xl text-brand-primary">{CONTENT_TYPES.find((t) => t.id === ctype)?.label} templates</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-fg-muted">
            Coming soon — built on the same engine: slots + Brand-Kit paint + Media Hub / Cloudinary bindings, sized for {CONTENT_TYPES.find((t) => t.id === ctype)?.label.toLowerCase()}. The slide-deck builder proves the model; each type ships as manifests wired to the image selector.
          </p>
        </div>
      ) : deck.length === 0 ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-base border border-border bg-surface p-4">
            <Wand2 className="h-5 w-5 flex-none text-brand-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">Let the Director set the table</p>
              <p className="text-xs text-fg-muted">
                Auto-compose a full deck from your brand kit, Media Hub photography and catalog —
                deterministic, no AI. You review and swap; nothing is invented.
              </p>
            </div>
            <Button variant="primary" size="sm" disabled={composing} onClick={autoCompose}>
              <Wand2 className="h-4 w-4" /> {composing ? "Composing…" : "Auto-compose"}
            </Button>
          </div>
          <p className="mb-3 text-sm text-fg-muted">Or pick a template for your first slide — each opens painted in {resolved.brand?.name || "the"} brand. Every template carries a required Title.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SLIDE_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => addSlide(t.id)} className="overflow-hidden rounded-base border border-border bg-bg text-left transition hover:border-brand-primary hover:shadow">
                <SlideRenderer slide={{ t: t.id, slots: { ...(t.sample || {}) } }} resolved={resolved} present />
                <div className="flex items-center justify-between p-2"><span className="text-sm font-medium text-fg">{t.label}</span><span className="text-xs text-fg-muted">{t.tag}</span></div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>◀ Prev</Button>
            <span className="text-sm text-fg-muted">Slide {idx + 1} / {deck.length}</span>
            <Button variant="outline" size="sm" disabled={idx >= deck.length - 1} onClick={() => setIdx(idx + 1)}>Next ▶</Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="h-9 rounded-base border border-border bg-bg px-2 text-sm text-fg">
              {SLIDE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={() => addSlide()}><Plus className="h-4 w-4" /> Add slide</Button>
            <Button variant="outline" size="sm" disabled={composing} onClick={autoCompose} title="Replace the deck with a Director auto-compose (Stage 0 — deterministic)">
              <Wand2 className="h-4 w-4" /> {composing ? "Composing…" : "Auto-compose"}
            </Button>
            <span className="flex-1" />
            <Button variant="ghost" size="sm" onClick={clearSlide}>Clear slide</Button>
            <Button variant="ghost" size="sm" onClick={() => removeSlide(idx)}><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-hidden rounded-base border border-border shadow-sm">
              <SlideRenderer slide={cur} resolved={resolved} />
            </div>
            <div className="rounded-base border border-border bg-bg p-3">
              <h3 className="mb-2 font-heading text-lg text-brand-primary">{curTpl.label}</h3>
              <div className="space-y-2">
                {curTpl.slots.filter((s) => s.role === "var" || s.role === "brand" || s.toggle).map((slot) => (
                  <L key={slot.id} label={slot.label || slot.id}>
                    {slot.toggle && (
                      <label className="mb-1 flex items-center gap-2 text-xs text-fg-muted">
                        <input type="checkbox" checked={!(cur.slots.__off && cur.slots.__off[slot.id])} onChange={(e) => setOff(slot.id, !e.target.checked)} /> Show on this slide
                      </label>
                    )}
                    {slot.kind === "image" ? (
                      <>
                        <MediaPicker resolved={resolved} value={cur.slots[slot.id] || ""} defaultTag={slot.tag || ""} label={`Pick ${(slot.label || "image").toLowerCase()}`} onChange={(id) => setSlot(slot.id, id)} />
                        {cur.slots[slot.id] && <AdjustPanel slot={slot} slide={cur} onSet={setImgAdj} onReset={clearImgAdj} />}
                      </>
                    ) : slot.as === "story" ? (
                      <div className="space-y-1">
                        <select value="" onChange={(e) => { if (e.target.value) { const o = JSON.parse(e.target.value); setSlot(slot.id, { headline: o.h, narrative: o.n }); } }} className="h-8 w-full rounded-base border border-border bg-bg px-2 text-xs text-fg">
                          <option value="">Insert from brand voice…</option>
                          {voice.stories.map((o, k) => <option key={k} value={JSON.stringify({ h: o.title.toUpperCase(), n: o.body })}>{o.title}</option>)}
                        </select>
                        <textarea value={(cur.slots[slot.id] || {}).headline || ""} onChange={(e) => setSlot(slot.id, { ...(cur.slots[slot.id] || {}), headline: e.target.value })} rows={2} placeholder="Headline" className="w-full rounded-base border border-border bg-bg px-2 py-1 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                        <textarea value={(cur.slots[slot.id] || {}).narrative || ""} onChange={(e) => setSlot(slot.id, { ...(cur.slots[slot.id] || {}), narrative: e.target.value })} rows={2} placeholder="Narrative" className="w-full rounded-base border border-border bg-bg px-2 py-1 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <select value="" onChange={(e) => { if (e.target.value) setSlot(slot.id, e.target.value); }} className="h-8 w-full rounded-base border border-border bg-bg px-2 text-xs text-fg">
                          <option value="">Insert from brand voice…</option>
                          {voice.phrases.length > 0 && <optgroup label="Ready phrases">{voice.phrases.map((p, k) => <option key={k} value={p}>{p}</option>)}</optgroup>}
                          {voice.stories.length > 0 && <optgroup label="Story titles">{voice.stories.map((s2, k) => <option key={k} value={s2.title}>{s2.title}</option>)}</optgroup>}
                          {voice.lines.length > 0 && <optgroup label="Brand lines">{voice.lines.map((l, k) => <option key={k} value={l.text}>{l.label}: {l.text}</option>)}</optgroup>}
                        </select>
                        <I value={cur.slots[slot.id] || ""} onChange={(e) => setSlot(slot.id, e.target.value)} placeholder={slot.label} />
                      </div>
                    )}
                  </L>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {deck.map((sl, i) => (
              <button key={i} onClick={() => setIdx(i)} className={"relative w-40 flex-none overflow-hidden rounded-base border-2 " + (i === idx ? "border-brand-primary" : "border-border opacity-80 hover:opacity-100")}>
                <span className="absolute left-1 top-1 z-10 rounded bg-black/55 px-1.5 text-[10px] text-white">{i + 1}</span>
                <SlideRenderer slide={sl} resolved={resolved} present />
              </button>
            ))}
            <button onClick={() => addSlide()} className="grid aspect-video w-40 flex-none place-items-center rounded-base border-2 border-dashed border-border text-sm text-fg-muted hover:bg-fg/5">
              <span className="text-center"><Plus className="mx-auto h-4 w-4" /> Add slide</span>
            </button>
          </div>

          <div className="mt-4 max-w-md">
            <L label="Deck title (for the Library)"><I value={title} onChange={(e) => setTitle(e.target.value)} placeholder={deck[0]?.slots?.slide_title || "e.g. Monti Trentini — Asiago Story"} /></L>
          </div>
        </div>
      )}
    </div>
  );
}
