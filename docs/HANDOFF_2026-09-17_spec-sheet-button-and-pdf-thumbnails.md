# Handoff — Spec sheet button, dead download link, and the PDF thumbnail problem

**Written:** 2026-09-17, after `efbea47` shipped (Gap 3 — spec sheets visible in Media Hub + Buyer
Catalog). **Status:** 📋 SPEC + 1 LIVE BUG. Written after Rick looked at the shipped result:
*"ok the slot is there for the spec sheets but no thumbnail or downloadable file. create a spec
sheet button so we can call up the group quickly. then lets tackle the PDF problem."*

Three separate things are tangled together in that sentence, and they have very different sizes.
Taking them in the order they should actually be done, not the order they were said.

---

## Fix 1 — the download link is dead (LIVE BUG, ~5 lines)

This one is not a feature request. `efbea47` shipped a spec-sheet download link that 404s, and
this is why Rick sees "no downloadable file."

**Root cause — two Cloudinary behaviors for `resource_type: raw` that don't match images:**

1. A raw asset's `public_id` **already contains its file extension**. The manifest record reads
   `"publicId": "monti/01174-specsheet.pdf"` — not `monti/01174-specsheet`. Image assets are the
   opposite: extension stripped, carried separately in `format`.
2. Cloudinary returns **no `format` field at all** for a raw resource. The manifest records have
   no `format` key (check `src/data/montitrentini/images.json` — the document entries jump
   straight from `bgRemoved` to `kind` to `bytes`).

`cldDocDownload()` (`src/lib/catalog.js`) does `...${im.cl_id}.${im.ext || "pdf"}` — so with
`ext` undefined it builds `monti/01174-specsheet.pdf` **+ `.pdf`** and asks Cloudinary for
`...specsheet.pdf.pdf`. Verified with curl:

```
200  application/pdf  290839  raw/upload/monti/01174-specsheet.pdf                     ✅
200  application/pdf  290839  raw/upload/fl_attachment/monti/01174-specsheet.pdf        ✅
200  application/pdf  290839  raw/upload/fl_attachment/v1789676268/monti/…-specsheet.pdf ✅
404  —               0       raw/upload/fl_attachment/monti/01174-specsheet.pdf.pdf    ❌ ← shipped
```

**Fix:** never append an extension that's already there. In `src/lib/catalog.js`:

```js
// A raw asset's public_id already carries its extension (monti/01174-specsheet.pdf) and
// Cloudinary returns no `format` for raw — appending one produced a dead .pdf.pdf URL.
const docPath = (im) =>
  /\.[a-z0-9]+$/i.test(im.cl_id || "") ? im.cl_id : `${im.cl_id}.${im.ext || "pdf"}`;

export const cldDocUrl = (cloud, im) =>
  `https://res.cloudinary.com/${cloud}/raw/upload/${im.cl_v ? `v${im.cl_v}/` : ""}${docPath(im)}`;

export const cldDocDownload = (cloud, im) =>
  `https://res.cloudinary.com/${cloud}/raw/upload/fl_attachment/${im.cl_v ? `v${im.cl_v}/` : ""}${docPath(im)}`;
```

Same bug, same shape, in `media-hub.jsx`'s `AssetDialog` — both `deliveryUrl` and the
"Download <FORMAT>" button do `${asset.publicId}.${asset.format || "pdf"}`. Same guard.

**While in there — derive a format so the tiles stop saying "FILE".** Because raw assets have no
`format`, `AssetTile` renders `{asset.format || "file"}` and the catalog's Format row reads
`hero.ext?.toUpperCase()` → empty. In `mapResource()` (`media-list.js`) and the manifest builder
(`sync-images.mjs`), fall back to the public_id's extension for raw:

```js
const format = r.format
  || (resourceType === "raw" ? (/\.([a-z0-9]+)$/i.exec(r.public_id)?.[1] || "").toLowerCase() : undefined);
```

Cosmetic sibling, same place: `categoryFromId()` gives these documents a category of
`"01174 Specsheet.Pdf"`. Give `kind: "document"` records a flat `category: "Spec Sheets"` instead.

---

## Fix 2 — the spec sheet button ("call up the group quickly")

There is currently no way to see all 15 spec sheets as a set. They're findable only by opening
the one item they belong to. Note that all 15 carry a `spec-sheet` tag, but `spec-sheet` is **not**
in `USAGE_IDS`, so it can't drive a Media Hub tab the way `hero` or `social` can.

**Don't add `spec-sheet` to the usage taxonomy to solve this.** Usage tags describe *purpose*
(where an asset may be used); `kind` describes *what the file is*. A document is a document
whether or not somebody remembered to tag it. Filter on `kind`.

**2a. Media Hub — a "Spec sheets" view in the left rail.** This is the real "call up the group"
affordance, and it's ~4 lines in `src/components/media/media-hub.jsx`:

```js
const TABS = [{ id: "items", label: "Items" }, { id: "recent", label: "Recent" },
              { id: "all", label: "All" }, { id: "documents", label: "Spec sheets" },
              ...USAGE.map((u) => ({ id: u.id, label: u.label }))];
