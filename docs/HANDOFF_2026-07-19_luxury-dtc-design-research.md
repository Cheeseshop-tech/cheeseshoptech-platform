# Handoff — Luxury DTC Design Research ("Super Site" / Posada & Co.) (2026-07-19)

For: the design agent, next session in this repo · Owner: Rick Posada
Read first: `docs/DESIGN_SYSTEM.md` (house brand + white-label token system — LOCKED). This
handoff does **not** change that doc. It's a separate research track, ported in from a parallel
Claude Project, and it has not yet been mapped onto the CST token system or a tenant config.
State: **Research + one confirmed decision. Nothing here is wired to code, tokens, or a tenant.**

---

## Where this came from

A parallel Claude Project ("Cheese e-commerce website") has been doing competitive design
research for a separate, luxury direct-to-consumer cheese brand concept — working name
**Posada & Co. / "the Super Site."** Brand direction per that project's own brief: *"high-end
luxury experience... incorporate a blog feel with product news and storytelling along with a
social beauty shot influencer feel... a test kitchen page and a classroom for product
education... tie this in with a podcast and social media feel."*

This is **not** the CST house brand (Terracotta/Cellar Olive) and **not** Monti Trentini's tenant
brand (Forest Green). It's a third, distinct editorial-luxury voice. See **Open questions**
below for how it might connect to this platform.

Research method: a custom research tool logged pros/cons/verdicts across 9 site categories for
five competitor sites, then a gap analysis distilled what each category winner does well and
what none of them do that the Super Site's brand vision requires. Two more references got
added afterward via live browsing.

---

## The five sites studied

| Rank | Site | URL | Category wins |
|---|---|---|---|
| 01 | Murray's Cheese | murrayscheese.com | Test Kitchen/Recipes, Classroom/Education, Subscription/Club |
| 02 | Fortnum & Mason | fortnumandmason.com | Blog/Editorial, Best Overall Design — **and see confirmed PDP decision below** |
| 03 | iGourmet | igourmet.com | Landing/Hero |
| 04 | Goldbelly | goldbelly.com | Cart/Checkout, Podcast/Social (by default — see note) |
| 05 | La Fromagerie | lafromagerie.co.uk | No category win, but the reference for the "affineur's note" — a first-person expert tasting note voice |

Two more references, added after the gap analysis, not yet scored against the same 9 categories:

- **Jasper Hill Farm** (jasperhillfarm.com/shop) — Richard flagged the "Explore Volume Gifts"
  split card (copy + CTA block on one side, full-bleed styled cheese photography on the other)
  as a layout he likes. Not a ranked competitor — a real cheesemaker/producer site, not a luxury
  DTC retailer — treat as a **layout pattern reference**, not a scored category winner.
- **Fortnum & Mason — Cave Aged Cheddar Wedge PDP** (see below) — **confirmed as the literal goal
  reference for Product Detail Page design.**

---

## Confirmed decision — PDP layout goal

Richard called this out explicitly and unambiguously (2026-07-19): the Fortnum & Mason
**Cave Aged Cheddar Wedge** product page is *"top, this is the goal"* for PDP design.

URL: `https://www.fortnumandmason.com/cave-aged-cheddar-cheese-wedge-400g`

What it does, confirmed by live browsing:
- Large **sticky hero product photo** (left) with a vertical thumbnail rail
- **Breathable info panel** (right): product name, price, 2-line description with "Read More,"
  quantity stepper, one primary CTA ("Add to Bag")
- Collapsed **accordion sections** below the fold: Product Description / Nutrition and
  Ingredients / Delivery & Returns
- Sage-green accent, serif wordmark, heraldic crest, breadcrumb nav
- **No parallax or scroll-jacked animation** — matches Richard's standing dislike of "wiggling"
  motion captured in the original research notes

**Flag for whoever picks this up next:** the gap analysis (v1) marks **Goldbelly** as the PDP
category winner, but the quoted reasoning under that section — *"sticky image, scrolling info,
open breathable field of view, restrained text size, no wiggling/parallax"* — actually describes
this Fortnum page far more than it describes Goldbelly's PDP. That looks like a mislabel in v1.
Not yet corrected in the source project. Treat the Fortnum PDP pattern above as authoritative
over the v1 "Goldbelly wins PDP" line.

---

## Category-by-category gaps (condensed from gap-analysis-v1.md)

Full detail lives in the source project only (`gap-analysis-v1.md`, not in this repo). This is
the condensed version — winner, and what the studied sites are missing that the Super Site's
brand vision (blog + test kitchen + classroom + podcast + influencer feel) requires:

