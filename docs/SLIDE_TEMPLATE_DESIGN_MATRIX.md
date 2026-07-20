# Slide Template Design Matrix — Monti Trentini Content Studio

Reference doc for everything in the Content Studio template gallery (`src/lib/slide-templates.js`):
every template's real ID, its `family` (the grouping that makes real layout variety possible), and
the design rationale tying each one back to Monti Trentini's actual brand kit — not a generic
"looks nice" justification, but specific palette-ratio, type-system, and voice-attribute reasoning.

This is also the doc a human should read before adding a 4th variant to any family, or a new family
entirely — it's the "why" behind each layout, not just the "what."

## 1. Quick-reference matrix

Every ID below is copy-paste exact — this is what's stored on a slide's `t` field and what
`familyOf()`/`templateAlternates()` key off of in `src/lib/slide-templates.js`.

| Family (slide type) | v1 | v2 | v3 |
|---|---|---|---|
| **cover** | `cover/v1` — Cover | `cover/v2` — Cover — Split | `cover/v3` — Cover — Editorial |
| **product-feature** | `product-feature/v1` — Product Feature | `product-feature/v2` — Product Feature — Cream Card | `product-feature/v3` — Product Feature — Stacked |
| **story** | `story/v1` — Story | `story/v2` — Story — Mirrored | `story/v3` — Story — Card |
| **statement** | `statement/v1` — Statement | *(no alternate yet)* | |
| **three-up** | `three-up/v1` — Three-up (pillars) | *(no alternate yet)* | |
| **big-stat** | `big-stat/v1` — Big stat | *(no alternate yet)* | |
| **quote** | `quote/v1` — Quote | *(no alternate yet)* | |
| **product-range** | `product-range/v1` — Product range | *(no alternate yet)* | |
| **closing** | `closing/v1` — Closing / CTA | *(no alternate yet)* | |
| **image** | `image/v1` — Image (full-bleed) | *(no alternate yet)* | |

16 templates total, 10 families, 3 families with real chosen-among alternates (built 2026-07-19),
7 families still single-version — honest gap, not hidden. Growing any of those seven follows the
exact same pattern as the three below.

## 2. Brand kit snapshot (what every design decision below is measured against)

Pulled straight from `src/data/montitrentini/brand-kit.json` — not paraphrased, the actual values.

**Palette** (`src/lib/brand-tokens.js` token → hex → intended use ratio across a piece):

| Token | Name | Hex | Role | Target ratio |
|---|---|---|---|---|
| `$primary` | Forest Green | `#064E22` | Headline / logo background — the anchor dark | 25% |
| `$accent` | Italia Green | `#009640` | Italian-flag heritage accent | 8% |
| `$sage` | Pasture Sage | `#70C883` | Mid-tone accent, hover/callouts | — |
| `$mint` | Alpine Mint | `#C8E2C5` | Soft backgrounds, decorative shapes | 5% |
| `$cream` | Heritage Cream | `#FFFBDC` | **Primary page background** | **50%** |
| `$paper` | Casa Paper | `#FAF9F5` | Secondary canvas, cards | — |
| `$charcoal` | Stone Charcoal | `#716A6A` | Secondary text/captions | — |
| `$ink` | Mountain Ink | `#141413` | Body copy, fine detail | 10% |
| *(not a token — logo only)* | Italia Red | `#CE2B37` | Flag ribbon on the logo, **sparingly** | 2% |

The load-bearing rule for every template below: **Heritage Cream carries the piece (50%)**; Forest
Green is the dark anchor (25%), not the dominant field; red never appears outside the logo asset
itself.

**Type:** `$display` = Cora/Fraunces (serif, *italic-only*, editorial) — titles, quotes, story copy,
big CTA labels. `$ui` = Futura PT (sans, uppercase/letter-spaced) — buttons and nav *only*. The kit
is explicit that these never swap roles (display font never on a button; UI font never in body
copy) — every template in the gallery, old and new, respects this split.

