# Asiago Wheel — Stage 3 Build Guide (Blender + Substance → photoreal, then back to the web)

**Why this doc.** The interactive wheel (perspective + deterministic eject) is done and good. The realism
ceiling we hit in-engine is two things: low-res source crops and no offline renderer. This guide is the
production path that fixes both — built on **your machine** — and produces **two outputs from one model**:

- **Track B — the hero still / intro plate:** a path-traced Cycles render. The "is that a photo?" image.
- **Track A — the web asset:** a compressed `.glb` + KTX2 maps that drop into the existing Three.js wheel,
  keeping the deterministic eject and 60fps.

> Everything below is matched to the prototype so the model is a *drop-in*. Don't change the core numbers.

---

## 0 · Specs that MUST match the prototype
| Thing | Value | Why |
|---|---|---|
| Wedges | **7** | one per portal tool |
| Wedge angle | **360 ÷ 7 = 51.43°** | tiles a full wheel |
| Radius : height | **~3 : 1** (e.g. R 155mm, H 50mm) | real Asiago proportion; matches `R=1.55, T=0.5` |
| **Paste** surface | the **two radial cut faces** of each wedge | exposed interior (eyes) |
| **Rind** surface | **curved outer arc + top + bottom** | natural skin |
| Pivot | wedge **apex at world origin** | so the runtime can seat + eject it |
| Up axis on export | **Y-up, meters, +Z forward** | glТF/three convention |

---

## 1 · Software
- **Blender** (free) — modeling, lighting, render, bake, glTF export. *Required.*
- **Adobe Substance 3D Sampler** — photo → tiling PBR material. *Best for the paste/rind maps.*
  - Free alternatives: **Materialize** (Windows, free), or author procedurally in **Blender shader nodes**.
- **gltf-transform** CLI (`npm i -g @gltf-transform/cli`) — Draco + **KTX2** compression for the web. *Required for Track A.*
- Optional: **Marmoset Toolbag** (paid) for faster look-dev/baking.

---

## 2 · Substance — author two materials (author 4K, ship 2K)
Make **`asiago_paste`** and **`asiago_rind`**, each exporting this map set:
`baseColor · normal · roughness · height · ambientOcclusion`.

**Paste (the eyes):**
1. New Sampler project → drop a clean **cut-face photo** (or shoot a flat, even-lit macro of a real wedge).
2. Apply **Image to Material**. Turn ON *Delight* (removes baked shadows → flat albedo).
3. Dial: small irregular **eyes** as height detail; base color pale straw `#E8D492`→`#D6BD75`; slight
   crystalline sparkle (raise roughness variation). Add a touch of **translucency** intent (we'll wire
   subsurface in Blender).
4. Make it **tileable** (Sampler's Make it Tile). Export 2K (+4K master).

**Rind:**
1. Drop a **rind close-up** (natural skin, no DOP stamp). Image to Material + Delight.
2. Base color tan→brown `#BB9052`→`#946E34`; raise **height** for the pitted/grainy skin; roughness ~0.9.
3. Tileable. Export 2K.

**Procedural alternative (no Substance):** in Blender, paste = Voronoi (eyes) + Noise mix into a
Principled BSDF; rind = layered Musgrave/Noise. Slower to dial, but free and infinite-res.

---

## 3 · Blender — model the wheel
1. **Whole wheel first:** add a **Cylinder**, 64+ verts, radius 1.55, depth 0.5. This is the master form.
2. **Bevel the edges** (THE realism tell — real cheese isn't razor-sharp): select the two rim edge loops →
   **Bevel** (Ctrl B), width ~0.012, **3 segments**. Do the same where rind meets cut later.
3. **Cut into 7 wedges:** easiest path —
   - Model **one wedge** as a 51.43° cylinder sector (or knife-cut the master), apex at origin.
   - **Bevel** its outer corners + the rind/paste edge.
   - **Array modifier** won't rotate; instead use **Spin** (7 copies, 360°) or duplicate + rotate 51.43°
     each. Keep each wedge a separate object so the runtime can move them.
4. **Mark seams for UVs:** seam the boundary between **cut faces (paste)** and **arc+top+bottom (rind)** so
   they unwrap to separate islands. `U → Unwrap`. Scale paste/rind islands to their material's texel density.

## 4 · Materials + look-dev
- **Paste** → Principled BSDF: `baseColor`=paste albedo, `Roughness`=paste roughness map,
  `Normal`→Normal Map node←paste normal, `Height`→Bump or **Displacement** (subtle). Set **Subsurface**
  ~0.15, radius warm (cheese is faintly translucent). Assign to the **cut faces** only.
- **Rind** → Principled BSDF with the rind maps, Roughness ~0.9, no subsurface. Assign to **arc+top+bottom**.
- Add a thin darker line where rind wraps the cut edge (real wheels have it) — a narrow material band or
  a baked dirt mask.

## 5 · Lighting + render (Track B — the hero still)
1. **World** → Environment Texture → a **studio HDRI** (Poly Haven `studio_small_*` is free). Strength ~1.
2. Add a **soft Area key** (upper-right) + a cool **fill** + a warm **rim**. Mirrors the in-engine rig.
3. **Camera:** 35–50mm, slight 3⁄4 elevation; pull one wedge out at the bottom (the eject pose) on a wooden
   board or neutral sweep. Add a soft contact shadow (the board catches it).
4. **Render → Cycles**, GPU, **512–1024 samples**, **Denoise ON** (OptiX/OpenImageDenoise).
   Color management: **AgX** or Filmic, mild contrast. Output 2560×1920 PNG. → **the photoreal still.**

## 6 · Export for the web (Track A — keep the performance)
1. **Bake** to textures so the runtime gets the depth for free: bake **AO** (and optionally combined diffuse)
   per object → save 2K. (Render Properties → Bake → Ambient Occlusion.)
2. **Export glTF 2.0 (.glb):** selected wedges, **+Y up**, apply modifiers, include the baked textures.
   Enable **Draco** mesh compression in the exporter.
3. **Compress textures to KTX2:**
   `gltf-transform optimize wheel.glb wheel_web.glb --texture-compress ktx2 --texture-size 2048`
4. **Budget check:** `wheel_web.glb` < ~2 MB total · 2K maps · 7 separate wedge meshes (apex at origin).

## 7 · Wire back into the runtime
The interactive prototype (`prototypes/asiago-wheel-3d-prototype.html`) already has the **seat → pop → spin**
rig and the deterministic timeline. To swap in the real model:
1. Load `wheel_web.glb` with `GLTFLoader` (+ `DRACOLoader` + `KTX2Loader`).
2. For each of the 7 imported wedge meshes, parent it under a `seat` at `i·51.43°` exactly as now; the
   eject (`pop`/`spin`) and readout code is unchanged.
3. Keep `RoomEnvironment` **or** load the same studio HDRI (RGBELoader → PMREM) for matching reflections.
4. Verify 60fps; if heavy, drop maps to 1K and confirm KTX2 is actually loading (not PNG fallback).

---

## Acceptance bar
**Track B:** reads as photographed Asiago — beveled edges, real eyes, soft studio light, true shadow.
**Track A:** same look in-browser at 60fps, < 2 MB, deterministic eject intact, graceful static-image
fallback where WebGL is off.

## Hand-back
When the still is rendered and `wheel_web.glb` exists, drop them in `design/asiago-wheel/` and I'll wire the
GLB into the runtime + swap the hero still into the `flow` landing manifest. See `ASIAGO_WHEEL_RENDER_PLAN.md`
for the strategy this implements.