| Category | Winner | Biggest gap vs. Super Site vision |
|---|---|---|
| Landing/Hero | iGourmet | No studied site signals "brand you follow," not just "store you visit" — hero needs podcast/social presence, latest-story tease, influencer photo rotation |
| Product Detail Page | Fortnum & Mason (see confirmed decision above, supersedes v1's Goldbelly label) | Affineur's note, tasting flavor wheel, aging timeline, "save to flight" (build a board across PDPs), 60-sec audio clip from producer |
| Cart & Checkout | Goldbelly | Cheese board builder mode, club upsell at cart, host add-ons, recipient gift preview |
| Blog/Editorial | Fortnum & Mason | Issue-based publishing (Volume 01/02/03), audio version of articles, newsletter as a published artifact |
| Test Kitchen/Recipes | Murray's Cheese | Video for every recipe, live cook-along events, recipes co-developed with cheesemakers, recipe→cart bundle |
| Classroom/Education | Murray's Cheese | Certification path (gamified levels), cheese-flight + class bundle, classroom content feeding the podcast |
| Podcast/Social | Goldbelly (weak default — see below) | **Biggest gap across the whole set.** No studied site has a real podcast hub. Need: browsable/transcript-searchable episodes, podcast→product linking, influencer beauty-shot gallery, on-site social feed, "follow" capability for producers/affineurs/podcast |
| Subscription/Club | Murray's Cheese | Class included at premium tier, behind-the-scenes member content, concierge cheesemonger chat access |
| Best Overall Design | Fortnum & Mason | Signature photography commission, custom illustration system, written brand-voice doc, restrained motion as a design *rule* (not a preference), ambient sound as an underused luxury signal |

**Cross-cutting themes** (from the gap analysis's closing synthesis — these are the three biggest
structural calls, not yet locked):

1. **The Super Site is more content than commerce.** 5 of 9 categories are content-driven (blog,
   kitchen, classroom, podcast, design), 3 are commerce, 1 is community. Architecture should read
   as a magazine/broadcast network that also sells cheese — not a store with a blog bolted on.
2. **"Follow" is the most original insight in Richard's own notes** (from studying Goldbelly).
   None of the five competitors think of themselves as something you socially subscribe to. If
   the Super Site lets visitors follow producers, affineurs, and the podcast — not just the
   brand — it's a differentiator none of the studied sites own.
3. **Three concepts repeat across categories and should be system-level decisions, not
   per-page features:** audio everywhere (PDP clips, article narration, ambient sound, classroom
   audio) · "magazine as artifact" (every touchpoint — newsletter, box insert, article — framed
   as an issue, not marketing collateral) · cheese flight as the primary product type (a curated
   set, not a single SKU, as the headline shopping unit).

---

## Strategic connection to CST (clarified by Rick, 2026-07-19)

Rick's own framing, verbatim: *"it boils down to the rotating brand ecom site working as a sales
campaign engine for cheese brands. Still an option we'll keep in play as we build. This is where
the template architecture came from."*

Read plainly: the Super Site research isn't a one-off tenant candidate — it's the **origin
concept behind CST's Content Studio template architecture** (`TEMPLATE_ENGINE_SPEC.md`'s
slot + brand-kit paint + binding model). The idea is one reskinnable storefront template that
rotates per cheese brand and functions as a sales campaign engine — which also lines up with
CST's own positioning (`POSITIONING.md`: sales-led growth via coordinated campaigns, the
storefront is the deliverable, not the business). A pointer to this has been added to
`POSITIONING.md` and `CLAUDE.md`.

**This is still an open architectural direction, not a locked feature or a committed tenant.**
Rick is keeping it in play as CST builds — don't treat it as scoped work, and don't build a
`config/clients/<id>.json` entry for it without being asked.

## Open questions — do not assume answers to these

1. **Timing and trigger for building the "rotating brand" engine are still open.** Not scoped,
   not scheduled. If/when this becomes real work, it'll need its own primary/accent hex,
   heading/body fonts, and radius per rotating brand — none of which have been chosen yet — and
   a decision on whether "rotating" means multiple simultaneous tenant configs, or a single
   template that swaps brand skins per campaign. Ask Rick before building anything
   client-config-shaped from this.
2. **The v1 gap analysis was never scored by Richard.** Every category in the source doc ends
   with "mark Adopt / Skip / Discuss" and that pass has not happened. Nothing in the table above
   should be treated as locked scope — it's raw research, not a spec.
3. **No color, type, or token values have been chosen for this brand.** Don't infer a palette
   from screenshots (e.g. Fortnum's sage green) and don't reuse CST house or Monti tokens for it.

---

## Watch-outs

- **Don't blend this into `DESIGN_SYSTEM.md`'s Part A (house brand) or Monti's tenant colors.**
  This is a third, distinct voice (luxury editorial) until Richard explicitly says it's a tenant
  or says to fold specific patterns into the house system.
- **The PDP layout decision (Fortnum & Mason) is the one thing in this doc that's actually
  locked.** Everything else is open research awaiting an Adopt/Skip/Discuss pass.
- Source project lives outside this repo (a separate Claude Project / local folder at
  `Cheese e-commerce website`) — if you need the full, unabridged gap analysis or the raw
  research-tool notes per site, they are not here; ask Richard to pull them across again.
