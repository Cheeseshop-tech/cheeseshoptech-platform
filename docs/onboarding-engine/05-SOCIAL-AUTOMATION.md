# Future: automated social media management

**Status: confirmed NOT STARTED. Already tracked as roadmap item 7 — this doc doesn't add new
scope, it just gives it a real home alongside the rest of the platform vision.**

## What it is

Automated social media posting/management, connecting brand voice + design system + content
library output into a scheduled or triggered publishing pipeline, plus (per the 2026-09 priority
roadmap) market watch — monitoring competitors/market activity as an input to campaign strategy.

## What exists today that this would build on

- Content Library already has a Social content-type tag — a filing category, not a publishing
  pipeline.
- The design/template infrastructure this would need (brand-derived templates sized for social
  formats) doesn't exist yet — see `01-CORE-BUILD.md`, "template generation for output channels."
  Social templates are one of the three channels (with email and blog) that have zero
  infrastructure today.
- No social platform API integrations exist anywhere in the codebase.

## Sequencing

Per `../cst-priority-roadmap-2026-09.md`, this is item 7 — explicitly the last item on the
current 7-item hardening list, and per `../CST_UNIFIED_DIRECTION_2026-09-07.md` it sits after the
ACE Fall Show and the landing-page/email/social launch that follows it. Don't pull this forward
without Rick raising it — it's correctly sequenced where it is.

## What would need to happen before this is buildable

1. A social template family, built the same way `slide-templates.js`'s `image/v2` and the ported
   Asiago moods were — reference a structural design pattern, paint through Brand Kit tokens.
2. A decision on which platform(s) to publish to first (Instagram/Facebook Graph API is the
   obvious starting point for a specialty-food brand's audience).
3. Market watch is a separate research/monitoring capability, not a publishing one — likely worth
   splitting into its own scoped thread once this gets picked up, rather than treating "social
   automation + market watch" as one deliverable.
