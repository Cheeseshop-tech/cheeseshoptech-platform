# Notes for the NEXT Higgsfield prompt (from the motion-plate work)

Things we've learned dialing the Blender outline plate that the next Higgsfield
prompt must encode. Companion to HIGGSFIELD_INTRO_LONG_PROMPT.md.

## 1 · PERSPECTIVE — lock to the reference photo
- 3/4 view, camera elevation ~**30°**, mild perspective (≈50mm).
- Composition: **wheel on the LEFT, the standing wedge on the RIGHT**, cut face
  toward camera (matches the Asiago reference photo, NOT centered).
- We now have an exact Blender match of this framing:
  `blender/outline_motion.py` → `renders/outline_tilt_plate.mp4` (BASE_SPIN +42°,
  ELEV 30°). Use it as the visual reference / start-frame guide.

## 2 · MOTION — rigid hinge, the part Higgsfield kept breaking
- The wedge **tilts up from its bottom/outer edge like a lever** to stand, then
  (for the intro) holds. NO morph, NO slice "sliding/melting" out, the rest of the
  wheel stays whole and does not open or fan.
- If Higgsfield accepts a **motion/video reference or start+end frames**, feed the
  outline plate (or a still of the standing pose) to anchor the hinge.
- If it still morphs, the rigid tilt stays a **Blender** job (we have it).

## 3 · PASTE LOOK (match the photo)
- Pale golden straw paste, tiny fissures + crystalline specks, **very few** small
  holes. Photoreal, natural — not spongy/swiss.

## 4 · ALREADY LOCKED (carry over from v3)
- 16:9, full-screen hero; wheel **clearly + fully framed** during a **≥half-turn**
  rotation (camera locked wide); camera moves (zoom + flyover) only AFTER.
- **RECOIL** (ease-out-back) on the zoom + the logo (logo = After Effects).
- Friction **audio** on the spin + tilt (Rick likes it). No text in the video.
- Export watermark-free.

## 5 · OPEN QUESTION
- Confirm whether Higgsfield's model takes a motion reference / end-frame for this
  composition. If yes → feed the outline plate. If no → the perspective + motion
  must be carried entirely by the prose (and Blender remains the reliable fallback
  for the exact rigid tilt).