**Voice:** positioning hook is *"Product of the Mountains... the mountain origin IS the story."*
Core values: **Family, Respect of territory, Quality.** Attributes to hit: **Authentic, Warm,
Rooted, Proud, Heartfelt.** Explicitly avoid: corporate jargon, cold/impersonal language, overhyped
claims, generic "Made in Italy" without mountain specificity, spec-stacking headlines.

## 3. Per-family design rationale

### Cover — `family: "cover"`

**`cover/v1` — Cover.** Full-bleed hero photo, bottom scrim fading up into the photo, centered logo,
left-aligned title low on the frame. The scrim uses the same dark green family as `$primary`
(`rgba(6,78,34,…)`), so even the "loud" full-photo cover still resolves to the brand's anchor color
at the point of contact with the type — never a generic black gradient. **Reads as:** confident,
photo-forward, the default "let the mountain speak" opener. Ties to **Rooted** — the photograph
does the work, not decoration.

**`cover/v2` — Cover — Split.** Left panel solid `$primary` (Forest Green) carrying logo + title +
subtitle in `$cream`/`$mint`, right panel full-bleed photo, zero scrim needed. Deliberately trades
some of the cream-dominant rule for a bolder, more editorial moment — the same trade-off the
original `statement/v1` and `closing/v1` templates already make (dark-green-dominant is an
established, brand-sanctioned mode for a *moment* slide, not the default). **Use when:** the photo
alone won't carry legible text (busy composition, high-contrast subject) — the split guarantees
readability instead of fighting a scrim. Ties to **Proud** — a deliberate, structured presentation
rather than a rescue-scrim.

**`cover/v3` — Cover — Editorial.** Full-bleed photo, scrim from the *top* instead of the bottom,
centered upper-third title, small cert-emblem badge bottom-right (the AICC seal asset, `$seal`).
Built for photos where the interesting part of the frame is the *bottom* (a table spread, a
landscape shot low in the frame) that `v1`'s bottom scrim would cover. The badge is a direct,
literal nod to **Authentic** and **Proud** — certification made visible, not just claimed in copy.

### Product Feature — `family: "product-feature"`

**`product-feature/v1` — Product Feature.** Product photo right (60% width), title/topic/story left,
AICC seal emblem overlaid on the photo, a brand "sprig" accent bottom-left. The default flagship
layout — direct, retail-catalog confident.

**`product-feature/v2` — Product Feature — Cream Card.** Product photo in a rounded `$paper` card
on a `$cream` field (left), copy right. This is the single most literal palette match in the whole
library — background + card together are almost entirely Heritage Cream / Casa Paper, which is
*exactly* the kit's 50% cream-dominance rule applied to a product shot instead of a full-bleed
photo. **Ties to Warm / Rooted** — a card treatment reads handmade and considered, the opposite of
a cold e-commerce grid tile, which is precisely what "avoid: cold/impersonal language" asks for
visually, not just in copy.

**`product-feature/v3` — Product Feature — Stacked.** Full-width photo band on top, `$cream` copy
band below, seamed with a soft cream-fade scrim so the transition never reads as a hard cut. Built
for a product shot that reads better as a wide banner than a portrait crop (a table setting, a
wheel being sliced) — variety in aspect ratio, not just position. Ties to **Family** — a
"everything at home" band composition suits a process/behind-the-craft photo naturally.

### Story — `family: "story"`

**`story/v1` — Story.** Cream text panel left (`$cream` field), lifestyle photo right. Pairs
naturally with the kit's long-form story blocks (`storyBlocks` in the brand kit — "A hundred-year
story," "Everything at home," etc.) — this is the template Stage 0 already reaches for by default
for exactly that reason.

**`story/v2` — Story — Mirrored.** The literal flip of `v1` — photo left, cream copy right. Same
tokens, same rules, only the geometry differs. **Why it earns a place in the library at all:** two
story beats back-to-back in a real deck (e.g. "A hundred-year story" then "Everything at home")
previously read as the *same slide twice* with different words — visually monotonous regardless of
how good the copy was. This is the direct fix for that, and the clearest example of "curated
variety" actually solving a real problem rather than variety for its own sake.

