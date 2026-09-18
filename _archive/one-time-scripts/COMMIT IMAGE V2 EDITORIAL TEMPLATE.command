#!/bin/bash
# Double-click to commit + push: add "Image -- Editorial" (image/v2), the first Content Studio
# slide template built by pointing Claude at an awesome-design-md reference file for structural
# guidance (not colors/branding).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/slide-templates.js" \
  "COMMIT IMAGE V2 EDITORIAL TEMPLATE.command"

git commit -m "feat(content-studio): add Image -- Editorial template (image/v2)

Rick, 2026-09-07: \"build the first one as a working example\" -- following up on
\"how can we intergate this tool in the content engine\" (the awesome-design-md
reference library installed earlier this session). The Content Engine's actual
paint layer (slide-renderer.jsx) resolves every color/font through Brand Kit
tokens, so a real product's design system can never plug in as a runtime
dependency without breaking the one-brand-per-tenant guarantee. The one place
it CAN help is template geometry -- how a new SLIDE_TEMPLATES entry's slots are
laid out -- which is hand-authored per template already (see the product-feature
v1/v2/v3 and cover v1/v2/v3 variants).

This is the first template built that way: image/v2 (\"Image -- Editorial\"),
structurally referencing
docs/design-references/awesome-design-md/design-md/apple/DESIGN.md (\"edge-to-
edge product tiles... UI chrome recedes so the product can speak -- no
decorative gradients, no shadows on chrome\"). It departs from every other
template in the file on purpose: no gradient scrim (image/v1's approach), no
rounded card, no bold/uppercase/italic caption -- a single solid opaque caption
plate and a quieter caption weight, for the rare photo strong enough to need
nothing else on the slide. Same hero_image/slide_title slot ids as image/v1,
same family (\"image\"), so Stage 0/1 (studio-director.js) and Stage 2
(ai-compose.js) both already know how to fill it -- zero code change needed
there, exactly the pattern the existing product-feature/v2 comment describes.
Selectable today from Slide Studio's \"change layout\" picker (templateAlternates
groups it with image/v1 automatically via the family field); auto-compose
still defaults to image/v1 until/unless that default is deliberately changed.

No color, font, or brand asset came from the Apple reference -- only slot
geometry and restraint. All paint still resolves through the tenant's Brand Kit
($ink, $cream, $accent, $display), same as every other template.

Build-verified (2057 modules, vite build clean)." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq"

echo
echo "Pushing..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. \"Image -- Editorial\" is live -- open Content Studio > Slide Studio, pick"
  echo "any full-bleed photo slide, and use \"change layout\" to switch to it."
else
  echo "Push failed (status $status). If this is the sandbox, that's expected -- double-click"
  echo "this .command file on your own Mac once to finish the push."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
