# Higgsfield Prompts — CST Opening Animation ("pie → wheel → portal reveal")

Companion to CST_OPENING_ANIMATION_STORYBOARD.md. Higgsfield is image/text→video:
it's great for the **photoreal cheese motion and the morph atmosphere**, but it
**cannot** do the precise per-wedge portal reveal, the app labels, or a clean brand
logo — those stay in **Blender + post** (we already have the Blender previz).
So treat these as 3 generated *beats* you cut together with the Blender reveal.

Global style (paste into every prompt): *art-meets-tech, premium brand film,
soft warm studio light, cream-ivory seamless background, shallow depth of field,
photoreal macro food cinematography, smooth slow cinematic motion, 35mm, calm.*

Global NEGATIVE (every prompt): *watermark, logo, "ît" mark, text, letters,
captions, title card, fast motion, strobing, jitter, wobble, melting, deforming,
rubbery or plastic texture, duplicated wheels, hands, knife, harsh shadows, lens flare.*

---

## BEAT A — The morph (tech pie → artisan cheese)  [~3s]
Seed Higgsfield with a START image of a flat, top-down brand-colored pie chart
(terracotta + warm neutrals, thin data ticks, faint dot grid) and an END image of
the photoreal Asiago wheel at a 3/4 angle (use our Blender hero render).

PROMPT: A clean top-down geometric pie chart in warm terracotta and cream brand
colors slowly transforms into a whole wheel of aged Asiago cheese. As the camera
eases from directly overhead down to a three-quarter angle, the flat colored
segments rise and thicken into real cheese wedges and the surface shifts from a
crisp digital graphic into warm, organic, photoreal cheese with natural paste
grain and rind. Thin tech scan-lines and edge-glow dissolve away as the cheese
texture takes over. Geometric and digital becomes organic and real. Smooth,
graceful, premium.

## BEAT B — Spin + cinematic flyover  [~4s]
Seed with the photoreal Asiago wheel (Blender hero render).

PROMPT: A whole wheel of aged Asiago cheese on a soft cream-ivory background
rotates slowly and smoothly on its vertical axis. The camera performs a gentle
cinematic flyover — drifting in close to the rim and edge of the wheel, then
easing back out — revealing the crystalline paste, the cut wedge lines, and the
natural rind in shallow-focus macro detail. Warm studio key light, soft contact
shadow, unhurried premium motion.

## BEAT C — Wedge present (hero close-up)  [~3s]
Seed with a render of one wedge lifted/presenting (our Blender eject pose).

PROMPT: Extreme close-up of a single Asiago wedge slowly tilting up to present its
cut face toward the camera, hinging on its edge in one graceful grounded motion,
crystalline paste and rind in sharp shallow-focus detail, warm light raking
across the grain. Cinematic, tactile, premium. Holds on the hero angle.

---

## WHAT STAYS IN BLENDER + POST (do NOT ask Higgsfield for these)
- The **8-wedge portal reveal** (each wedge = an app, spin-to-front, eject) — done
  in Blender; we have the previz (renders/previz.mp4).
- **App titles + functions** and the **CST wordmark** swoop — motion-graphics
  overlays composited in After Effects / CapCut / Premiere (crisp, editable).
  Recoil = ease-out-back / cubic-bezier(.34,1.56,.64,1).
- Final cut: Beat A (morph) → Blender reveal loop (8 wedges) → Beat B/C cinematic
  cheese inserts → logo swoop resolve. Music sting on the logo lock.

## SETTINGS
- Lock spin direction consistent across beats so the logo can swoop against it.
- Export Higgsfield watermark-free (plan/export setting — not removable by prompt).
- Generate the longest clean takes you can; trim to the storyboard timing.
