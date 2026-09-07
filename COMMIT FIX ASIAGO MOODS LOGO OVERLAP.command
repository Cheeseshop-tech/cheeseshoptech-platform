#!/bin/bash
# Double-click to commit + push: fix logo/kicker overlap in 4 of the 15 ported Asiago mood
# template variants, found via a design critique of the live Compose page.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/slide-templates.js" \
  "COMMIT FIX ASIAGO MOODS LOGO OVERLAP.command"

git commit -m "fix(content-studio): stop logo overlapping kicker in 4 Asiago mood variants

Rick, 2026-09-07 (same day as the mood port): reported the ported Asiago
templates in Compose had 'lost alignment and the refined details.'
Investigated live in Chrome via the design-critique skill.

Root cause: 4 of the 15 new template variants placed their kicker
pill/ribbon at the same screen coordinates as the shared brand-logo
constant (LOGO_TL or LOGO_TC), so the logo rendered directly on top of the
kicker text, cutting words in half:

- cover/v5 (Casa Finco): kicker_pill/topic_label (x60-300, y70-114)
  overlapped LOGO_TL (x48-228, y34-106).
- cover/v6 (Vetta): ribbon/topic_label (x0-300, y72-116) overlapped
  LOGO_TL.
- product-feature/v4 (Alta Quota): rule_line + topic_label (x40-380,
  y56-100) overlapped LOGO_TL. Unlike cover/v4 and story/v4, this variant
  put its kicker at the top instead of in a bottom caption plate, which is
  what exposed it to the same collision the cover moods had.
- closing/v4 (Vetta): ribbon/topic_label (x330-630, y100-140) overlapped
  LOGO_TC (x360-600, y28-124).

The other 11 ported variants (story/v4-v6, product-feature/v5-v6,
big-stat/v2-v4, closing/v2-v3, cover/v4) were checked live and are clean --
either their kicker sits in a bottom plate away from the logo, or the logo
uses LOGO_TR (top-right) while the kicker sits on the left.

Fix: pushed each overlapping kicker/ribbon down (or, for closing/v4, kept
x and pushed y) past the relevant logo constant's real footprint with a
clear margin, and moved the title/story blocks that followed it down by
the same amount to preserve the original vertical rhythm. No color, font,
copy, or slot-id vocabulary changed -- Stage 0/1/2 and AI Polish still fill
these exactly as before. Verified against the actual LOGO_TL/LOGO_TR/
LOGO_TC pixel rects in slide-templates.js, not eyeballed.

Build-verified (2057 modules, vite build clean, same count as before this
fix). Not yet re-verified live in Compose -- do that after this deploys." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq"

echo
echo "Pushing..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. Once deployed, re-check Cover -- Casa Finco, Cover -- Vetta,"
  echo "Product Feature -- Alta Quota, and Closing -- Vetta in Compose > Slide deck --"
  echo "the logo should no longer sit on top of the kicker text on any of them."
else
  echo "Push failed (status $status). If this is the sandbox, that's expected -- double-click"
  echo "this .command file on your own Mac once to finish the push."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
