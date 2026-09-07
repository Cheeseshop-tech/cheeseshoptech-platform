# Design References — awesome-design-md

**Status:** Installed 2026-09-06 · **Owner:** Rick Posada · Part of the design-flip toolset (see PROJECT_ROADMAP / CST priority roadmap — this is prep for the "dynamic design" pass across all CST apps, not itself a build).

## What this is

`docs/design-references/awesome-design-md/` is a vendored copy of
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — 74 `DESIGN.md`
files, each a plain-text analysis of a real product's design system (typography, spacing,
components, tone): Stripe, Linear, Notion, Apple, Airbnb, Figma, Shopify, Spotify, and more, under
`design-md/<product>/`.

A `DESIGN.md` is a format an AI coding agent reads directly — point Claude at one and say "use
this as a structural reference" and it generates UI consistent with that system's patterns.

## How to use it

Reference a specific one by path in a prompt, e.g.:

> "Look at `docs/design-references/awesome-design-md/design-md/stripe/DESIGN.md` and use its
> spacing/typography discipline as a structural reference for the new proposal template — don't
> copy Stripe's colors or logo, just the structural rigor."

**Licensing boundary (the repo says this about itself, worth repeating):** the MIT license covers
the repo's own analysis/writing, not the brands' actual visual identity — a color palette, a
logotype, a mascot. Use these as structural references (how spacing/hierarchy/type scales are
reasoned about), never as a costume to copy a real brand's look for a CheeseShop TECH or client
surface.

## Relationship to CST's own design system

CST already has a locked house design system (`docs/DESIGN_SYSTEM.md` — Terracotta/Cellar Olive,
Fraunces + Inter) and per-tenant token overrides (Monti = Forest Green). These references don't
replace that — they're inspiration for HOW a system is reasoned about (structural rigor, spacing
logic, component discipline) when the design-flip pass reworks CST's own apps toward something
more dynamic, not a replacement palette or typeface.

## Updating

This is a vendored snapshot (the upstream repo's own `.git` history was stripped so these 74
files are tracked as normal CST content, not an embedded/nested git repo). It won't auto-update.
To pull in upstream changes later, re-clone into a scratch folder and diff/copy over what's
useful:

```
git clone --depth 1 https://github.com/VoltAgent/awesome-design-md.git /tmp/awesome-design-md-refresh
rsync -a --delete /tmp/awesome-design-md-refresh/design-md/ docs/design-references/awesome-design-md/design-md/
rm -rf /tmp/awesome-design-md-refresh
```
