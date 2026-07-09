# Higgsfield — Cinematic Intro v3 (corrected: rigid tilt, 16:9, photoreal paste)

Track A. Photoreal cheese only, no text/logo (logo = After Effects later).

## v2 problem (Rick) → fixes in v3
- v2 **morphed a slice out** unnaturally. FIX: the wedge **tilts up rigidly on its
  bottom edge** (the lever) to stand — it does NOT slide out, the wheel does NOT
  open/fan/separate at the cuts, no morphing. Rigid hinge only.
- Land on the EXACT pose + paste look of the reference photo
  (`references/asiago-standing-wedge-REFERENCE.png`): golden straw paste, tiny
  fissures and crystalline specks, very few small holes — true photoreal.
- **16:9 full frame** (v2 came out square).
- Sequence: rotate → wedge edge-stand (tilt up) → THEN zoom in → THEN flyover.
- Keep the friction sound of the spin + tilt (Rick likes it).

---

## FRAMES (the key control)
- **START FRAME:** a whole, intact photoreal Asiago wheel (3/4 angle, same wheel
  + light as the reference).
- **END FRAME:** the reference photo (wedge standing on its edge, cut face to
  camera). Anchoring the end pose forces the model toward the rigid result and
  away from a free-form morph. Aspect 16:9.

## PROMPT (image→video)
A whole wheel of aged Asiago cheese centered on a soft cream background, 16:9,
the entire wheel clearly and fully in frame with space around it (a full-screen
hero shot). The camera holds still and wide as the wheel slowly rotates at least a
half turn (about 180 degrees), smooth and continuous, with a faint friction as it
turns — the whole wheel stays in view the entire time. Then one triangular wedge tilts upward, pivoting rigidly on its
lower edge like a lever, rising to stand upright on that edge with its cut face
turned toward the camera — a solid, rigid motion, the wedge keeping its exact
shape. The rest of the wheel stays whole and still; it does not open, fan apart,
or separate at the cuts. Only after the wedge is standing does the camera begin
to move — slowly zooming in on the cut face (pale golden straw paste with tiny
fissures, crystalline specks, and very few small holes, photoreal and natural)
snapping in and then RECOILING to a settle (a slight overshoot, then ease back),
then drifting into a slow cinematic flyover around the standing wedge and the wheel. Warm studio light, soft contact shadow,
shallow depth of field, photoreal macro food cinematography, 35mm, premium, calm.

## BEATS (~12s, full-frame 16:9)
- 0.0–5.0s  **Camera LOCKED WIDE** — whole wheel clearly + fully framed, centered;
            it makes at least a **half turn (~180°)**, smooth + continuous (friction
            sound). No camera move yet (this is the landing-page hero state).
- 5.0–7.5s  One wedge **tilts up rigidly on its lower edge** to stand (rigid hinge
            — NO slide-out, NO morph, wheel stays whole). Lands on the reference pose.
- 7.5–10s   Camera **zooms in** on the standing wedge's cut face, easing/recoil settle.
- 10–12s    Slow **cinematic flyover** around the standing wedge / wheel.

> Camera staging: stay WIDE with the whole wheel in frame through the rotation;
> the zoom + flyover + recoil easing all begin AFTER the rotation. (The CST logo
> swoop, also recoil/ease-out-back, lands in After Effects on the tail.)

## RECOIL EFFECTS (the snap-and-settle signature)
The camera moves and the logo share one motion signature: **recoil =
ease-out-back / overshoot-then-settle** (cubic-bezier(.34,1.56,.64,1)). It applies to:
- the **zoom-in** on the cut face (snaps in, slightly overshoots, recoils to rest),
- the start/stop of the **flyover** (eases out of and into rest, not linear),
- the **CST logo swoop** in After Effects (swoops in opposite the spin, overshoots, recoils).

Where to control it:
- **In Higgsfield:** use the **Speed Ramp** curve in the Director Panel to fake a
  snap-then-settle on the camera move (prompt easing alone is imprecise). Keep the
  rotation beat linear/locked; put the recoil on the zoom/flyover.
- **Precise recoil = After Effects** (or Blender if we render there): apply the
  ease-out-back curve to the camera/zoom and to the logo. AI video won't give an
  exact curve — AE is where the recoil is dialed in for real.

## NEGATIVE PROMPT
morphing, melting, slice sliding out, wedge separating, wheel opening, wheel
fanning apart, cuts splitting, warping geometry, rubbery deformation, liquid
motion, watermark, "ît" mark, text, letters, captions, fast motion, jitter,
floating, duplicated wheels, hands, knife.

## SETTINGS
- 16:9, 1080p, Cinema Studio (good for the camera flyover), longest duration (12s).
- Use BOTH frames (start = whole wheel, end = reference standing pose).
- Keep audio on (the friction sound).
- Export watermark-free.

---

## IF HIGGSFIELD STILL MORPHS THE TILT
Rigid mechanical motion is AI video's weak spot. The reliable path for a perfect
rigid tilt landing on that exact pose is **Blender** — we have the 8-wedge model;
a rigid keyframed tilt is deterministic and exact. It would need the photoreal
look-dev (studio HDRI + paste/rind maps) to match the reference paste. That's the
fallback if 1–2 more Higgsfield tries don't nail the hinge.
