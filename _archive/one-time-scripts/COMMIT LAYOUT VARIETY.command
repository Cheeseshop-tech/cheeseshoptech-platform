#!/bin/bash
# Double-click to commit + push (self-healing).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0
if [ -f .git/index.lock ]; then
  rm -f .git/index.lock && echo "Removed stale .git/index.lock" || echo "Could not remove lock — run: sudo rm '.git/index.lock'"
fi
echo "Staging changes..."
git add -A
echo "Committing..."
git commit -m "Feature: real layout variety — 6 new templates + guardrailed AI layout-swap

Rick: \"auto compose creates one deck the same every time and polish
only moves framing by a few pixels. I want a real ai design tool...
how do we get there and what will it cost.\" Confirmed the critique
was structurally accurate: directDraft() always picks one fixed
template id per slide type, and mergeDeck() never let a slide's
template id be reassigned — AI Polish never had layout control, only
slot values within fixed geometry.

Rick chose the scoped path over a full generative-layout rebuild: real
design variety comes from hand-designed layout alternates (built once,
using the real brand kit, free) rather than generated live per-deck.
AI Polish stays a selector/arranger between real options, never an
inventor of new ones.

src/lib/slide-templates.js — every template now carries a family.
Added 6 new hand-designed templates using Monti Trentini's real brand
tokens: cover/v2 (Split), cover/v3 (Editorial), product-feature/v2
(Cream Card), product-feature/v3 (Stacked), story/v2 (Mirrored),
story/v3 (Card). Every variant in a family shares v1's exact editable
slot-id vocabulary by design, so a value already resolved for one
variant drops into another with zero data loss. New familyOf()/
templateAlternates() exports.

Slide Studio's existing 'pick a template' grid and 'switch this
slide's template' dropdown needed ZERO code changes — the 6 new
layouts are live and hand-pickable immediately (the hand-pick arm).

netlify/functions/ai-compose.js — the verbal-arrange arm. briefSlide()
exposes each slide's own layoutOptions (its real alternates only).
RETURN_TOOL gained an optional per-slide 'layout' field. mergeDeck()
accepts it ONLY if it's one of that exact slide's own alternates,
re-derived server-side from the ORIGINAL template id — never trusts
the model's echo. A cross-family id, an invented id, or a same-id
'swap' are silently dropped, same guardrail posture as every other
field in this file. New SYSTEM_PROMPT rule 10; response now also
returns appliedLayouts.

Verified with two dry-run suites against the real repo (real
node_modules, Anthropic call mocked), 31/31 checks: template
structural integrity, family/slot-id-vocabulary consistency,
cross-family and invented-id rejection, no-alternates-means-no-swap,
and full regression of the pre-existing text/image/instruction flow
when no layout field is sent. node --check clean on both files."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
