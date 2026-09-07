# Future: campaign switching → self-redesigning storefront

**Status: campaign switching is real and shipped, not "not yet accuracy-tested" per se — it just
hasn't been stress-tested at scale yet. The self-redesigning storefront is the single biggest gap
in the whole platform vision — nothing dynamic exists today.**

## Campaign switching (real, shipped, awaiting its real test)

Campaign Management can already define and switch between campaigns connecting distributors to
target prospects. It's flagged in the 2026-09 priority roadmap as "not yet accuracy-tested" —
Rick's 2026-09-07 answer names the real test: small-scale runs now, then the **ACE Endico Fall
Show (2026-09-15)** live in the field. See `07-SALES-OUTREACH-ENRICHMENT-STATUS.md`.

## Self-redesigning storefront (idea, barely scoped)

Rick's ask: an e-commerce site that redesigns itself based on active promotions, the same way
Campaign Manager switches between campaigns. **This does not exist in any form today.**

- `mt-e-comm.netlify.app` is static and manually maintained.
- UDCS (the Door/Room content-delivery model, see `../udcs.md` in project memory) is the right
  conceptual home for this — a "door" that changes its own presentation based on what's active —
  but UDCS itself is 3 scope docs and one landing-page priority, not a built capability.
- No dynamic re-theming mechanism exists anywhere in the stack. The Theme Engine
  (`src/lib/themes.js`) picks between 5 fixed named registers manually; nothing switches a live
  storefront's theme in response to a promotion automatically.

## What would actually need to get built

1. A defined trigger: what marks a promotion as "active" and which storefront surface it should
   change (hero banner? full theme? product ordering?).
2. A re-theming mechanism reusing the Brand Kit token system already proven in Content Studio —
   this is the same kind of token-resolution problem `slide-renderer.jsx` already solves for
   decks, just applied to a live storefront instead of a static render.
3. A decision on the underlying commerce platform first — see `06-ECOMMERCE-EXPANSION.md`; this
   can't be meaningfully scoped in isolation from the fulfillment/payment/compliance stack.

## Sequencing

This is explicitly gated behind the e-commerce platform decision (`06-ECOMMERCE-EXPANSION.md`)
and the B2B/B2C branch-and-switch architecture question — see
`../cst-business-model-crossroads.md` in project memory. Don't start building dynamic re-theming
before that architecture call is made; it would need to be re-done if the answer changes the
storefront's basic shape.