```
- `display`: add `: tab === "documents" ? (merged ? merged.filter((a) => a.kind === "document") : null)`
- `countFor()`: add `if (id === "documents") return merged ? merged.filter((a) => a.kind === "document").length : null;`
- **Gotcha:** the rail draws its dividers with `(i === 1 || i === 3)`. Inserting a 4th special tab
  shifts where the usage group starts — change to `(i === 1 || i === 4)` or the divider lands in
  the middle of the special tabs instead of above the usage list.
- Give the `documents` tab its own `EmptyState` copy; the current fallback says "Nothing tagged
  "Spec sheets" yet", which is wrong — it isn't a tag.

**2b. Buyer Catalog — make the lightbox entry an actual button.** Today each spec sheet renders as
a small underlined `<a>` (`buyer-catalog.jsx`, the block right after the `</dl>`). Every sibling
action in that pane ("View original", "Download original", "Download PNG", "Share") is a full-width
`<Button>`. Match them — `variant="secondary"`, `<Download />` icon, label `Spec sheet (PDF)`, or
the doc title when there's more than one (item `03044` has two). Reads as an action instead of
fine print, which is most of why it didn't look like a download.

---

## Fix 3 — the PDF problem (thumbnails). Diagnosed, and the answer is already in this account.

**Why there's no thumbnail: raw assets cannot be transformed. At all.** Not "the transform needs
different params" — Cloudinary accepts the URL, silently ignores the transformation, and hands
back the original file:

```
200  application/pdf  290839 bytes  ← raw/upload/pg_1,w_400,f_jpg/monti/01174-specsheet.pdf
```

That's a 290 KB PDF returned from a URL that asked for a 400px JPEG. Nothing on the delivery side
will fix that, because `raw` means "store these bytes, hand them back untouched."

**The answer: PDFs belong in Cloudinary as `resource_type: image`, not `raw`.** This isn't a
theory — `src/lib/cloudinary.js` already ships `pdfThumbUrl()` built for exactly this, its comment
says so ("Cloudinary stores PDFs as the `image` resource_type, so a delivery URL with the `pg_<n>`
page-extraction transform renders that page to a raster"), and **there are already three image-type
PDFs in this account**, uploaded through the Presentations flow (`uploadFileAuto()` → the
`auto/upload` endpoint, which classifies a PDF as an image). Tested against the live
ACE Endico sell sheet (`monti-trentini/products/ace-fall-show-2026/ace-endico-selection-sell-sheet`,
`width: 612, height: 792, pages: 2`):

```
200  image/jpeg        43122     image/upload/pg_1,c_limit,w_400,f_jpg,q_auto:good/….jpg   ← page-1 thumbnail
200  image/png         17198     image/upload/c_pad,b_white,w_360,h_360,f_auto,q_auto/….jpg ← the stock `card` preset!
200  application/pdf   5929015   image/upload/fl_attachment/v1789387450/….pdf               ← full download
```

Three things fall out of that, and they're all good news:

1. **The account's "Allow delivery of PDF and ZIP files" setting is already ON.** That's the usual
   blocker for this whole approach and it's already cleared — no Cloudinary console trip needed.
2. **Thumbnails need no new code.** The existing `card` preset works directly on an image-type PDF
   as long as the URL asks for `.jpg` rather than `.pdf`. `cldImage()` appends `.${format}` and
   `format` would be `"pdf"`, which would hand back the PDF — so documents need their delivery
   extension forced to `jpg` for thumbs (or just route them through the existing `pdfThumbUrl()`).
3. **Downloads keep working**, via `image/upload/fl_attachment/…​.pdf`.

**What the migration actually involves:**

- Re-upload the 15 spec sheets to `auto/upload` (or `image/upload`) instead of `raw/upload`, with
  the same `context` (`code`/`sku`/`title`) and the same tags.
- **The public_ids change.** Image-type strips the extension: `monti/01174-specsheet.pdf` becomes
  `monti/01174-specsheet`, with `format: "pdf"` carried separately. Nothing references these URLs
  yet except the manifest, so the blast radius is one `sync-images.mjs` run — but it does mean the
  raw originals must be deleted afterward or every item shows its spec sheet twice.
- Then regenerate the manifest and the documents arrive through the **original** `resources/image`
  path, with `width`/`height`/`pages`/`format` populated like any other asset.

**Do NOT rip out the raw-fetch plumbing from `efbea47` afterward.** It stays correct and useful:
a genuinely-raw document (an `.xlsx` price file, a `.docx`, a `.zip` of label art) can never be an
image-type asset, and `kind: "document"` is exactly the flag those need. After this migration the
raw path simply stops being what the *PDFs* depend on.

**This step needs Rick's go-ahead before it can run.** It's a write against live Cloudinary
(15 uploads + 15 deletions), and this session hit the safety gate on direct Cloudinary writes —
the same gate that's still holding the `01114` / `20482` / `01286` promotion described in
`HANDOFF_2026-09-17_media-roles-and-spec-sheets.md`. Both want the same unlock.

---

## Build order

1. **Fix 1** — the dead download link. It's live and it's five lines. Everything else can wait
   behind it; nothing else here is broken, it's just missing.
2. **Fix 2** — the spec sheet button (Media Hub rail view + catalog lightbox buttons). Pure
   front-end, no Cloudinary involvement, immediately useful on the 15 sheets already loaded.
3. **Fix 3** — the PDF re-upload for thumbnails. Last, because it's the only one that touches
   live assets, and because 1 and 2 make the current raw PDFs perfectly usable in the meantime
   (a labeled download button with no picture on it is a long way from broken).

## Not in scope here

- Multi-page preview / an in-app PDF reader. Once the sheets are image-type, `pg_2`, `pg_3`… are
  free on the delivery URL if a page-flipper is ever wanted, but a thumbnail plus a download
  covers what a buyer or a rep actually does with a spec sheet.
- Re-uploading the three existing image-type PDFs (the ACE sell sheet, the two HEB decks). They're
  already in the right resource type; they're just not tagged `product-catalog`, so they never
  reach the Buyer Catalog. Separate decision, not a bug.
- The `03044` duplicate (two files, both labeled rev2, dated 08-27 and 08-21). Still waiting on
  Rick's call on which supersedes; migrating both is fine, deleting the loser is a one-liner after.
