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
git commit -m "Docs: slide template design matrix, grounded in the real brand kit

Rick: \"examine the slides that are in the template gallery and write
the IDs for each and plug them into a design matrix of versions...
design the versions with strong reflection on the brand kit and brand
voice.\"

New docs/SLIDE_TEMPLATE_DESIGN_MATRIX.md — catalogs all 16 templates
across 10 families (the 3 families with real chosen-among alternates:
cover, product-feature, story; 7 still single-version, named as an
honest gap rather than hidden). Every design rationale is grounded in
the actual brand-kit.json values (exact hex codes, the 50%/25%/10%
cream/forest-green/ink ratio rule, the display-vs-ui font-role split,
the five voice attributes) rather than generic taste language — pulled
straight from src/data/montitrentini/brand-kit.json and
src/lib/brand-tokens.js, not paraphrased from memory.

Includes a brand-compliance self-check confirming the 6 new templates
introduce zero new hex values, never misuse Italia Red outside the
logo, and never cross the display/ui font-role boundary — plus an
instruction-box cheat sheet mapping plain-language asks ('make the
cover a split layout') to exact template ids, and a short section
distinguishing this human-facing doc from the actual runtime mechanism
(family / templateAlternates() / layoutOptions in ai-compose.js) that
already lets AI Polish identify real alternates safely, so the two
don't get confused as the same thing."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
