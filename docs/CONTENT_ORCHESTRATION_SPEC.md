# Content Orchestration — architecture spec

**Status:** Draft (2026-06-16) · **Owner:** Rick Posada · **Read with:** `BRAND_KIT_AND_PROPOSAL_SPEC.md`,
`MEDIA_HUB.md`, `DATA_OWNERSHIP_MAP.md`, `BUILD_LOG.md`.

## 1. Principle
This is **content orchestration, not file-moving.** A finished piece is dispatched as **a link** (a live
composition) **or a file** (PDF / image), and is represented everywhere by a **thumbnail** — the catalog
never hauls heavy files around. One physical store (Cloudinary), one front door for assets (Media Hub),
one organized catalog of finished work (Content Library). No fact or file has two homes.

## 2. The three surfaces
- **Media Hub** — the single Cloudinary-backed asset store + tagging hub ("the dispatch hub"). All physical
  files live here; everything is tagged. **Write access to Cloudinary is gated to CheeseShop TECH (house).**
- **Content Studio** — where client / client-admin **compose** (proposals, slide decks, social posts, email
  campaigns, blog posts) by pulling Media Hub assets. Composing produces a **composition** (references), not
  a file. On completion the piece is **submitted to CheeseShop TECH** — users do not self-publish.
- **Content Library** — the **organized catalog** of finished, approved work. Holds **links + thumbnails**
  that *reference* Media Hub assets (never copies). Categorized; supports open, share, download, and quota.

## 3. Flow (the wiring)
1. **Compose** in Content Studio, pulling tagged images from the Media Hub.
2. **Submit** the completed piece to CheeseShop TECH (status: *Submitted*).
3. **Review** (CST): check for **duplicates**, approve or return. CST is the **only** party that writes a
   file to Cloudinary (when the dispatch is a file) and tags it in the Media Hub.
4. **Post**: CST publishes to the Content Library as a **link** (live deck/proposal) or a **file**
   (PDF/image), each with a **thumbnail** (status: *Posted*).
5. **Use**: open, **share link**, or **download to device** from the Library.

## 4. Composition vs. artifact (the rule that keeps it clean)
- **Composition** (live deck / proposal): stored as data (references + metadata). Edit = re-open in Content
  Studio. Shared by **link**. No Cloudinary file unless exported.
- **Artifact** (PDF, social-post image, email/blog HTML, exported deck): a **rendered file** → written to
  Cloudinary by CST → tagged in Media Hub → catalogued in the Library. **Downloadable.**
Don't force live decks into files; do route exported artifacts through Media Hub.

## 5. Content-type taxonomy = the categories
Add **one content-type tag dimension** to the Media Hub taxonomy. The Library's category tabs are simply
**views filtered by this tag** — so tagging (Media Hub) and organizing (Library) are the same act:
`presentation` · `slide-deck` · `social-post` · `email-campaign` · `blog-post`.

## 6. Roles & access
- **client / client-admin:** compose in Studio; submit; browse the Library; download/share posted pieces.
- **CheeseShop TECH (house/admin):** review, de-dup, approve/return; **sole Cloudinary writer**; posts to
  the Library; manages tags.
- No role except CST writes files to Cloudinary. (Extends the existing `canDeleteMedia` = admin/client-admin
  gating pattern.)

## 7. Submission workflow (states)
`Submitted` → `In review` → `Posted` (or `Returned` with a note). Each piece carries its status; nothing
appears in the public Library until *Posted*. v1 reviewer = house/CST only (Rick).

## 8. Dispatch choices (per piece, chosen at submission)
- **Store in Library** — catalogued, shareable, counts against the client's quota.
- **Download to device only** — generated, handed off, **nothing kept server-side** (no quota use, not catalogued).

## 9. Storage quota
Each client has a **capped number of stored proposals/pieces — default 10.** When full, the client must
**delete an old one or download it** to free a slot. Enforced at save; a clear "library full" prompt offers
delete/download. Keeps storage and cost predictable. (Number is a per-tenant config.)

## 10. Content Library features (mapped to the model)
- **Upload** → lands in Media Hub (CST-gated write); appears in the Library as a referenced, tagged entry.
- **Edit** → *metadata* (title, category, tags) via the existing `media-update` function; *content* = re-open
  the composition in Content Studio.
- **Download to device** → Cloudinary delivery with the attachment flag (`cldImage` already supports
  `attachmentName`).
- **Share** → link (Web Share API → clipboard), already built.
- **Categories** → tabbed views over the content-type tag (§5).

## 11. Caveats to plan for
- **Raw/finished types:** PDFs/PPTX are Cloudinary `raw`/image resource types; `media-list` currently focuses
  on images under the tenant prefix — surfacing finished files needs a small backend tweak.
- **PPTX** won't inline-preview (PDF does). PDF delivery is enabled on the account.
- **Single source of truth:** Library entries reference Media Hub assets by `public_id`; never duplicate.

## 12. Build slices (each independently shippable)
1. **Content-type taxonomy + Library category views** — add the tag dimension; tabbed/filtered Library.
2. **Submission queue + CST review/dedup** — submit from Studio; house review surface; Posted/Returned states.
3. **Download-to-device** — attachment-flag delivery; the "download only" dispatch option.
4. **Storage quota** — per-tenant cap (default 10), full-state prompt (delete/download).
5. **Finished-file backend** — extend `media-list`/upload to handle raw/finished types + CST-gated writes.
Already shipped (foundation): MediaPicker, the images-only deck composer (Content Studio → link-based deck →
Content Library), Load/Share/Remove, brand-kit attribution.

## 13. Locked decisions (2026-06-16)
- Submission states: Submitted → In review → Posted / Returned.
- Reviewer: CheeseShop TECH (house) only for now.
- Quota: default **10** stored pieces per client.
- Composing lives in **Content Studio**; the Library **holds**; Cloudinary writes = **CST only**.
