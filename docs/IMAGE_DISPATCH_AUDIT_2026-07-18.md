# Image Dispatch + Background Audit — 2026-07-18

**Scope:** verify (1) every qualifying image (Media Hub asset carrying a **product tag** +
**item number**) is dispatched to every app through Media Hub/Cloudinary — never a second,
divergent source — and (2) every qualifying image sits on a **removed/transparent background**
so it renders consistently against each app's own lightbox color. Read against the real code
(`src/lib/cloudinary.js`, `images.js`, `catalog.js`, `media.js`, `items.js`, `studio-director.js`,
`scripts/sync-images.mjs`, `netlify/functions/media-list.js`) and the live Cloudinary account
(cloud `sofcvmwa`), not just the docs.

**"Qualifying" defined as found in code:** product tag = the Cloudinary usage tag
`product-catalog` (`PRODUCT_USAGE_ID` in `lib/media.js`). Item number = the asset's
`context.custom.sku` field. Both are set today from the asset editor in Media Hub
(`items-panel.jsx` / asset dialog → `updateAsset({ sku, usage })`).

---

## 1. Dispatch — is Media Hub/Cloudinary really the one source?

**Finding: there are two separate pipelines, and only one of them is what most people mean by
"Media Hub."**

| Pipeline | Feeds | Reads Cloudinary via | Honors the `product-catalog` tag? |
|---|---|---|---|
| **Manifest pipeline** | Product Catalog, Proposals, Pricing Tool | `src/data/montitrentini/images.json`, built by `scripts/sync-images.mjs`, read by `lib/images.js` (`imageForCode`/`codeImageUrl`) | **No** |
| **Live pipeline** | Media Hub UI itself, Content Engine's `MediaPicker` / Studio Director | `netlify/functions/media-list.js` → `lib/media.js` `listAssets()` | Yes — `usage[]` is a first-class field |

The gap: `sync-images.mjs` builds the committed manifest from `ctx.code || ctx.sku` alone —
**it never checks `tags` at all.** Any asset anywhere in the tenant's Cloudinary folder that
happens to carry a `sku` in its context enters `images.json` and therefore the Catalog,
Proposals, and Pricing Tool — whether or not anyone ever tagged it `product-catalog`, and
regardless of what it's actually a photo *of*. Conversely, an asset tagged `product-catalog` but
missing a `sku` (six "family" lifestyle shots and one mistagged logo, found live — see §3) is
correctly excluded from the manifest, but for the wrong reason: the manifest was never checking
the tag to begin with.