**`story/v3` — Story — Card.** Full-bleed photo, a floating rounded `$cream` card holding the copy,
positioned right-of-center rather than a hard 50/50 split. The most editorial/premium of the three —
appropriate for a hero-quality lifestyle photo (Dolomites pasture, family shots) that deserves the
whole frame rather than being cropped into a fixed half. Ties to **Proud** — this is the "we have a
photo worth showing full-bleed" layout, used deliberately, not by default.

### Single-version families (no alternates yet — honest gap)

`statement/v1` (full `$primary` field, centered short-line statement — the kit's "punchiest short
line" rule already lives here per Stage 1), `three-up/v1` (three lifestyle/product columns on
`$cream`), `big-stat/v1` (one big number on `$primary`), `quote/v1` (testimonial with an optional
photo scrim), `product-range/v1` (three catalog cards on `$cream`, direct SKU-linked photography),
`closing/v1` (CTA on `$primary`, the one template with an actual button — correctly the only place
`$ui` styling appears on a pill), `image/v1` (full-bleed photo + bottom caption, the simplest
template in the library). All seven are strong, brand-compliant defaults already — they just don't
have a second designed option yet. Same build pattern as cover/product-feature/story; say which one
you want variety in next and it gets built the same way.

## 4. How AI Polish actually identifies these (the technical half)

This matrix is for humans. The *mechanism* that lets AI Polish tell these apart safely already
lives in code, not in this document — worth being explicit about the difference:

- Every template object in `SLIDE_TEMPLATES` carries a `family` string (`cover`, `product-feature`,
  `story`, etc. — exactly the groupings in §1 above).
- `templateAlternates(id)` (in `slide-templates.js`) looks up a template's `family` and returns
  every *other* template in that same family — never a cross-family id, never an invented one.
- `ai-compose.js`'s `briefSlide()` calls this for every slide and hands Claude a `layoutOptions`
  list scoped to exactly that slide's own real alternates. `mergeDeck()` re-validates server-side
  against the *original* template id before accepting any `layout` field back — the model's own
  claim is never trusted.

So "AI can identify" these already, by construction, at request time — this doc doesn't need to be
fed to the model for that to work. What this doc *is* useful for: giving you (and me, in a future
session) a shared, precise vocabulary for asking for a specific one by name.

**Instruction-box cheat sheet** — phrases that map cleanly to a specific id, for the AI Polish
instruction box:

| Say this | Targets |
|---|---|
| "make the cover a split layout" / "put the photo on one side" | `cover/v2` |
| "make the cover more editorial" / "scrim from the top" | `cover/v3` |
| "put the product in a card" / "cream card treatment" | `product-feature/v2` |
| "stack the product photo on top" / "wide banner product shot" | `product-feature/v3` |
| "flip the story photo to the other side" / "mirror the story slide" | `story/v2` |
| "make the story slide feel premium" / "floating card over the photo" | `story/v3` |

## 5. Brand-compliance self-check (2026-07-19, the 6 new templates)

Checked each of the six additions against §2's rules before shipping:

- **Palette:** every fill/gradient/text-color uses an existing token (`$primary`, `$accent`,
  `$cream`, `$paper`, `$mint`, `$ink`, `$charcoal`, `$seal`, `$sprig`, `$logo`) — no new hex values
  introduced anywhere. Italia Red never appears outside the logo asset itself, in any of the six.
- **Type roles:** every title/story/topic field uses `$display`; none of the six add a button or
  nav element, so `$ui` correctly never appears in any of them.
- **Cream dominance:** `product-feature/v2`, `product-feature/v3`, and `story/v3` are majority-cream
  by design (the rule's clearest expression); `cover/v2` and `cover/v3` deliberately trade some of
  that ratio for a bolder single moment, on the same precedent as the *existing* `statement/v1` and
  `closing/v1` templates — not a new pattern, an existing one applied to two more slide types.

Detail: `docs/BUILD_LOG.md` (2026-07-19 — "Feature: real layout variety"), `src/lib/slide-templates.js`.
