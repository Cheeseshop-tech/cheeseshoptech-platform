# Loading SVG Brand Assets into the Media Hub

**Bottom line:** SVGs are perfect for logos, seals, icons, and vector marks in presentations (crisp at any size, tiny files). **Verified 2026-06-15 on this account — there is nothing to enable. Just upload them.** SVG is not blocked anywhere in the pipeline:

- **Cloudinary account Security:** SVG is *not* in the "Restricted image types" list and there is no "Allow SVG" toggle to flip on this console (the only delivery toggle there is "Allow delivery of PDF and ZIP files," which is unrelated to SVG).
- **Upload preset `st_unsigned`** (the hub's preset): no allowed-formats restriction.
- **Media Hub file picker:** already accepts `.svg` / `image/svg+xml`.
- **Auto-resize patch:** skips SVGs entirely (never rasterizes them on upload).

> If you went looking for "Allow SVG delivery" and couldn't find it — that's expected. It doesn't exist on this account, and it isn't needed.

---

## Just upload (no setup required)

1. Make sure the latest deploy is green, then **hard-refresh** the Media Hub (⌘⇧R) so the browser drops the old cached bundle.
2. Upload **one** SVG first (your logo is the ideal test).
3. Tag it **Brand assets** (and **Logos** if it's a wordmark/mark).
4. It should appear in the hub. If it's rejected, it's almost always the **cached old bundle** — hard-refresh again or reopen the tab. If a specific error shows, send it to me verbatim and I'll pinpoint it.

## Then load the rest

Once one SVG works, upload the full set and tag them so they're easy to pull into decks:

- **Logos / wordmark** → `Brand assets` + `Logos`
- **DOP / PDO seal, certification marks** → `Brand assets`
- **Icons, vector illustrations, patterns** → `Brand assets` (add `Story block` if used in narrative slides)

---

## How SVGs behave in presentations (good to know)

- **In the portal's slides (HTML render):** an SVG renders natively and stays sharp at any size — ideal for the logo and seal on title/closing slides.
- **Sizing transforms rasterize.** Our image slots run through the standard delivery presets (`c_pad,w,h,f_auto`), which **rasterize an SVG to a fixed-size PNG**. It still looks clean at the slot's size, but you lose "infinite scale" for that instance. For slots where you want true vector (e.g. a logo that may be blown up large), we deliver the **raw SVG URL** without the raster transform — tell me which slots and I'll wire that path.
- **If we ever export to PPTX/PDF:** SVGs typically get rasterized at export time anyway, so keep a **PNG fallback** of the logo on hand (you already have `logo_trim`).

## Use the right format

| Asset type | Best format | Why |
|---|---|---|
| Logo, wordmark, seal, icons, line art | **SVG** | Vector — crisp at any size, tiny file |
| Photography (farm shots, cheese wheels) | **JPG / PNG** | Photos aren't vector; SVG can't represent them |
| Logo needing a universal fallback | **PNG (transparent)** | Works everywhere, incl. email + PPTX export |

---

## Quick checklist

- [x] Cloudinary account allows SVG (verified — no setting needed)
- [x] `st_unsigned` preset has no format restriction (verified)
- [x] Media Hub picker accepts `.svg` (verified in code)
- [ ] Deploy green + Media Hub hard-refreshed (⌘⇧R)
- [ ] Test one SVG (the logo) → appears in hub
- [ ] Upload the rest, tagged `Brand assets` (+ `Logos`)
- [ ] Send me the public IDs → I place them in the sell sheet / deck

*CheeseShop TECH · Media Hub · SVG setup*
