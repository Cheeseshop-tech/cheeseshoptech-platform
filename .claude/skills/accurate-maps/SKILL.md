---
name: accurate-maps
description: Draw geographically accurate maps as SVG from official boundary data — production zones (DOP/PDO/AOC), regions, provinces, appellations, milksheds. Use whenever a map is needed for a sign, slide, deck, label, poster or web page. Triggers on "draw a map", "show the region", "map the zone", "where it comes from", "production area", "origin map", "recreate this map". Do NOT generate maps with an image model.
---

# Accurate maps

## The rule

**Never draw a boundary by hand, and never generate one with an image model.**

Hand-estimated lat/long polygons look like blobs. Firefly, Midjourney and every other
generative image model will produce something that *resembles* the region and is wrong in
detail — wrong province shapes, invented coastlines, hallucinated borders.

For a provenance or origin piece this is the one error that destroys the argument. The whole
point of a DOP/PDO map is "this product is legally certified to come from exactly here." A
beautiful map with a wrong border is worse than no map, because it invites the one challenge
you cannot answer.

Boundaries are **data**. Get the data.

## Method

1. **Fetch official boundary data.** Sources that work, in order of preference:
   - National statistics offices — ISTAT (Italy), IGN (France), INE (Spain), Ordnance Survey (UK)
   - `openpolis/geojson-italy` on GitHub — ISTAT-derived, region / province / comune levels
   - Natural Earth (`naturalearthdata.com`) — admin-0 and admin-1 worldwide, coarse
   - OpenStreetMap via Overpass — best for appellation boundaries that exist as relations
2. **Extract only the features you need** by name from the properties. Print what you matched;
   never assume a name string matched.
3. **Project.** Equirectangular with a `cos(mean latitude)` correction on x is correct for a
   single region. Use Mercator only if the piece spans many degrees of latitude.
4. **Simplify** with Ramer–Douglas–Peucker. Tolerance by output size:

   | Output | Tolerance (degrees) | Result |
   |---|---|---|
   | Full slide / poster | 0.003 – 0.004 | ~2–4 KB per province, keeps real coastline |
   | Card / thumbnail | 0.01 – 0.015 | ~800 B per province |
   | Country inset (~100 px) | 0.05 – 0.06 | whole country ~20 KB |

   Simplify **after** projecting is fine; simplifying in degrees before projecting is simpler
   to reason about. Either way, check the output — over-simplification eats peninsulas.
5. **Emit SVG paths**, one `<path>` per feature, so each is independently styleable. Round
   coordinates to 1 decimal; more is wasted bytes.

## Rendering rules

- **One fill carries the argument.** The zone gets the brand/accent color; everything else is
  neutral. Resist coloring more than one thing.
- **Show what's excluded.** A neighbouring city or province just *outside* the boundary does more
  persuasive work than the zone itself — it proves the line means something.
- **Partial inclusion gets a hatch, never a solid.** If a zone includes only *part* of a province
  (common — most appellations are defined at municipality level), hatch the whole province and
  label it "partial." Never guess the internal line. Fix it properly by getting the
  municipality-level list from the legal specification (the *disciplinare* / *cahier des charges*)
  and shading those municipalities.
- **Label contrast.** A label sitting on the filled zone must reverse out. Use
  `paint-order:stroke` with a stroke matching the fill's dark edge so it reads over both the zone
  and the ground.
- **Check every label for collision** after rendering. Screenshot it; don't trust the markup.

## Verify before shipping

Render headless and *look at it*:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --screenshot=out.png --window-size=1280,3000 --hide-scrollbars \
  --virtual-time-budget=5000 "file://$PWD/page.html"
```

Then read the PNG back. Specifically confirm: the excluded city really is outside the fill;
no label overlaps another; nothing is clipped by the container; the inset is recognizable.

## Where Adobe tools fit

Illustrator and Express are right for *finishing* a map — type, styling, print prep — on top of
accurate vector. They are not how you derive the geometry. Bring correct paths in; style there.

## Worked example

`design/asiago-shelf-talkers/asiago-provenance-cards-and-map.html` — the Asiago DOP zone from
ISTAT province boundaries: Trento + Vicenza solid as the zone, Padova + Treviso hatched as partial,
Bolzano deliberately left grey just outside the line because that exclusion *is* the argument.
Generator: see the build log entry for 2026-08-25.
