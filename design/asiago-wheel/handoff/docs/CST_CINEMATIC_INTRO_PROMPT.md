# CheeseShop TECH — Cinematic Intro (wheel spin + logo swoop)

Created 2026-06-20. A 2-layer build: **Higgsfield renders the cheese plate**,
the **CST logo is composited on top** with the recoil swoop. Do NOT ask
Higgsfield to draw the logo — text-to-video garbles brand lettering every time.
The cheese plate stays clean (no text), the real CST wordmark goes on in post.

---

## LAYER 1 — Higgsfield cheese plate (no logo, no text)

### PROMPT
A whole wheel of aged Asiago cheese centered on a soft cream-ivory seamless
background. The wheel rotates smoothly clockwise on its vertical axis, slow and
continuous, with a gentle ease-in. The camera slowly pushes in toward the wheel
at the same time, tightening the frame. Warm studio key light from upper left,
soft contact shadow beneath the wheel, shallow depth of field, faint specular
sparkle on the crystalline paste. Photoreal macro food cinematography, 35mm
look, calm and premium, smooth slow motion. Clean empty background with room on
the right side of the frame.

### MOTION BEATS (if HF exposes a timeline)
- 0.0–3.0s  Wheel eases into a smooth clockwise spin; camera begins slow push-in.
- 3.0–5.0s  Spin continues at steady pace, camera still tightening.
- 5.0s →    Spin holds steady (leave the tail clean — the logo lands here in post).

### NEGATIVE PROMPT
watermark, logo, "ît" mark, text, letters, captions, title card, fast motion,
strobing, jitter, wobble, melting, deforming, rubbery texture, plastic look,
duplicated wheels, hands, knife, busy background, harsh shadows, lens flare.

### SETTINGS / NOTES
- Keep the spin direction **consistent** (clockwise here) — the logo swoop is
  timed to go *against* it, so lock the direction before you render.
- Leave **negative space on the right** (prompt asks for it) so the wordmark has
  somewhere to land opposite the wheel.
- Export the **longest clean take** you can; you'll trim to the logo timing.
- Watermark: remove via a watermark-free Higgsfield export tier, not the prompt.

---

## LAYER 2 — CST logo swoop (composite over the plate)

Tool: After Effects, CapCut, Premiere, or DaVinci Resolve — anything with
keyframe easing. Asset: `public/brand/cstech-wordmark.svg`
("CheeseShop" Fraunces serif #9A3B1B + "TECH" Inter #221C14). Use the SVG/PNG
at high res so the type stays razor-crisp.

### THE MOVE — "swoop in opposite the spin, with recoil"
The wheel spins **clockwise**, so the logo travels **counter to that** — it
enters and sweeps in the **opposite rotational sense** (reads as right-to-left /
counter-clockwise arc), overshoots its mark, then **recoils back** to settle.
That overshoot-and-settle is the "recoil" — an **ease-out-back** curve.

- **Entry:** logo flies in from the right edge (the negative space), arcing
  slightly counter to the wheel's spin. Starts ~120% scale, faint motion blur.
- **Overshoot:** it travels *past* its resting spot by ~6–10% (the recoil load).
- **Settle:** springs back to rest opposite the wheel, locking sharp.
- **Timing:** entry + settle in ~0.6–0.8s. Land it right as the camera push-in
  eases to a stop — motion resolves on the brand, then hold.

### EASING (use these, not linear)
- Position + scale: **easeOutBack** (overshoot ≈ 1.7) — this IS the recoil.
- After Effects expression alt (spring recoil on the X position):
  ```
  freq = 3.0; decay = 5.0;
  n = 0; if (numKeys > 0) n = nearestKey(time).index;
  if (key(n).time > time) n--;
  if (n > 0){ t = time - key(n).time;
    amp = velocityAtTime(key(n).time - .001);
    w = freq*Math.PI*2;
    value + amp*(Math.sin(t*w)/Math.exp(decay*t))/w;
  } else value
  ```
  (Apply to the wordmark layer's Position; set one keyframe at the landing spot.)
- Add a 1–2px drop shadow / soft glow as it lands so it lifts off the cheese.
- Optional: a 2–3 frame counter-rotation "kick" on the logo as it settles,
  reinforcing that it moved against the wheel.

### FINISHING
- Final frame = wheel (left/center) + CST wordmark settled in the right negative
  space, both sharp. Hold ~1s. Optional slow fade or cut to the site.
- Keep total intro ≈ 5–7s. Music sting hits on the recoil-settle.

---

## ALTERNATIVE — do it in-browser, no Higgsfield
The intro can also be the **real-time Three.js wheel** (prototypes/ folder) with
the CST wordmark animated in via CSS `cubic-bezier(.34,1.56,.64,1)` (that curve
= ease-out-back / recoil). Upside: the real logo is always crisp, editable, and
it doubles as the live app-launcher we discussed. Higgsfield = the cinematic
hero version; CSS = the lightweight site-embedded version. Say the word and I'll
build the CSS version as a working HTML file.
