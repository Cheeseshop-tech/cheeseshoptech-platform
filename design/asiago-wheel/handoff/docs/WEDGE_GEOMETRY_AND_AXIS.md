# Asiago Wedge — Geometry & Standing Axis (exact architectural spec)

The precise geometry of the shapes and the rotation axis, so the standing motion
is unambiguous (for the Blender rig and for teaching Higgsfield).

## 1 · The solid
- The **wheel** is a **right circular cylinder**: radius **R**, height (thickness)
  **T**, central axis **vertical (Z)**. Proportion **R : T ≈ 3 : 1**.
- A **wedge** is one angular **sector of that cylinder** — a *cylindrical sector
  solid* — central angle **θ = 360°/8 = 45°**. Its point (apex) is on the central
  axis; its wide end is the curved outer rind.

## 2 · The five bounding faces
1. **Top sector face** — flat pie-slice in the plane z = +T/2.  → rind
2. **Bottom sector face** — flat pie-slice in the plane z = −T/2.  → rind
3. **Outer cylindrical face** — curved rind arc: radius R, arc angle θ, height T. → rind
4 & 5. **Two radial cut faces** — flat rectangles, each lying in a **vertical plane
   through the central axis**, dimensions **R (radial) × T (height)**.  → PASTE (interior)

## 3 · The edges
- **Apex edge** — vertical line on the central axis, length T (the inner point;
  where the two radial cut faces meet).
- **Outer rim edges** — the two arcs (top & bottom) where the cylindrical face
  meets the sector faces.
- **BASE / LEVER EDGE** — the **bottom outer arc edge**: where the outer
  cylindrical face meets the bottom face (z = −T/2, radius R, arc angle θ).
  **This is the hinge.**

## 4 · The standing motion = rigid rotation about the lever edge
- **Type:** pure **rigid-body rotation** — a hinge / drawbridge / trapdoor. No
  deformation, no stretching, no translation of the body; the shape is preserved.
- **Hinge (pivot):** the **BASE LEVER EDGE** (bottom outer arc) stays fixed,
  pinned to the ground plane.
- **Axis of rotation:** the **horizontal tangent to the rim at the wedge's
  bisector** — perpendicular to the radius, lying in the ground plane (z = −T/2).
  Direction = **(−sin α, cos α, 0)**, where α = the wedge-bisector azimuth.
- **Angle:** **+90°** (a quarter turn).
- **Result:** the sector plane rotates from **horizontal to vertical**. The apex
  edge swings up to height R **directly above the lever's midpoint**. The wedge
  ends standing on its **outer rind arc** (the base), apex at top — an **upright
  isosceles triangle**, the two cut/paste faces now vertical with one facing the
  camera. = the reference-photo pose.

## 5 · One-line statement (for the prompt)
> "The wedge is a 45° cylindrical sector. It rotates a **rigid 90° about its
> bottom outer rim edge** (the horizontal hinge line), tipping from lying flat up
> onto that edge to stand **vertical** — apex up, cut face to camera — like a
> trapdoor swinging shut. The wheel and the other wedges do not move."

## 6 · How the Blender rig implements this
- An empty **TiltPivot** is placed AT the lever-edge midpoint, with its local **X
  axis aligned to the rim tangent** (the rotation axis above).
- The wedge is parented to it; keyframing **TiltPivot local-X from 0° → 90°** is
  the exact rigid hinge. (`blender/outline_motion.py`.)
