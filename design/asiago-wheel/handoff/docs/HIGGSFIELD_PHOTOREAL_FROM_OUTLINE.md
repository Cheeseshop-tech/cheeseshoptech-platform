# Higgsfield — render PHOTOREAL from the OUTLINE motion plate

Goal: keep Higgsfield's photoreal cheese (which it nails) but make it follow the
EXACT rigid hinge from our Blender outline plates
(`outline_stand.mp4` / `outline_stand_center.mp4`).

The mechanism that does this is **video-to-video / "restyle" / motion-reference**:
the outline clip drives the MOTION + structure; the prompt (+ a photoreal still)
drives the LOOK. The model repaints each frame photoreal while obeying the
outline's geometry.

---

## THE PROMPT (paste into the scene box)
A whole wheel of aged Asiago cheese on a soft cream background, 16:9. The wheel
sits still. One triangular wedge tilts up rigidly, pivoting like a hinge on its
bottom edge, rotating a quarter turn to stand upright on that rind edge with its
cut face turning toward the camera. A solid, rigid motion — the wedge keeps its
exact shape; the rest of the wheel does not move, open, or separate. Pale golden
straw paste with tiny fissures, crystalline specks, and very few small holes,
natural rind. Warm studio light, soft contact shadow, shallow depth of field,
photoreal macro food cinematography, 35mm, premium, calm. No text.

---

## RECOMMENDED WORDING — "match" the motion, "restyle" the look
Two jobs, two places. Lock MOTION with the structure/motion **strength HIGH** and
the word **"match"** (not "imitate" — too loose). Get the LOOK by **describing the
photoreal cheese** ("restyle / render" it) — don't command "paint."

> **"Keep the exact motion, timing, and geometry of the reference video. Restyle
> the surface only — render it as photoreal aged Asiago cheese: golden straw paste
> with tiny fissures and crystalline specks, very few small holes, natural rind,
> warm studio light, shallow depth of field. Do not change the movement."**

Rule of thumb: **"match exactly"** for motion · **"restyle / render photoreal"**
for look. Avoid "imitate" and avoid "paint it."

## WHAT HIGGSFIELD ACTUALLY HAS (checked 2026-06-20)
Edit tab tools that take video: **Grok Imagine Edit** ("edit videos with text
prompts") · **Kling Video Edit** ("advanced video editing") · **Kling 3.0 Motion
Control** (character actions). No dedicated outline→photoreal ControlNet mode.
→ Use **Grok Imagine Edit** for Method A (text-prompt video restyle).

### Method A steps (Grok Imagine Edit)
1. Create → **Edit** tab → **Grok Imagine Edit**.
2. **Upload the driving video** = the SOLID clay-cheese standing render
   (`outline_solid_stand.mp4`), NOT the line-outline — a solid form restyles to
   photoreal far better than line-art.
3. **Prompt** = the "match motion / restyle photoreal cheese" line (on clipboard).
4. Generate. If the look is off, also try **Kling Video Edit**.

## METHOD A — video-to-video / restyle  (IDEAL — use if Higgsfield offers it)
Look for a **"Video to Video," "Restyle," "Reference video,"** or **"Motion"**
input (often under the Videos or Edit tab, or the Image/Video toggle next to the
prompt box).
1. **Input / driving video** = our outline plate (`outline_stand.mp4` for the
   right-of-center photo composition, or `outline_stand_center.mp4`).
2. **Prompt** = the photoreal prompt above.
3. **Style / reference image** (if offered) = your photoreal standing-wedge photo,
   so it knows the exact cheese look.
4. **Structure/motion strength** = HIGH (follow the outline's geometry); let the
   look come from the prompt + reference image.
5. 16:9, longest duration, keep audio if you want the friction sound.
→ Result: photoreal cheese performing the outline's exact rigid hinge.

## METHOD B — start + end frames  (RELIABLE FALLBACK — frames only)
If there's no video-reference mode, use **Image → Video** with both frames:
1. **START FRAME** = a photoreal **whole, intact** wheel (flat).
2. **END FRAME** = your photoreal **standing-wedge** reference photo.
3. **Prompt** = the photoreal prompt above.
→ The model interpolates the motion between the two photoreal frames. Less control
of the hinge than Method A (the outline isn't fed), but it leans on Higgsfield's
photoreal strength and the two anchored poses.

---

## HONEST NOTE
I'm not 100% certain which of these modes your Higgsfield plan exposes right now —
the UI changes. **Method A is what you want** if it exists. If you open the
Higgsfield composer, I can look at your screen and point to the exact button /
mode to use. And if neither mode will obey the rigid hinge, the Blender rig
already produces it perfectly — we skin THAT photoreal instead.
