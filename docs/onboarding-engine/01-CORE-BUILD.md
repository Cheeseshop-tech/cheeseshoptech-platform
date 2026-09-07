# Onboarding Engine — core build (Phase 0, active)

**This is the actual thing being built right now.** Everything else in this folder is a future
app function that got bundled into the same conversation but is NOT part of this build.

## What it is

The repeatable process that gets a brand's data and systems into the 7-core-apps nucleus so the
rest of CST can operate on it: ingest content → derive brand voice + design system → generate a
design algorithm → generate output templates from that algorithm. Today this only really exists
for Monti Trentini, and only partly as a repeatable SOP — most of it still runs as a Cowork
session, not a defined procedure a new hire (or a future automated agent) could follow.

## The four real sub-pieces

### 1. Brand ingestion (Media Hub intake)
**Status: real, live, shipped — for manual/session-driven ingestion. No repeatable intake FLOW.**
Media Hub and Brand Kit both work today — Cloudinary-backed asset library, `brand-kit.json`
schema (colors, fonts, voice, story blocks, motto/mantra/ready-phrases). `_brand-kit-template.json`
+ `onboarding-kit/00–06` + agents A1–A5 exist as scaffolding for a guided intake (see
`ONBOARDING_AND_AGENTS_SDD.md`) — **status of that scaffold not re-verified as of 2026-09-07,
flagged as a needed check before claiming it's ready for a second brand.**

### 2. Brand voice + design system extraction
**Status: proven manually (Monti), no repeatable procedure.** For Monti, this has effectively
already happened — `brand-kit.json` carries full voice/story/design tokens. What doesn't exist is
a defined two-step (or more) procedure for doing this FOR A NEW BRAND without a Cowork session
improvising it each time. Rick named this explicitly: "needs intelligent guidance."

### 3. Design algorithm
**Status: two real precedents, neither is "a program" yet.**
- The Theme Engine (`src/lib/themes.js`) — 5 fixed named "registers," not brand-derived.
- The Asiago 3-composition grammar (Alta Quota / Casa Finco / Vetta) — built by hand for one
  brand's assortment decks, now ported into `src/lib/slide-templates.js` as 15 reusable template
  variants across 5 families (`cover`, `story`, `product-feature`, `big-stat`, `closing`) — see
  `../content-studio-design-skills.md` in project memory for the full port history. This is the
  first real evidence that a "mood grammar" can generalize into brand-agnostic template
  infrastructure rather than staying a one-off deck format. It is still hand-authored, not
  algorithmically derived from a brand's actual visual material — the "real program" Rick asked
  for doesn't exist yet.

### 4. Template generation for output channels
**Status: real for slide decks only. Zero infrastructure for social/blog/email.**
`slide-templates.js`'s `family` pattern (shared slot-id vocabulary across hand-designed layout
alternates) is the right precedent, and it works — Stage 0/1 (`studio-director.js`) and Stage 2
(`ai-compose.js`) already fill any template variant with zero code changes. But this pattern only
exists for decks. Content Library has content-type tags for Social/Email/Blog, but that's a
filing category, not a template system — there is no slot/family structure for those channels at
all today.

## What "done" looks like for this phase

A new brand's content goes in, and — with a defined amount of human-in-the-loop guidance, not
zero — a working brand-kit, a generated (not hand-authored) set of composition moods, and a first
batch of on-brand templates come out, without a from-scratch Cowork session each time. Not
required yet: doing this for a brand that isn't Monti. Required: proving the mechanism holds up
against Monti's real content before generalizing.

## Explicitly NOT part of this build

Social media automation, the self-redesigning storefront, operations/inventory/logistics,
distributor partner portals, and e-commerce completion are downstream consumers of what this
engine produces, or entirely separate systems — see the other docs in this folder. Bundling them
into "the Onboarding Engine" was the confusion this doc set exists to fix.

## Open questions before this can be called "done" even for Monti

- Human-in-the-loop or fully automatic design algorithm generation — not yet decided.
- Whether the `onboarding-kit/00–06` + agents A1–A5 scaffolding is still accurate, given how much
  has shipped around it since — not yet re-verified.
- Whether a non-deck channel (email is the leading candidate — Resend + UDCS already treat it as
  a "door") gets built end-to-end as the next proof point, before speccing all three channels.
