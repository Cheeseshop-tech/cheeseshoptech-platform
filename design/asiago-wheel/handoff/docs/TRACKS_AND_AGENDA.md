# Asiago Wheel — Two Parallel Tracks (agenda + task map)

Two SEPARATE productions share the same Asiago wheel but have different looks,
tools, and outputs. Keep them distinct.

| | **Track A — Cinematic Intro** | **Track B — Art-Tech Illustrated** |
|---|---|---|
| Look | Photoreal cheese | Illustrated (cel + ink outlines), brand graphic |
| Engine | **Higgsfield** (video gen) | **Blender** (EEVEE cel + Freestyle) |
| Output | Brand sizzle / intro video | Opening animation + live app launcher |
| Text/labels | **NONE** in the video (logo added later) | App titles + logo (part of the piece) |
| Post | **After Effects** — logo build + animation | After Effects/post — labels + logo |
| Assets on hand | Firefly photoreal still · Higgsfield v1 clip | asiago_wheel.blend (8 wedges) · style_illustrated.py · previz.mp4 · wheel_illustrated.png |

---

## TRACK A — Higgsfield cinematic intro (photoreal)
**Goal:** a longer photoreal intro video — the cheese wheel rotates, one wedge
stands up (tilt **corrected**), with zoom-in and camera flyover motion. **No app
text.** Then hand the clean plate to After Effects for the CST logo build +
animation overlay + titles/music.

**Spec docs:** HIGGSFIELD_INTRO_LONG_PROMPT.md (the paste-ready longer prompt) ·
HIGGSFIELD_SPIN_TILT_PROMPT.md (the wedge-tilt fix) · CST_CINEMATIC_INTRO_PROMPT.md
(original short version + the logo-swoop spec, now an AE step).

**Status:** v1 Higgsfield clip exists but the wedge tip-up was awkward; tilt-fix +
longer flyover prompt now written.

**Tasks**
- A1 ✅ Write corrected + longer Higgsfield prompt (no text, flyover + zoom).
- A2 ⏳ Rick generates in Higgsfield (watermark-free export, longest clean take).
- A3 ⏳ Review tilt + flyover; iterate the prompt if the tilt still reads wrong.
- A4 ⏳ Clean plate → **After Effects**: CST logo swoop (ease-out-back recoil),
  titles, music; final render.

## TRACK B — Art-tech illustrated wheel (Blender)
**Goal:** the stylized branded wheel (cel + Freestyle) — the opening animation
(pie→cheese morph → spin → per-wedge portal reveal with labels) and, same engine,
the real-time **app launcher**.

**Spec docs:** CST_OPENING_ANIMATION_STORYBOARD.md (shot list + art direction) ·
build files: build_asiago_wheel.py · style_illustrated.py · previz_animation.py.

**Status:** 8-wedge model built; illustrated style v1 rendered (wheel_illustrated.png);
clay motion previz rendered (previz.mp4). Look + motion still to refine.

**Tasks**
- B1 ⏳ Refine illustrated look per Rick (tech grid/edge-glow, palette, line weight).
- B2 ⏳ Illustrated motion previz (spin + wedge reveal in the cel style).
- B3 ⏳ Add the pie→cheese morph beat.
- B4 ⏳ Per-wedge app labels + CST logo (post).
- B5 ⏳ (Optional) Three.js real-time version = the live app launcher.

---

## Shared notes
- **After Effects is the post home for both** (logo, titles, music). The video
  engines (Higgsfield / Blender) output clean plates; branding goes on in AE.
- **Wedge count = 8** (one per portal app: Dashboard, Campaigns, Catalog, Orders,
  CRM, Media hub, Tools, Content Studio).
- Higgsfield watermark removes only via a watermark-free export tier, not the prompt.
- Don't ask Higgsfield for the illustrated style or for text/logos — wrong tool.
