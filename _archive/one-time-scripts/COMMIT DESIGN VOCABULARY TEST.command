#!/bin/bash
cd "$(dirname "$0")"
[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/lib/slide-templates.js src/components/presentations/slide-renderer.jsx "COMMIT DESIGN VOCABULARY TEST.command"

git commit -m "Add expanded design vocabulary to Slide Studio renderer (clip-path + tokenized gradients)

Tests the two-stage Content Engine theory: templates can carry a
high-end, tenant-agnostic CSS vocabulary (diagonal clip-path cuts,
gradient-fill text) that Compose swaps content into with zero code
changes to Studio Director or AI Polish.

Renderer additions (slide-renderer.jsx):
- resolveGradientTokens(): resolves every \$token inside a raw
  gradient CSS string against the tenant's brand-token map, so
  gradients work for any brand instead of being hardcoded.
- slot.clipPath: raw CSS clip-path polygon, applied to shape and
  image slot boxes.
- font.gradient: raw CSS gradient, rendered via backgroundImage +
  background-clip:text, for gradient-fill headline/stat text.

Both additions are fully additive (undefined = no change) and
verified against the original hand-authored Vetta deck CSS:
- cover/v6, story/v6, product-feature/v6 hero_image: restored
  diagonal clip-path cuts on the hero photo panel.
- big-stat/v4 stat_value: restored sage-to-accent gradient text
  on the headline stat number.

Build verified clean: 2057 modules transformed, no new errors.

Not yet ported (future work, not required for this test): the
multiimg first-cell clip-path and the hero-stat hero_image
diagonal cut from the original deck have no current slot mapping.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq"

if [ $? -eq 0 ]; then
  echo "Commit created. Pushing..."
  git push
  if [ $? -eq 0 ]; then
    echo "✅ Pushed successfully."
  else
    echo "⚠️ Commit succeeded but push failed. Check your connection/credentials and re-run this script, or push manually."
  fi
else
  echo "⚠️ Nothing to commit or commit failed — check output above."
fi
read -p "Press Enter to close..."
