# Brand Kit, Brand Management & Proposal Builder v2 — Spec

**Written:** 2026-06-13 · From the MT ProposalBuilder Scope v2 + Rick's architecture direction.
**Status:** Brand Kit foundation in active build; Theme Engine + Proposal v2 = later phases.

## The business model this encodes (Rick, 2026-06-13)

**CheeseShop TECH owns brand orchestration — that is the core value of the monthly fee.** CST edits
and maintains each client's brand kit so the client (Monti) focuses on *manufacturing* and their
sales team focuses on *sales conversations* — not on managing logos, voice, content, or design. The
Brand Kit isn't a feature; it's the heart of the agency offering.

## Decisions (locked)

- **One Brand Kit per tenant, single source of truth** ("one mind, one body" — same philosophy as the
  image manifest). It includes **identity + brand imagery + voice + story blocks** — the full brand truth.
- **CheeseShop TECH (house admin) edits it.** Client users don't; this is the orchestration CST is paid for.
- The kit is the **single source** that also themes the live portal (replaces today's four loose tokens
  in client config) AND feeds the Theme Engine AND the Proposal Builder. Nothing duplicates brand data.
- **Monti's kit is parsed from existing material** — `Brand_Guide_2026-05-24` (colors/fonts JSON,
  Voice_and_Messaging.md) + `Monti_Trentini_Brand_Voice.docx`. The "UI version of brand voice."
- **A reusable `_template` kit** ships for onboarding future clients — a worksheet: text fields,
  dropdowns, and drag-and-drop upload for logos / brand-defining images.

## Brand Kit schema (single source)

`src/data/<tenant>/brand-kit.json`:
- **identity** — logo set (primary/wordmark/mark/favicon/seal), color system (primary, accent,
  secondary[], neutrals[], sparing-accent, use-ratios), type system (display + UI families with role,
  CSS stack, usage + do-not-use), radius.
- **imagery** — brand-defining images (hero, lifestyle[], patterns, seal) by Cloudinary id.
- **voice** — positioning hook, motto, mantra, heritage line, mission, core values[], voice
  attributes[], avoid[], ready-to-use phrasing[].
- **storyBlocks** — modular narratives (key, title, audience tags [retail/foodservice/distributor],
  ~100–150-word body), the library the Proposal Builder selects from (Scope §3.2 / §6).

## Architecture — the dependency stack

```
Brand Kit (data, single source)
   └─ Brand Management page (house-admin worksheet: view/edit/upload)
        └─ portal theming reads identity from the kit (replaces loose tokens)
        └─ Theme Engine — 5 design treatments consume the kit as tokens (Scope §7)
             └─ Proposal Builder v2 — story-block + theme selection, audience targeting,
                Puppeteer PDF export (extends the shipped v1: product + live pricing + deck)
```

Build order (Rick-confirmed first step = Brand Management): **Brand Kit data → Management page →
theming refactor → Theme Engine (one theme end-to-end) → Proposal v2.**

## Already shipped (don't re-plan)
Proposal Builder **v1** (F4): product selection from live catalog, live class-of-trade pricing,
Trade Portal deck embed, shareable gated link, print/PDF. Scope §3.1 + pricing plumbing = done.

## Open questions still to resolve (downstream of the kit)
- Theme Engine Q1 (capabilities demo vs live selector — Rick leans "both: live per-tenant capability")
  & Q2 (define a "product placement zone").
- Proposal v2: replace v1's deck+list with themed multi-page, or coexist? · Puppeteer PDF (heavier
  infra) vs browser-print? · white-label vs CST footer? · log pitched products → needs Salesforce.
- Story blocks: Rick/Stefano approval; Claude can draft 4–6 from the voice + Phase2 content.
- Product-data completeness intersects the image gap (44 SKUs on packshot fallback) + availability sheet.
