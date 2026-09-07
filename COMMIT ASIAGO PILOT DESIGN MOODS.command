#!/bin/bash
# Double-click to commit + push: port the 3 composition moods from the Asiago hand-authored HTML
# pilot deck (Alta Quota / Casa Finco Table / Vetta) into the real Content Engine template system,
# so they can be selected and tweaked from Slide Studio instead of staying a one-off standalone
# deck artifact.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/slide-templates.js" \
  "src/components/presentations/slide-renderer.jsx" \
  "COMMIT ASIAGO PILOT DESIGN MOODS.command"

git commit -m "feat(content-studio): add Alta Quota / Casa Finco / Vetta template moods

Rick, 2026-09-07: after reviewing the Asiago pilot deck (hand-authored HTML,
built outside the app per his own \"lets use HTML instead of chrome limits on
design styles\" request), he asked to \"keep all 3 design methods and import
them into content engine into the appropriate tabs so it can be tweekd.\"

Ports the 3 compositions from that deck into SLIDE_TEMPLATES as 15 new
variants (v4/v5/v6, or v2/v3/v4 where a family only had one prior entry)
across 5 existing families: cover, story, product-feature, big-stat, closing.
Same slot-id vocabulary as every existing variant in each family (hero_image,
slide_title, topic_label, story_block, stat_value, cta, etc.) -- Stage 0/1
(studio-director.js) and Stage 2 (ai-compose.js, AI Polish) need zero code
changes to fill any of them, and Slide Studio's \"change layout\" picker groups
them with their family automatically via the existing `family` field, exactly
like the product-feature v1/v2/v3 and cover v1/v2/v3 precedent.

- Alta Quota (v4 in each family): restrained editorial -- full-bleed photo,
  opaque $ink caption plate instead of a gradient scrim, thin rule accents,
  quiet italic type.
- Casa Finco (v5, or v3 for big-stat/closing): warm card-driven -- rounded
  photo/text cards on $paper/$cream, pill-shaped kicker badges, $primary as a
  card fill rather than a background wash.
- Vetta (v6, or v4 for big-stat/closing): bold graphic -- full $ink
  background, solid $accent \"ribbon\" blocks, oversized bold italic display
  type, the biggest stat/title scale in the library.

One small, additive renderer change was needed and is included: image slots
in slide-renderer.jsx now honor an optional `radius` field the same way shape
slots already do (previously only shapes could have rounded corners) -- this
is what makes Casa Finco's rounded photo cards possible. Backward compatible:
existing slides never set `radius` on an image slot, so nothing already live
changes appearance.

No color or font is hardcoded to Monti specifically beyond the file's existing
convention (see cover/v1's rgba() scrim) of literal black/white-alpha overlays
in a couple of shadow/scrim shapes -- every $token still resolves through
brand-tokens.js per tenant, same as every other template.

Build-verified (2057 modules, vite build clean). Not yet live-clicked through
Slide Studio -- check the new variants render correctly in each family's
\"change layout\" picker after deploy, same verification step as image/v2." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq"

echo
echo "Pushing..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. Open Content Studio > Slide Studio, pick a cover/story/product/big-stat/closing"
  echo "slide, and use \"change layout\" -- you'll see Alta Quota, Casa Finco, and Vetta variants"
  echo "listed alongside the existing ones for that slide type."
else
  echo "Push failed (status $status). If this is the sandbox, that's expected -- double-click"
  echo "this .command file on your own Mac once to finish the push."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
