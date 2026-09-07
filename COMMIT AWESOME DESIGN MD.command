#!/bin/bash
# Double-click to commit + push: install the awesome-design-md reference library
# (74 vendored DESIGN.md product design-system analyses) as prep for the CST
# design-flip pass, plus a doc explaining how/when to use it.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "docs/design-references/awesome-design-md" \
  "docs/DESIGN_REFERENCES.md" \
  "COMMIT AWESOME DESIGN MD.command"

git commit -m "docs(design): vendor awesome-design-md as a design-flip reference library

Rick, 2026-09-06/07: \"lets instal the Awsome design tools\" - one of the 5 free
Claude design plugins Rick found (striped-thief-c4a.notion.site/Five-free-plugins),
picked out for early install ahead of the other four (Taste, Impeccable, Playwright
MCP, img2threejs), which stay proposed-only per the sequencing Rick described:
improve Content Studio design quality now, then a full \"dynamic design\" pass
across all CST apps once core apps are live (see the CST priority roadmap).

Vendored VoltAgent/awesome-design-md (MIT) into
docs/design-references/awesome-design-md/design-md/ - 74 DESIGN.md files, each a
structural analysis (typography, spacing, component, tone patterns) of a real
product's design system: Stripe, Linear, Notion, Apple, Airbnb, Figma, Shopify,
Spotify, and more. Cloned with git history intact, then the nested .git directory
was stripped so these become normal tracked files in CST's repo instead of an
accidental embedded/gitlink repo (git would otherwise silently skip their content
on commit). Added docs/DESIGN_REFERENCES.md explaining how to point Claude at a
specific DESIGN.md as a structural reference in a prompt, the licensing boundary
(MIT covers the repo's own analysis, not the real brands' actual visual
identity - never a costume to copy Stripe's/Linear's/etc. actual look), how this
relates to CST's own locked docs/DESIGN_SYSTEM.md (Terracotta/Cellar Olive,
Fraunces + Inter - these references don't replace it, they're structural
inspiration for the later design-flip pass), and an updating note (vendored
snapshot, not a live pull - re-clone to a scratch dir and rsync design-md/ over
to refresh).

No app code touched - this is reference material only." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq"

echo
echo "Pushing..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. awesome-design-md is now live in the CST repo under"
  echo "docs/design-references/awesome-design-md/ - see docs/DESIGN_REFERENCES.md"
  echo "for how to use it."
else
  echo "Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
