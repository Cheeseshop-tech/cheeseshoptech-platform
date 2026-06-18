import { useLayoutEffect, useRef } from "react";
import { cldUrl } from "@/lib/cloudinary.js";
import { getSlideTemplate } from "@/lib/slide-templates.js";
import { brandTokens, resolveTok } from "@/lib/brand-tokens.js";

// Renders ONE slide (16:9) from its manifest, painted by the tenant's Brand Kit via tokens. Font sizes use
// cqw (container-query width) so text scales with the slide at any render size, then an auto-fit pass shrinks
// each text slot to fit its box. Used by the composer preview, DeckViewer, and proposal view.
// A structured slide = { t, slots }. A plain string is a legacy full-bleed image URL.
const ptToCqw = (pt, cw) => (pt * 96 / 72) / cw * 100;
const pct = (v, t) => (v / t * 100) + "%";

export function SlideRenderer({ slide, resolved, className = "", present = false }) {
  const tk = brandTokens(resolved);
  return (
    <div
      className={"relative aspect-video w-full overflow-hidden " + className}
      style={{ containerType: "inline-size", background: tk.colors.cream }}
    >
      <SlideInner slide={slide} tk={tk} present={present} />
    </div>
  );
}

function SlideInner({ slide, tk, present }) {
  if (!slide) return null;
  if (typeof slide === "string") {
    return <img src={slide} alt="" className="absolute inset-0 h-full w-full object-contain" />;
  }
  const tpl = getSlideTemplate(slide.t);
  const slots = slide.slots || {};
  const off = slots.__off || {};
  const cw = tpl.canvas?.w || 960, ch = tpl.canvas?.h || 540;
  const ordered = [...tpl.slots].sort((a, b) => (a.z || 0) - (b.z || 0));

  return (
    <>
      {ordered.map((slot, idx) => {
        if (off[slot.id]) return null;
        const box = { position: "absolute", left: pct(slot.x, cw), top: pct(slot.y, ch), width: pct(slot.w, cw), height: pct(slot.h, ch), zIndex: slot.z || 0, overflow: "hidden" };

        if (slot.kind === "shape") {
          return <div key={idx} style={{ ...box, background: slot.gradient ? slot.gradient : resolveTok(slot.fill || "$primary", tk), borderRadius: slot.radius ? (slot.radius >= 999 ? "999px" : pct(slot.radius, cw)) : undefined }} />;
        }

        if (slot.kind === "image") {
          const raw = slot.role === "var" ? slots[slot.id] : resolveTok(slot.asset, tk);
          if (!raw) return present ? null : <div key={idx} style={box}><Ph slot={slot} /></div>;
          const src = /^(https?:|data:)/.test(raw) ? raw : cldUrl(raw, "hero");
          const adj = (slots.__img || {})[slot.id];
          const imgStyle = {
            width: "100%", height: "100%",
            objectFit: (adj && adj.fit) || (slot.fit === "contain" ? "contain" : "cover"),
            objectPosition: adj ? `${adj.x ?? 50}% ${adj.y ?? 50}%` : "center",
          };
          if (adj) {
            const tf = [];
            if (adj.scale && adj.scale !== 1) tf.push(`scale(${adj.scale})`);
            if (adj.skewX) tf.push(`skewX(${adj.skewX}deg)`);
            if (adj.skewY) tf.push(`skewY(${adj.skewY}deg)`);
            if (tf.length) { imgStyle.transform = tf.join(" "); imgStyle.transformOrigin = "center"; }
          }
          return (
            <div key={idx} style={box}>
              <img src={src} alt="" style={imgStyle} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          );
        }

        return <TextSlot key={idx} box={box} slot={slot} value={slots[slot.id]} tk={tk} cw={cw} present={present} />;
      })}
    </>
  );
}

function Ph({ slot }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed rgba(112,200,131,.8)", background: "rgba(200,226,197,.18)", color: "#2f6df6", fontSize: "2.2cqw", textAlign: "center", padding: "2cqw" }}>
      + {slot.label || slot.id}
    </div>
  );
}

// A text slot that auto-shrinks its font to fit its box. Nodes carry their base cqw size in data-cqw;
// the fit pass scales them down (never up) until the content fits height & width, re-running on resize.
function TextSlot({ box, slot, value, tk, cw, present }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || slot.fit === "off") return;
    const nodes = el.querySelectorAll("[data-cqw]");
    if (!nodes.length) return;
    const fit = () => {
      let k = 1, guard = 0;
      const apply = () => nodes.forEach((n) => { n.style.fontSize = (parseFloat(n.dataset.cqw) * k) + "cqw"; });
      apply();
      while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && k > 0.42 && guard < 60) {
        k -= 0.04; guard++; apply();
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  });
  const align = slot.font?.align;
  const items = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return (
    <div ref={ref} style={{ ...box, padding: "0.6cqw 0", display: "flex", flexDirection: "column", justifyContent: slot.vcenter ? "center" : "flex-start", alignItems: items }}>
      <TextContent slot={slot} value={value} tk={tk} cw={cw} present={present} />
    </div>
  );
}

function fontBase(f, tk) {
  return {
    fontFamily: resolveTok(f.font || "$display", tk),
    color: resolveTok(f.color || "$ink", tk),
    fontStyle: f.italic ? "italic" : "normal",
    fontWeight: f.bold ? 700 : 400,
    textTransform: f.uppercase ? "uppercase" : "none",
    textAlign: f.align || "left",
    letterSpacing: f.uppercase ? ".05em" : "normal",
    width: "100%",
  };
}

function TextContent({ slot, value, tk, cw, present }) {
  if (slot.as === "story") {
    const v = value || {};
    return (
      <>
        {slot.parts.map((p, i) => {
          const txt = v[p.id] || (present ? "" : (i === 0 ? "HEADLINE" : "Narrative copy goes here."));
          const cq = ptToCqw(p.font?.size || 14, cw);
          return <div key={i} data-cqw={cq} style={{ ...fontBase(p.font, tk), fontSize: cq + "cqw", marginBottom: i === 0 ? "1.4cqw" : 0, lineHeight: i === 0 ? 1.15 : 1.35 }}>{txt}</div>;
        })}
      </>
    );
  }
  const f = slot.font || {};
  const txt = value || (present ? "" : (slot.label || ""));
  const cq = ptToCqw(f.size || 18, cw);
  return <div data-cqw={cq} style={{ ...fontBase(f, tk), fontSize: cq + "cqw", lineHeight: 1.12 }}>{txt}</div>;
}
