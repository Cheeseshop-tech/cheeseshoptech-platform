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

  if (t === "threeUp") {
    const cells = [["img1", "cap1"], ["img2", "cap2"], ["img3", "cap3"]];
    return (
      <div className="absolute inset-0 flex flex-col" style={{ background: "var(--cs-color-surface)", padding: "5cqw" }}>
        {s.heading && <h2 className="font-heading" style={{ fontStyle: "italic", fontSize: "3.4cqw", lineHeight: 1.1, color: "var(--cs-color-brand-primary)", marginBottom: "3cqw", textAlign: "center" }}>{s.heading}</h2>}
        <div className="grid flex-1 grid-cols-3" style={{ gap: "3cqw" }}>
          {cells.map(([ik, ck]) => (
            <div key={ik} className="flex min-h-0 flex-col">
              <div className="relative w-full flex-1 overflow-hidden" style={{ borderRadius: "1.5cqw" }}>
                {s[ik]
                  ? <img src={img(s[ik], "hero")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  : <div className="h-full w-full" style={{ background: "var(--cs-color-brand-primary)", opacity: 0.15 }} />}
              </div>
              {s[ck] && <p style={{ fontSize: "1.9cqw", lineHeight: 1.35, marginTop: "1.6cqw", color: "var(--cs-color-fg)", textAlign: "center" }}>{s[ck]}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === "stat") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: "var(--cs-color-brand-primary)", color: "var(--cs-color-on-primary)", padding: "8cqw" }}>
        <div className="font-heading" style={{ fontSize: "18cqw", lineHeight: 1, fontWeight: 700 }}>{s.value || "300%"}</div>
        {s.label && <p style={{ fontSize: "3cqw", opacity: 0.92, marginTop: "2cqw", maxWidth: "82%" }}>{s.label}</p>}
      </div>
    );
  }

  if (t === "quote") {
    return (
      <div className="absolute inset-0 flex flex-col justify-center" style={{ background: "var(--cs-color-surface)", padding: "9cqw" }}>
        <div className="font-heading" style={{ fontSize: "14cqw", lineHeight: 0.7, color: "var(--cs-color-brand-primary)", opacity: 0.5 }}>&ldquo;</div>
        <p className="font-heading" style={{ fontStyle: "italic", fontSize: "4.2cqw", lineHeight: 1.25, color: "var(--cs-color-fg)", marginTop: "-2cqw" }}>{s.quote || "A line worth quoting."}</p>
        {s.attribution && <p style={{ fontSize: "2.2cqw", color: "var(--cs-color-fg-muted)", marginTop: "3cqw" }}>— {s.attribution}</p>}
      </div>
    );
  }

  if (t === "range") {
    const cells = [["img1", "name1"], ["img2", "name2"], ["img3", "name3"]];
    return (
      <div className="absolute inset-0 flex flex-col" style={{ background: "var(--cs-color-surface)", padding: "5cqw" }}>
        {s.heading && <h2 className="font-heading" style={{ fontStyle: "italic", fontSize: "3.4cqw", lineHeight: 1.1, color: "var(--cs-color-brand-primary)", marginBottom: "3cqw", textAlign: "center" }}>{s.heading}</h2>}
        <div className="grid flex-1 grid-cols-3" style={{ gap: "3cqw" }}>
          {cells.map(([ik, nk]) => (
            <div key={ik} className="flex min-h-0 flex-col overflow-hidden" style={{ background: "#fff", borderRadius: "1.6cqw", boxShadow: "0 0.4cqw 1.2cqw rgba(0,0,0,.08)" }}>
              <div className="relative w-full flex-1">
                {s[ik]
                  ? <img src={img(s[ik], "hero")} alt="" className="absolute inset-0 h-full w-full object-contain" style={{ padding: "2cqw" }} />
                  : <div className="h-full w-full" style={{ background: "var(--cs-color-brand-primary)", opacity: 0.08 }} />}
              </div>
              {s[nk] && <p style={{ fontSize: "1.9cqw", fontWeight: 600, textAlign: "center", color: "var(--cs-color-brand-primary)", padding: "1.6cqw" }}>{s[nk]}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === "closing") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: "var(--cs-color-brand-primary)", color: "var(--cs-color-on-primary)", padding: "8cqw" }}>
        {logo && <img src={cldUrl(logo, "card")} alt="" className="object-contain" style={{ height: "10cqw", marginBottom: "4cqw" }} onError={(e) => (e.currentTarget.style.display = "none")} />}
        <h2 className="font-heading" style={{ fontStyle: "italic", fontSize: "5.4cqw", lineHeight: 1.1 }}>{s.headline || "Let's talk."}</h2>
        {s.cta && <div style={{ marginTop: "4cqw", border: "0.3cqw solid currentColor", borderRadius: "999px", padding: "1.6cqw 4cqw", fontSize: "2.4cqw" }}>{s.cta}</div>}
        {s.contact && <p style={{ fontSize: "2.2cqw", opacity: 0.9, marginTop: "3cqw" }}>{s.contact}</p>}
      </div>
    );
  }

  // default: "image" (full-bleed)
  return s.hero
    ? <img src={img(s.hero)} alt="" className="absolute inset-0 h-full w-full object-contain" />
    : <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--cs-color-fg-muted)" }}>Pick an image</div>;
}
