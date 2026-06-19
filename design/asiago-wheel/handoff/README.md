# 🧀 Asiago Wheel — Rendering & Animation Handoff

A self-contained package of the **3D Asiago cheese-wheel showpiece**: the interactive nav, its animation,
the photo-textured materials, the source references, and the guides to take it to true photoreal.
Everything here is portable — zip this folder and it travels with all assets intact.

**The concept.** A wheel of Asiago (Monti's flagship) where the 7 wedges are the 7 CheeseShop TECH portal
tools. Spin the wheel → the selected wedge drops to the bottom **active slot**, slides out + presents
itself, and a readout types its page ID + function. Built to live as the **apex-landing hero**.

---

## ▶️ Start here — open these in a browser (double-click)
| # | File | What it is |
|---|------|------------|
| ⭐ | `prototypes/flow-landing-wheel-hero.html` | **The payoff** — the wheel as a full brand-painted landing page hero. |
| ⭐ | `prototypes/asiago-wheel-3d-photoref.html` | The interactive wheel itself (photo textures). Drag to spin · click a slice/chip. |
|  | `prototypes/asiago-wheel-3d-prototype.html` | Same wheel, procedural textures (lighter, shows the mechanic cleanly). |
|  | `prototypes/asiago-wheel-beauty-render.html` | A still "beauty" composition (cast shadows, hero angle). |
|  | `prototypes/asiago-wedge-3d-photoreal.html` | A single wedge with the PBR skin (material study). |
|  | `prototypes/asiago-wedge-3d-prototype.html` | The original single-wedge geometry proof. |

> All prototypes are **self-contained HTML** — textures are inlined, only Three.js loads from a CDN, so
> they need an internet connection the first time. No build step, no server.

## 🖼️ stills/ — preview images (no browser needed)
- `01_wheel-interactive_final.png` — the interactive wheel, Proforma ejected at the slot
- `02_flow-landing-hero.png` — the wheel living as the landing hero
- `03_beauty-render-still.png` — the in-engine beauty render
- `04_single-wedge-photoreal.png` — the single PBR wedge

---

## 📦 What's in the box
```
handoff/
├─ README.md            ← you are here
├─ prototypes/          ← the rendering + animation (open in a browser)
├─ stills/              ← rendered preview PNGs
├─ textures/            ← baked PBR maps (paste + rind · albedo + bump)
├─ references/          ← the 6 source reference photos
└─ docs/
   ├─ ASIAGO_WHEEL_RENDER_PLAN.md   ← the strategy (author-heavy / ship-light)
   └─ ASIAGO_WHEEL_BLENDER_BUILD.md ← the step-by-step to TRUE photoreal
```

**textures/** — de-lit reference crops baked into maps (paste eyes from `formaggio…`, rind from
`slider_vecchio`). These are the current in-engine skins; production maps come from Substance (see docs).

**references/** — raw source photos. `slider_vecchio.png` (clean 3⁄4 wedge) and
`formaggio_asiago_dop_stagionato--sm.jpg` (big eyes + rind) are the leads.

---

## ✅ Status & what's next
| Layer | Status |
|---|---|
| Interactive mechanic · perspective · **deterministic** eject animation | ✅ Done |
| Photographic paste/rind textures (in-engine) | ✅ Done |
| Embedded as the **flow landing hero** | ✅ Done |
| **True photoreal** (beveled, path-traced) | ⏳ Stage 3 — see `docs/ASIAGO_WHEEL_BLENDER_BUILD.md` |

**The animation is deterministic** (scripted, repeatable path — no random motion): rotate slice to slot →
slide radially out + toward camera → one clean 360° → settle facing front and hold.

**To reach true photoreal:** follow `docs/ASIAGO_WHEEL_BLENDER_BUILD.md` (Blender + Substance, on a
desktop). It produces a hero still **and** a web `.glb` that drops back into `asiago-wheel-3d-photoref.html`
with the animation code unchanged. The single most important input: **one clean, even-lit macro photo of a
cut face + one of the rind** (the web-res references here cap crispness at hero scale).

## 🔧 Specs (must match if you re-model)
7 wedges · **51.43°** each · radius:height ≈ **3:1** · **paste** = the two radial cut faces · **rind** =
curved arc + top + bottom · wedge **apex at world origin** · export **Y-up**.

---
*CheeseShop TECH · Asiago wheel showpiece · shelved 2026-06-19. Full history in `docs/BUILD_LOG.md` (main repo).*
