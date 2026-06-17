import { cldUrl } from "@/lib/cloudinary.js";
import { getBrandKit } from "@/lib/brandKit.js";

// Renders ONE slide (16:9), painted by the tenant's Brand Kit (colors via --cs-color-* vars, fonts via
// the global theme, logo + images via Cloudinary). Used by the composer preview AND DeckViewer.
// A structured slide = { t: templateId, slots: {...} }. A plain string is a legacy full-bleed image URL.
// Font sizes use cqw (container-query width) so text scales with the slide at any render size.
export function SlideRenderer({ slide, resolved, className = "" }) {
  return (
    <div
      className={"relative aspect-video w-full overflow-hidden bg-fg/95 " + className}
      style={{ containerType: "inline-size" }}
    >
      <SlideInner slide={slide} resolved={resolved} />
    </div>
  );
}

function SlideInner({ slide, resolved }) {
  // Legacy / config decks: a plain string is a full-bleed image URL.
  if (typeof slide === "string") {
    return <img src={slide} alt="" className="absolute inset-0 h-full w-full object-contain" />;
  }
  const kit = getBrandKit(resolved);
  const logo = kit?.identity?.logo?.primary;
  const s = slide?.slots || {};
  const t = slide?.t || "image";
  const img = (id, preset = "preview") => (id ? cldUrl(id, preset) : "");

  if (t === "cover") {
    return (
      <>
        {s.hero
          ? <img src={img(s.hero, "hero")} alt="" className="absolute inset-0 h-full w-full object-cover" />
          : <div className="absolute inset-0" style={{ background: "var(--cs-color-brand-primary)" }} />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.66))" }} />
        <div className="absolute inset-0 flex flex-col justify-end" style={{ padding: "6cqw", color: "#fff" }}>
          {logo && <img src={cldUrl(logo, "card")} alt="" className="mb-auto w-auto self-start object-contain" style={{ height: "11cqw" }} onError={(e) => (e.currentTarget.style.display = "none")} />}
          <h2 className="font-heading" style={{ fontStyle: "italic", fontSize: "5.4cqw", lineHeight: 1.05 }}>{s.title || "Title"}</h2>
          {s.tagline && <p className="font-heading" style={{ fontStyle: "italic", fontSize: "2.6cqw", opacity: 0.92, marginTop: "1.5cqw" }}>{s.tagline}</p>}
        </div>
      </>
    );
  }

  if (t === "statement") {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{ background: "var(--cs-color-brand-primary)", color: "var(--cs-color-on-primary)", padding: "8cqw" }}
      >
        <h2 className="font-heading" style={{ fontStyle: "italic", fontSize: "5.2cqw", lineHeight: 1.1 }}>{s.headline || "Your statement here"}</h2>
        {s.subtext && <p style={{ fontSize: "2.4cqw", opacity: 0.9, marginTop: "2.5cqw" }}>{s.subtext}</p>}
      </div>
    );
  }

  if (t === "story") {
    return (
      <div className="absolute inset-0 grid grid-cols-2" style={{ background: "var(--cs-color-surface)" }}>
        <div className="relative">
          {s.image
            ? <img src={img(s.image, "hero")} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <div className="h-full w-full" style={{ background: "var(--cs-color-brand-primary)" }} />}
        </div>
        <div className="flex flex-col justify-center" style={{ padding: "6cqw" }}>
          <h2 className="font-heading" style={{ fontStyle: "italic", fontSize: "3.6cqw", lineHeight: 1.1, color: "var(--cs-color-brand-primary)" }}>{s.heading || "Heading"}</h2>
          <p style={{ fontSize: "2.2cqw", lineHeight: 1.5, marginTop: "3cqw", color: "var(--cs-color-fg)" }}>{s.body || "Body copy — pull from a brand story block."}</p>
        </div>
      </div>
    );
  }

  // default: "image" (full-bleed)
  return s.hero
    ? <img src={img(s.hero)} alt="" className="absolute inset-0 h-full w-full object-contain" />
    : <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--cs-color-fg-muted)" }}>Pick an image</div>;
}
