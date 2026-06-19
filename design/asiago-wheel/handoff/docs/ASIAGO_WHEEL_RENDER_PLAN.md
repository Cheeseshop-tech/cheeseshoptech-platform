# Asiago Wheel — Photoreal Render Plan

**Goal.** Take the working interactive wheel (`prototypes/asiago-wheel-3d-prototype.html` — perspective
solved, deterministic eject) and make it **photorealistic** *without losing the real-time performance*.

**Governing principle — author heavy, ship light.** Build realism offline in high-resolution DCC tools,
then **bake → compress → load** optimized assets into the same Three.js runtime. The geometry is a single
wedge (cheap); realism is carried by **PBR texture maps + baked lighting + a real HDRI**, none of which
cost more at runtime than the flat color we ship today. Photoreal where the eye lands; light everywhere else.

---

## Two tracks (don't conflate them)

| | **Track A — In-engine (the product)** | **Track B — Pre-rendered (hero/intro)** |
|---|---|---|
| Output | Interactive 3D, 60fps, in browser | Linear video / stills, not interactive |
| Used for | The actual nav wheel | Apex-page intro morph, marketing, social |
| Realism ceiling | Very high (baked PBR) | Unlimited (offline path-tracing / AI) |
| Tools | Blender→glTF/KTX2→Three.js | Blender Cycles · Higgsfield · Runway |

Track A is the priority. Track B is the cinematic graph→cheese morph that *plays, then hands off* to A.

---

## The pipeline (Track A — five stages)

### 1 · Source — DONE
Reference photos in `design/asiago-wheel/references/` (whole wheel, cut wedge w/ eyes, rind close-up,
3⁄4 views). `slider_vecchio.png` is the lead for the cut-face/3⁄4 angle.

### 2 · Texture authoring — the realism lives here (author at **4K**, ship at **2K**)
Produce a full **PBR map set** for two materials: **paste** (cut face + eyes) and **rind**.
Maps needed: `albedo (baseColor)` · `normal` · `roughness` · `height/displacement` · `ambient occlusion`.

| App | Role | Notes |
|---|---|---|
| **Adobe Substance 3D Sampler** ⭐ | Photo → tileable PBR material | *The* tool for "flat cheese photo → full map set." Drop `slider_vecchio`, it delights + extracts normal/roughness/height. |
| **Adobe Substance 3D Designer** | Procedural eyes/rind | Infinite-res, fully art-directable holes + rind grain if you want zero photo artifacts. |
| **Photoshop / Firefly** (MCP available here) | Clean + de-light + extend the reference | Generative fill to repair/extend the crop into a seamless albedo; remove baked-in shadows before Sampler. |
| **Polycam / RealityScan** (optional) | Photogrammetry scan of a real wheel | Highest realism (true geometry + texture); more effort. Only if a styled scan beats authored maps. |

**Lean path (recommended):** Firefly/Photoshop to a clean de-lit albedo → Substance Sampler for the full
2K/4K map set. One afternoon, no scanning rig.

### 3 · Model + look-dev + bake — **Blender** (free)
- Re-model the wedge with **beveled edges** (real cheese isn't razor-sharp — the single biggest "it's CGI"
  tell; a 1–2mm bevel + the normal map fixes it).
- Apply the Substance materials; add subtle **subsurface** on the paste (cheese is slightly translucent).
- Light with a **studio HDRI**; render hero stills in **Cycles** (these double as Track B + marketing).
- **Bake** AO + (optionally) lighting + curvature into textures so the web runtime gets that depth for free.
- Export **glTF/GLB**.

*(Optional: Marmoset Toolbag for faster look-dev + baking if you want a paid, product-render-grade tool.)*

### 4 · Optimize for web — keep it light
- **glTF + Draco** mesh compression (geometry tiny anyway).
- **KTX2 / Basis** GPU texture compression — big visual quality at a fraction of PNG/JPG weight.
- Ship **2K** maps (not 4K) for the wheel; bake AO so live lighting stays cheap.
- One **prefiltered HDRI** environment (swap the current `RoomEnvironment` for a real studio `.hdr` → PMREM).
- **Budget:** total assets < ~2 MB · 60fps desktop · ≥30fps mobile · < 16ms/frame.

### 5 · Runtime — the engine you already have
- Keep **Three.js** now; move to **React Three Fiber + drei** when embedding in the React app (same engine,
  better DX, declarative).
- **Swap only the skin:** procedural canvas textures → baked **KTX2** maps via `KTX2Loader`; geometry =
  one wedge **instanced ×7**. The deterministic eject timeline is untouched.
- HDRI via `RGBELoader` → `PMREMGenerator` (already wired) for soft, real reflections.

---

## Track B — the cinematic intro (when you want it)
- **Blender Cycles** still frames (from stage 3) = print/marketing-grade hero images, free.
- **Higgsfield / Runway / Sora** = the graph→cheese **morph video** (linear, art-layer). I'll write the
  exact prompt (subject, motion beats, brand palette, lighting) on request. It plays, then dissolves into
  the live Track-A wheel.

---

## Recommended sequence
1. **Texture pass** (stage 2, lean path) → drop the real map set onto the current prototype to prove the
   realism jump in-engine. *Biggest visible win; do this first.*
2. **Blender bevel + bake + HDRI** (stages 3–4) → the "is that a render or a photo?" moment.
3. **Embed** as a `kind:"code"` scene-slot in a `flow` manifest (the apex landing hero).
4. **Track B intro** in Higgsfield, last (decorative, parallel-izable any time).

## Acceptance bar
Reads as **photographed Asiago** at the eject pose · holds **60fps** on desktop · **< 2MB** assets ·
deterministic motion unchanged · degrades gracefully to a static hero image where WebGL is unavailable.
