# Handoff — Asiago Shelf-Talker Template (2026-08-25)

For: the next session, run inside the CST Agency Build repo · Owner: Rick Posada
Read first: `docs/CHEESE_SIGNS_SPEC.md` (the case-sign engine this reuses), then this.
State: **nothing shipped in this repo yet.** Three layout comps proven as a static HTML
mockup.

> **SUPERSEDED IN PART, 2026-08-25 — read `docs/SIGN_COMPOSER_SPEC_2026-08-25.md` first.**
> This document assumed the next step was "Rick picks one layout, then build
> `talkerTemplate()`." He chose not to pick: all three layouts are kept, and the next build is
> a **drag-and-drop composer** that settles layout by direct manipulation instead. Two things
> in this doc are now stale — the "no packshot" decision (reversed, see below) and build-order
> step 1 ("Rick picks a layout"). The canvas, scale, slot-grammar and copy decisions all still
> hold.

---

## Where this came from

Rick wants a second, smaller sign format alongside the existing 3×4"/4×5" case signs: a
condensed single-size **shelf talker** — the small card that clips to a shelf edge or leans
against the wedge itself, as opposed to the case sign that stands behind the whole wheel.
First cut covers the 4 Asiago records only (`asiago-fresco-dop`, `asiago-fresco-montagna`,
`asiago-stagionato-dop`, `asiago-vecchio-dop`), whose copy was just rewritten using language
from the Asiago DOP consortium's own consumer booklet (`docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md`
— see that doc and `docs/CHEESE_SIGNS_SPEC.md` for the reconciliation work behind the copy).

Reference render (source of truth for the visual target) lives in this repo, not shipped code:

- `design/asiago-shelf-talkers/shelf-talker-composition-studio.html` — three fresh layout
  comps (not variations on the case-sign layout), each shown across all 4 Asiago cheeses:
  - **G — Green cap** (recommended default): a solid brand-green header band carrying the
    name, mirrors the case sign's accent-bar logic at a smaller scale.
  - **H — Left rail**: name set vertically down a left-hand rail, freeing more width for the
    sensory cue line.
  - **I — Badge-forward**: the DOP/mountain trust marks lead at the top, for a shopper who
    doesn't already know the Monti Trentini case.
  - This is a **comp for Rick to react to, not a locked design** — pick one (or a hybrid)
    before building the manifest below. G is marked recommended only because it reuses the
    case sign's proven header logic; H and I are genuine alternatives, not throwaways.

---

## The layout, in manifest terms

Once a layout is picked, it's a fifth template in the existing `cheese-sign` family —
same slot grammar as `src/lib/sign-templates.js` (`role` / `kind` / `x,y,w,h` / `z` /
`$tokens`), same Brand Kit tokens, same `SIGN_RECORD` binding model. Nothing new to invent
architecturally; it's a smaller canvas with a lighter slot list.

| Zone | Content | Binds to (same as case signs) |
|---|---|---|
| Header band or rail | cheese name + Italian name | `name`, `italianName` |
| Flavor line | short italic flavor tag | `flavorProfile` |
| Sensory cue (**new**) | one line, consortium-sourced sensory detail — see below | not in `signs.json` yet |
| Rail | milk type + region + minimum age | `milk.type`, `region.label`, `minAge` |
| Trust marks | DOP / mountain badges, conditional | `designation`, `mountainMark` (`showIf`, same as case signs) |
| QR | small, corner-mounted | `qrUrl` |

Design decisions already made in the comp — carry them forward:

- **Canvas: 2.5" × 3.5", 250×350 canvas units** — same 100-units-per-inch scale as the
  case-sign engine (`src/lib/sign-templates.js` `SIGN_SIZES`), so it's a `SIGN_SIZES` entry,
  not a new coordinate system. Add it as `{ id: "talker", label: '2.5" × 3.5"', w: 250, h: 350,
  pad: 14 }` (pad scaled down from the 3×4's 17 proportionally) and reuse `shortTemplate`'s
  scale-factor pattern (`s = w / 300`) rather than hand-tuning every slot position.
- ~~**No packshot.**~~ **REVERSED 2026-08-25 — the packshot is IN.** The original call dropped
  it on the grounds that the talker sits beside the actual wedge, so a photo is redundant.
  Rick: *"we should include a pack shot. it seems there is enough room."* The budget confirms
  it — 330.4 of 350 units, 0.20 in spare — and all four Asiago records already carry a
  Cloudinary `image`. The argument that earns it back is the **cut face**: a wrapped wedge or
  uncut wheel hides the interior paste, which the packshot shows. Pick images on that basis.
  Full arithmetic in `docs/SIGN_COMPOSER_SPEC_2026-08-25.md` §1.
- **`unique` and `longDescription` are dropped too.** There isn't room at this size; the
  talker leans on the sensory cue line instead of the full copy block. (`shortDescription`
  is also NOT used as-is — see below.)
- **Sensory cue line is new copy, not yet a data field.** The mockup pulls one line per
  cheese straight from the consortium booklet's sight/smell/taste/feel language (e.g. Fresco:
  "soft as sponge cake, sweet like fresh milk"; Vecchio: "sweet like a boiled chestnut, gone
  savory"). Add an optional `recognitionCue` string field to the four Asiago records in
  `src/data/montitrentini/signs.json` so it's editable without a code change, same pattern as
  every other var slot. Suggested cap: ~70 chars (it's one line, not a paragraph) — validate
  against whatever the chosen layout's box actually fits.
- **Trust marks and QR reuse `foot()` as-is**, just re-positioned and re-scaled for the
  smaller canvas — no new logic, `showIf` behavior is unchanged.

**Build order** (mirrors `CHEESE_SIGNS_SPEC.md` §8):

1. Rick picks a layout (G, H, I, or a hybrid) off the comp.
2. Add `recognitionCue` to the 4 Asiago records in `signs.json` (write the actual four lines
   from the booklet — the comp's placeholder text is a starting point, not final copy).
3. Add the `talker` entry to `SIGN_SIZES` and a `talkerTemplate(size)` function in
   `sign-templates.js`, following the existing `shortTemplate`/`longTemplate` pattern —
   register it in `SIGN_TEMPLATES`.
4. No new slot kinds needed — `text`, `image`, `shape`, `qr`, `showIf` all already exist from
   the case-sign work. This is a smaller manifest, not new renderer capability.
5. Same picker/export/validator wiring as case signs (§8 items 3–5 in the spec) — the talker
   is just another size choice, not a separate flow.

---

## Brand logo on the sign family — decided 2026-08-25

Rick asked to include the MT logo. **Decision: use the PNG.** Do not wait for vector.

**There is no vector MT logo.** Verified 2026-08-25 against the repo and the brand kit:

- `identity.logo.primary` → `monti-trentini/library/tswf07fmciwdpp13facm` — **PNG**, Cloudinary,
  titled "MT Official oval logo_trim". This is the asset to bind to.
- Local copy / offline fallback: `brand/monti-logo-transparent.png`, **2363×2363, transparent**.
- `identity.logo.wordmark`, `.favicon`, `.seal` resolve to **nothing** — confirmed empty in the
  Cloudinary account on 2026-08-13 and still empty on 2026-08-25. They render blank by design.
- The only SVGs in the repo are `casa-finco.svg` and `casaridal1925.svg` under
  `monti_asiago_campaign/brand_svgs_raw/` — **heritage marks, NOT the Monti wordmark.** The
  brand-kit `_assetNote` says so explicitly. Do not substitute them.

**Why PNG is fine here:** a 2.5×3.5" talker at 300 DPI is 750 px wide; a logo at 0.8" needs
~240 px. The asset is 2363 px — ~5× over even at 600 DPI. Vector only matters for large-format
or a printer demanding vector for spot colour / die-lines.

**Family-wide, not talker-only:** `src/lib/sign-templates.js` currently has **no logo slot at
all** — grep for "logo" returns nothing, so none of the 10 proofed case signs carry it either.
Add it to the shared grammar (a `kind: "image"` slot resolved through `brandAssetUrl()`), not
bolted onto `talkerTemplate()` alone.

**Placement is still open.** Space is the constraint — the packshot was dropped specifically to
buy room, and a logo spends some of it back. Two candidates:
- **Foot row**, beside the DOP / mountain trust marks. Row already exists with `showIf` logic;
  reads as provenance. Lower risk.
- **Header cap** (layout G), left of the name. More prominent, but crowds the `recognitionCue`
  line that justifies this format existing.

---

## Open items

| # | Item | Owner |
|---|---|---|
| 1 | Pasteurized vs raw milk unknown for every cheese, including all 4 Asiagos. `milk.treatment` prints when filled; still empty. | Stefano |
| 2 | Asiago Vecchio ships at 9 months; the consortium's own literature defines "Vecchio" as over 10 months. Affects the talker the same way it affects the case sign — same `minAge` field. See `docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md`. | Stefano |
| 3 | `recognitionCue` copy in the mockup is placeholder-quality (written by pulling booklet language, not reviewed by Rick or Stefano) — confirm before it ships on a printed talker. Field is **not yet on the 4 Asiago records** in `signs.json` (verified 2026-08-25). | Rick |
| 4 | Layout choice (G / H / I / hybrid) not yet made. **Now settled by building the composer** — all three kept as presets, hybrids are a dropdown. | Rick, via the tool |
| 5 | Logo placement. **Resolved in principle:** a new **Company ID** block groups logo + wordmark + Casari line as one draggable unit — better than foot row or header cap. Exact position via the composer. | Rick, via the tool |
| 7 | **Decision zero for the composer build:** refactor `sign-templates.js` to semantic blocks, or keep a composer-side mapping layer. Recommended: refactor, with a before/after render diff proving pixel parity across the 10 proofed case signs. See composer spec §1. | Rick / Claude Code |
| 6 | Request the real vector logo (`.ai` / `.eps` / `.svg` of the oval) from Monti Trentini **Marketing** per `docs/CLIENT_DATA_ROLES.md`. Slots are already wired: drop it in Cloudinary, re-run `scripts/sync-images.mjs`, resolves with no code change. Not blocking — PNG ships now. | Rick |

---

## Files

```
docs/HANDOFF_2026-08-25_asiago-shelf-talkers.md   this document
design/asiago-shelf-talkers/shelf-talker-composition-studio.html   the three layout comps
docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md             source of the sensory-cue language
docs/CHEESE_SIGNS_SPEC.md                         the case-sign engine this reuses
src/lib/sign-templates.js                         where talkerTemplate() gets added
src/data/montitrentini/signs.json                 where recognitionCue gets added
```
