# AI Tool Embed — house-admin design agent (PARKED)

**Status: PARKED** (2026-06-16, Rick's call: "let's hold off for now"). Not built. This file is the
tag-in-the-build so the idea is tracked and ready to resume. Nothing in the codebase calls an AI
API yet. Resume trigger: house-admin self-serve volume justifies the per-use cost + maintenance,
OR Rick decides to set up pay-as-you-go Anthropic API billing.

## What it is
A feature embedded **inside the website** (house-admin side) that uses an AI model to help compose
proposals/decks — so the capability travels with the app to anyone who logs in (this is the
"portability via website" Rick meant), not tied to a Cowork session.

## Functions (scope, narrow-first)
1. **Auto-compose** a proposal/deck from the already-selected inputs (Media Hub tags, story blocks,
   buyer, audience, theme): place the hero, fill image zones, order slides.
2. **Draft / tighten copy** in brand voice (headline, intro, per-slide captions).
3. **Audience/channel variations** from the same inputs (Chef's Table vs. Trade Brief).

NOT in scope: AI **image generation** — Monti has a Media Hub of real Alpine photography that is
worth more than synthetic images. The agent composes from existing assets; it does not invent them.

## Architecture (reuses the pattern already in production)
Same secret-safe server-side shape as the Cloudinary functions (`media-list` / `media-update` /
`media-delete`):

```
browser (Auto-compose button)  →  Netlify function (holds ANTHROPIC_API_KEY)  →  Claude API  →  JSON back to the UI
```

- New file: `netlify/functions/ai-compose.js` — holds the key server-side, takes proposal inputs +
  available tagged assets, returns a structured proposal/deck draft (the existing `emptyProposal`
  shape + chosen image public_ids). Never exposes the key to the browser.
- UI surface: an "Auto-compose" / "AI assist" button on the proposal builder (and later the slide
  composer). It writes into the SAME proposal draft model — so AI output is just a starting draft
  the human edits. Deterministic composer (Slice 2) is the backbone; AI is the optional layer on top.

## Prerequisites (Rick's to-do when resumed)
- **Anthropic API key** — pay-as-you-go, **separate account/billing from the Claude subscription**;
  a card on file. Stored as a Netlify env secret `ANTHROPIC_API_KEY` (never committed).
- **Spend cap** set in the Anthropic console (the real risk is an ungated loop, not per-call cost —
  composing a proposal is cents).
- Optional: a simple per-session/day call limit in the function as a second guardrail.

## Cost reality
Token cost per composition is trivial (cents). The real cost is build + ongoing maintenance of a
live feature. Defer until self-serve volume earns it. For now the design-agent role is covered by
Claude in Cowork (Rick drives it; no infra, no key, no cost).

## Dependencies
- Build **Slice 2 (slide-deck composer)** first — the deterministic tag/template composer. The AI
  embed enhances it; it should not be the only way to compose.
- Related: `BRAND_KIT_AND_PROPOSAL_SPEC.md`, `MEDIA_HUB.md`, `DATA_OWNERSHIP_MAP.md`.