**Confirmed live, not hypothetical:** `monti-trentini/library/mucche-alpeggio` — a cows-grazing
lifestyle photo tagged `hero, lifestyle, story-block` (no `product-catalog` tag at all) — carries
`context.sku: "20724"`, the same item number as the correct Alpeggio packshot
(`monti-trentini/asiago/asiago-di-alpeggio-1bvaaz`). This is the exact defect the 2026-07-09
Image Health report flagged ("`20724` is linked to a photo of cows... marked
`approved-for-press`"). **It is still live nine days later** — because nothing in the pipeline
that builds `images.json` ever looks at whether an asset is tagged as a product photo. Whichever
of the two assets sorts first wins the SKU (`imageForCode` takes the first match); today that's
manifest-order luck, not a rule.

**Second gap — the legacy `monti/<code>` folder is mostly untagged.** Of the 70 assets in this
folder (Monti's original per-item packshots, item number literally in the filename), only **11**
carry any tag or context at all. The other **59** — including many of the exact-weight/wedge SKUs
Rick specifically requested photography for (`40107`, `40109`, `40103`, `40104`, `40130`,
`40140`, `40158`, `40174`, `40175`, `20450`–`20453`, `20511`–`20584`, `05001`–`05095`, `04028`–
`04181`, `03023`, `03057`, `01021`–`01269`, and more) — have **empty `tags: []` and empty
`context: {}`**. The item number lives only in the filename, which the build-time
`sync-images.mjs` (Admin API mode, the mode that produced the committed manifest) never reads —
only the *live* `--live` mode (via `media-list.js`) derives SKU from a legacy filename, and only
when `cloudinaryLegacyFolders` is configured for the tenant. Net effect: a real, already-shot
photo can exist in Cloudinary, correctly named by item number, and still never reach the app,
because it has neither the tag nor a recorded item number in Cloudinary's own metadata — only in
its filename. Several of these may already be superseded by a newer, properly-tagged duplicate
elsewhere (the Image Health report's "four SKUs carry two packshots each" issue), but that
couldn't be confirmed for all 59 without a name-by-name pass.

**Third gap — nothing gates on approval state.** `lib/images.js` `imageForCode()` matches on
`code`/`sku` only; it does not check `approvalState`. Confirmed live: `apericheese-red` (item
`30015`) is tagged `product-catalog` with `sku: "30015"` set, but is **still tagged `draft`** —
and would flow straight into the manifest and onto a customer-facing proposal exactly like an
approved photo, because nothing in the render path checks the approval tag. This matches the
2026-07-09 finding ("117 of 242 images are still draft... nothing enforces that today") — still
true.

**What's actually clean:** the *delivery* layer is genuinely unified — every surface calls
`cldImage()` in `lib/cloudinary.js` for the actual URL, so there's no raw
`res.cloudinary.com` string anywhere outside that one file, and Catalog/Proposals/Pricing all
resolve a SKU's photo through the same `codeImageUrl()`/`imageForCode()` functions in
`lib/images.js`, not their own copies. The one sanctioned non-Cloudinary path is
`/public/placeholders/<code>.webp` — low-res reference thumbnails, explicitly opt-in per call
site, and by design **never used by proposals or the Catalog** (only the internal Proforma tool).
That exception is documented and scoped correctly; it is not a leak.

---

## 2. Background / transparency

**Finding: essentially none of today's qualifying product images are on a transparent
background, and the delivery layer would flatten them to white even if they were.**

Live count (search `tags=product-catalog`, cloud `sofcvmwa`): **62 assets** carry the
`product-catalog` tag. Of those, **~33 distinct item numbers** are represented (39 tagged
asset records once you count the 6 SKUs that have duplicate photos — `02005` has three). Format
breakdown of the qualifying, item-numbered set:

| Format | Count | Note |
|---|---:|---|
| `jpg` | ~37 of 39 | **JPG cannot carry an alpha channel — these are flat/opaque by construction, no matter what's behind the cheese in the shot.** |
| `png` | 2 of 39 | `20724` Alpeggio (the correct one) and `30015` Apericheese Red (still `draft`) — PNG *can* carry transparency but doesn't guarantee it; neither was verifiable as truly transparent (see caveat below). |

**Zero verified transparent product photos today.** The spec has said "white or transparent
background for packshots" since at least `IMAGE_HEALTH_2026-07-09.md` and repeated in
`MARKETING_IMAGE_REQUEST_2026-07-13.md` — in practice, every qualifying shot taken so far is a
flattened JPG, which reads as a **studio white-background photo, not a background-removed
transparent one.**

**Caveat — verification is capped by the Cloudinary plan.** Cloudinary's Search API supports a
`transparent:true/false` filter that would give an exact answer, but this account's plan returned
`"Your subscription plan does not support image analysis queries"` when queried. Format alone
proves the negative for JPGs (definitely not transparent) but can't positively confirm alpha on
the 2 PNGs without either an upgraded plan or opening each in an editor.

**The delivery pipeline would defeat transparency even if it existed.** `lib/cloudinary.js`
`TRANSFORMS` — the single place every preset is defined — hardcodes `b_white` (pad-to-white) on
the three presets actually used for product display:

```
micro:   "c_pad,b_white,w_96,h_96,f_auto,q_auto"
thumb:   "c_pad,b_white,w_160,h_160,f_auto,q_auto"
card:    "c_pad,b_white,w_360,h_360,f_auto,q_auto"     ← Catalog cards, Proposals, Pricing rows
```

`b_white` **bakes a solid white background into the delivered pixels**, flattening any alpha
channel the source PNG might carry. So even a perfectly background-removed transparent packshot
would render on forced white at every size that matters today. Only `preview`/`hero`/`original`
(`c_limit`/`c_fit`, no `b_*` param) would pass transparency through — and even there, nothing
downstream picks a background color *per app*; it would just show whatever's behind the `<img>`
in the DOM (today that's `bg-white` divs everywhere — Catalog, Proposal builder/view, Pricing
Tool, Media Picker all wrap images in `bg-white` containers, confirmed in each component).

**What this means for the ask specifically:** "transparent, so it appears on the app's own
lightbox background color" isn't buildable on top of the current preset definitions — `b_white`
would need to become conditional (skip padding-to-white for assets confirmed background-removed)
before a transparent PNG could ever show anything other than white in the Catalog/Proposals/
Pricing card views. The container divs are already correctly per-surface (`bg-white` today, but
that's just a Tailwind class — trivial to make surface-specific later); the blocker is entirely in
the transform string.

---

## 3. Other tagging defects found live (not previously known)

- **A logo is mistagged as a product photo.** `monti-trentini/library/tswf07fmciwdpp13facm`
  ("MT Official oval logo_trim") carries `product-catalog` + `draft` + `brand-asset` +
  `web-marketing` + `print`. It has no `sku`, so it can't leak into the manifest today, but it
  would show up in any tag-filtered picker (Content Engine's `MediaPicker`, tag = `product-catalog`)
  alongside real packshots.
- **Six "family" category shots are tagged `product-catalog` with no item number** —
  `specialita-trentine-famiglia`, `pastafilata-famiglia`, `provolone-valpadana-dop-famiglia`,
  `granapadano-dop-famiglia`, `caciotte-famiglia`, `asiago-dop-famiglia`. These look like
  intentional category-hero images, not per-SKU packshots — fine as long as no surface assumes
  "has `product-catalog` tag" implies "is a single item's packshot," which the manifest currently
  does NOT (see §1), so no live bug today — but worth a decision on whether they need their own
  usage tag (e.g. `category-hero`) so they're not confused with packshots.
- **One real product photo, tagged and approved, has no item number at all:**
  `monti-trentini/caciotta/truffle-caciotta-1mm-t4` — `product-catalog`, `approved-for-press`,
  but no `sku` in context. Fails the "item number" half of the qualifying bar even though it's a
  legitimate packshot.
- **Six confirmed duplicate-SKU pairs** (re-confirmed live, same as 2026-07-09): `02005` (×3
  assets), `20228`, `20161`, `20150`, `20144`, `20141`, `02206`, `02073`. `imageForCode` takes
  whichever sorts first — not a deliberate choice.

---

## 4. Summary

| Criterion | Status |
|---|---|
| One dispatch source (Media Hub/Cloudinary) for every app | **Partially true.** Delivery URLs are unified (`cldImage`), but the Catalog/Proposals/Pricing manifest and the Content Engine's live picker read via two different code paths with different rules — the manifest ignores usage tags entirely, so tag hygiene doesn't protect it. |
| Qualifying images verified before dispatch | **Not enforced.** No approval-state gate, no tag gate — only "has a sku" gates the manifest, and that alone let a wrong-SKU lifestyle photo through live. |
| Removed background / transparent, consistent per-app color | **Not met today, and not achievable yet.** Zero verified transparent qualifying photos; the delivery presets force white regardless. |

None of this is a criticism of the plan — the docs (`IMAGE_PIPELINE_SPEC.md`,
`ASSET_LIBRARY_SPEC.md`) already describe the "one mind, one body" target correctly. The gap is
between that target and what `sync-images.mjs` and `cloudinary.js` actually check today.

---

## 5. Recommended fix (going forward, so new tags auto-comply)

1. **Make the manifest tag-aware.** In `scripts/sync-images.mjs`, only include an image if it
   carries BOTH `tags.includes('product-catalog')` AND a `sku`/`code` context value — closes the
   `20724` cow-photo class of bug at the source, permanently, for every future upload.
2. **Gate on approval state too.** Same script: skip anything not `approved-for-press` (or
   stricter). A draft can be tagged and SKU'd during setup without going live by accident.
3. **Add a `bg-removed` tag convention** (Rick applies it in the asset editor once a packshot is
   actually background-removed) and carry it into the manifest as a boolean. Then split the `card`/
   `thumb`/`micro` presets in `cloudinary.js` into a transparent-safe variant (no `b_white`) used
   only when `bg-removed` is true, falling back to today's white-pad behavior otherwise — so
   nothing breaks for the ~33 SKUs that are still flat JPGs while new tagged-and-removed images
   start rendering on the surface's real background color instead of forced white.
4. **One command, one report.** Add a `validate:images` script (sibling to the existing
   `validate:clients`) that Rick can run anytime: prints every `product-catalog`+`sku` asset,
   flags missing background-removal tag, non-approved state, duplicate SKUs, and any `sku` used by
   more than one asset — the same checks this audit did by hand, on demand, going forward.
5. **Optional, only if it matters at volume:** Cloudinary's plan currently blocks the
   `transparent:` search filter — upgrading would let step 4's script *verify* alpha instead of
   trusting the `bg-removed` tag Rick applies manually.

Steps 1–2 are the ones that matter most: they're what makes "as I add product tag and item
number, this criteria will be followed automatically" literally true, instead of depending on
Rick remembering to check by hand every time.

---

## 6. Update — fixes #1–4 built same day

Implemented directly after this audit (see the 2026-07-18 Build Log entry for the diff):
`sync-images.mjs` now gates a SKU's `code` on `product-catalog` tag + approval in both modes,
and reads `cloudinaryLegacyFolders` itself in both modes (closing the "`--live` never fetched the
legacy folder" gap). `validate-images.mjs` (new, `npm run validate:images`) gives the report from
§4/§5 as a standing command. `cloudinary.js`/`images.js`/`catalog.js` wire a `bg-removed` tag →
`bgRemoved` manifest field → transparent-safe delivery preset, automatic per-asset, no call-site
changes needed — inert today (every qualifying photo is still flat JPG) until the first asset
gets tagged. Fix #5 (Cloudinary plan upgrade for `transparent:` search verification) is a Rick
decision, not a code change — left open.

Separately, and unrelated to background/dispatch: the Media Hub's "await the whole tenant asset
set before rendering anything" load pattern (root cause of the load-time complaint) is now paged
— see the Build Log entry.
