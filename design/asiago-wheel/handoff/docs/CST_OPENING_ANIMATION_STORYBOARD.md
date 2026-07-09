# CST Opening Animation — MASTER SEQUENCE ("data → tech → cheese → apps")

Track B. The branded explainer/hero: a business pie chart becomes the CST app
wheel. Doubles as **advertising + landing-page** content. Art-tech style
(illustrated cel + Freestyle, tech grid), not photoreal.

## THE SEQUENCE (beat by beat)

**1 · DATA OPEN — the pie chart draws itself (2D)**
- On a clean tech canvas, a **pie chart draws itself on** (animated stroke) and
  **populates with CST brand colors**, one slice at a time.
- **Diagram lines + arrows** extend from each slice to a label; each label
  **types out** a generic line-of-business term (typewriter).
- Aesthetic: thin data lines, tick marks, sans (Inter) type — a UI/data graphic.

**2 · GO 3D + GRID — the morph**
- The flat pie **tilts and extrudes into 3D**; a **perspective tech grid fades in**
  beneath/around it (the "tech" layer).
- The segments thicken into wedges and the material **crossfades** flat brand
  color → illustrated cheese (cel + ink outline) — **morphing into the 3D wheel**.

**3 · THE WHEEL — app labels**
- The **8 app labels** appear, one on each of the 8 wedges (real CST app names).
- The wheel **spins** (>half turn) with a faint friction.

**4 · REVEAL — wedge stands + app window**
- One wedge **tilts up rigidly on its edge and stands** (the rigid tilt — already
  built: `renders/rigidtilt_previz.mp4`).
- A **window/card opens** beside the standing wedge with that app's **thumbnail**,
  then plays a **short screen-recording of the app in use**.
- Cycle through the wedges (full explainer) or feature one (per ad variant).

**5 · RESOLVE — logo**
- Pull wide; the **hand-sketched, colored-pencil CST logo** draws + colors itself
  in (the craft/art vibe), with the **recoil** swoop (ease-out-back).
- End card / CTA. **Use: ad creative + landing-page hero.**

> Art direction throughline: **tech** (grid, data lines, brand color) becomes
> **craft** (illustrated cheese, colored-pencil logo). Same duality as the logo
> itself: "CheeseShop" (serif, craft) + "TECH" (sans, digital).

---

## 8 SLICES — labels + app + demo video  (✅ LOCKED 2026-06-20)
Canonical = the TRACKS portal-app set. Pie shows a business term → morphs to the
CST app name on the wheel → demo clip to record:

| # | Pie label (business) | Wheel label (CST app) | Demo video to capture |
|---|---|---|---|
| 1 | Overview | Dashboard | the at-a-glance hub |
| 2 | Marketing | Campaigns | a campaign send |
| 3 | Products | Catalog | the live catalog |
| 4 | Sales | Orders | an order flow |
| 5 | Customers | CRM | a contact / pipeline view |
| 6 | Content | Media hub | browsing the media hub |
| 7 | Pricing | Tools | quoting a buyer live |
| 8 | Decks | Content Studio | composing a deck |
> Wheel labels (Dashboard, Campaigns, Catalog, Orders, CRM, Media hub, Tools,
> Content Studio) match TRACKS_AND_AGENDA.md and the portal-app map. These drive
> the build.

## ASSETS NEEDED
- **8 app screen-recordings** (short ~3–5s loops) — Rick captures from the live
  portal (one per app above).
- **Colored-pencil CST logo** illustration (prompt below / generate in Firefly).
- Have already: illustrated wheel (`wheel_illustrated.png`), rigid tilt rig +
  previz, build/style scripts.

## PRODUCTION PATH
- **2D data open (pie draw + arrows + typed labels):** cleanest as **HTML/SVG**
  (crisp, editable text, easy typewriter) — or After Effects.
- **3D morph + grid + wheel + tilt:** **Blender** (cel + Freestyle; the rigid tilt
  exists). Grid = a shader/plane; morph = extrude + material crossfade keyframes.
- **App windows + demo videos + logo + titles:** **After Effects** comp over the
  rendered cheese (text/logo stay crisp; demo clips composited into the windows).
- Final: data open → morph → wheel/labels → reveal+app windows → logo. Cut ad
  versions (short, one app) + the full landing hero.

## COLORED-PENCIL LOGO — generation prompt (Firefly / Express)
> "The wordmark 'CheeseShop TECH' as a hand-drawn colored-pencil illustration —
> 'CheeseShop' in a warm Fraunces-style serif in terracotta (#9A3B1B) with visible
> pencil strokes and light hatching, 'TECH' in a clean sans in dark espresso
> (#221C14); subtle paper grain, artisanal hand-sketched edges slightly imperfect,
> on a soft cream background. Flat 2D logo illustration, no 3D, no photoreal."
