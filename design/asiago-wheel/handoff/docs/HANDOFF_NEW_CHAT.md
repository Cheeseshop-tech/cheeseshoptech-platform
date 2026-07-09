# Asiago Wheel Animation — HANDOFF (paste into a new chat)

## Where we are
The Asiago wheel is the CST opening-animation motif. Two tracks were explored;
**we committed to Track B (illustrated explainer)**. Track A (Higgsfield
photoreal) is parked — it can't do the rigid wedge tilt (it morphs), and
photoreal-in-Blender lacks a good texture source.

## DOING NOW → Track B: the illustrated explainer
Full plan: `design/asiago-wheel/handoff/docs/CST_OPENING_ANIMATION_STORYBOARD.md`
Sequence: **pie draws on + typed business labels → goes 3D + tech grid → morphs to
illustrated cheese wheel → 8 app labels → wheel spins → one wedge tilts up rigidly
& stands → app window opens with a demo clip → colored-pencil logo (recoil).**
Style = cel-shaded + Freestyle ink outlines, brand colors (NOT photoreal).
Use: advertising + landing-page hero.

### Built so far (Track B)
- **Phase 1 — data-viz open:** `prototypes/cst-data-open.html` (DONE) — 8-slice pie
  draws itself on in brand colors, leader lines + typewriter business terms. Open
  in a browser. Self-contained; doubles as a landing asset.
- **Phase 2 — go-3D morph (DONE, previz):** `blender/phase2_morph.py` →
  `renders/morph.mp4` (4s, 24→12fps previz). Flat top-down 8-slice pie → camera
  tilts to hero 3/4 → wedges thicken in Z → tech grid in perspective → flat
  graphic crossfades to cel cheese w/ ink outlines. Keyframes: WheelRoot.scale.z,
  HeroCam.location, a `MorphFac` value node per material, grid emission.
  Key stills: `renders/morph_test_001/048/096.png` (flat / mid / hero).
- **8 slice labels LOCKED** (TRACKS set): Dashboard, Campaigns, Catalog, Orders,
  CRM, Media hub, Tools, Content Studio. See storyboard table.
- Illustrated wheel look: `blender/style_illustrated.py` → `renders/wheel_illustrated.png`.

### NEXT steps (in order)
1. Phase 3: bake the **8 app labels** onto the wheel (text objects per wedge,
   facing camera) → **spin** (>half turn, friction ease). Extend phase2 rig.
2. Phase 4: **rigid wedge stand** (rig exists: `outline_motion.py`,
   `photoreal_standing.py`, TiltPivot) → app **window/card** opens beside it with
   a demo clip.
3. Phase 5: **colored-pencil CST logo** — generate in Firefly (prompt in the
   storyboard doc), then composite with the recoil swoop in AE.
4. Rick to capture 8 short screen-recordings of the apps for the reveal windows.

### Phase 2 refinements parked (do in B1 / AE, non-blocking)
- **Grid fade-in:** Freestyle outlines the grid even at emission=0, so it shows
  from frame 1 instead of fading. Fix = exclude TechGrid from the Freestyle
  lineset (separate collection) or composite the grid in AE.
- Per-slice brand colors in the flat stage live in the HTML open (Phase 1); the
  Blender flat stage is intentionally a 2-tone graphic that crossfades to cheese.

## Key facts / decisions
- **8 wedges** (one per CST app). Wheel built procedurally:
  `blender/build_asiago_wheel.py` (WEDGES=8).
- **The rigid tilt is solved in Blender** (the motion Higgsfield can't do): a wedge
  hinges 90° about its bottom outer rim edge. Spec: `docs/WEDGE_GEOMETRY_AND_AXIS.md`.
  Rig scripts: `blender/outline_motion.py`, `solid_standing.py`, `photoreal_standing.py`.
- **Higgsfield can't do the rigid hinge** (morphs); no outline→photoreal restyle mode.
- **Photoreal-in-Blender is blocked on textures** — procedural = clay; existing
  `textures/*` maps are bad low-res crops. Would need a high-res cut-face/rind photo
  or Firefly seamless textures. Parked.

## How to drive Blender
- **Console method (works now):** load the command onto the clipboard, bring Blender
  to front, click the Python console, ⌘V, Return. (Typing long paths directly trips
  the console autocomplete — always paste.)
- **Connector (faster, not yet on):** Blender MCP tools are registered but the add-on
  server isn't started. Turn on: viewport **N-panel → BlenderMCP → Connect/Start**.
  Then `execute_blender_code` etc. work directly.

## Files map (design/asiago-wheel/)
- `handoff/blender/` — build_asiago_wheel.py, style_illustrated.py, previz_animation.py,
  previz_rigid_tilt.py, outline_motion.py, solid_standing.py, photoreal_standing.py
- `handoff/prototypes/` — cst-data-open.html (+ older wheel prototypes)
- `handoff/renders/` — outline_stand.mp4 / _center, outline_tilt_plate.mp4,
  wheel_illustrated.png, photoreal_stand_test*.png, wedge_storyboard.png, key_*.png
- `handoff/docs/` — CST_OPENING_ANIMATION_STORYBOARD.md (the plan),
  WEDGE_GEOMETRY_AND_AXIS.md, TRACKS_AND_AGENDA.md, HIGGSFIELD_* (parked)
- `~/Downloads/Wheel Story/` — the motion plates + storyboard + key frames bundled
- `asiago_wheel.blend` — saved scene (8 wedges)

## One-line to start the new chat
"Continue Track B of the Asiago opening animation per
design/asiago-wheel/handoff/docs/CST_OPENING_ANIMATION_STORYBOARD.md — Phases 1
(cst-data-open.html) and 2 (phase2_morph.py → morph.mp4) are done; build Phase 3
next: 8 app labels on the wheel + the spin."
