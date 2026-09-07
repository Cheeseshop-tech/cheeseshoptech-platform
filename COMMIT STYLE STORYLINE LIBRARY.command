#!/bin/bash
cd "$(dirname "$0")"
[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/lib/slide-templates.js src/components/presentations/slide-studio.jsx "COMMIT STYLE STORYLINE LIBRARY.command"

git commit -m "Add design-style storylines to Slide Studio (10-slide decks behind one thumbnail per style)

Rick: 'a better organized template library... behind a generic thumbnail. we want
a 10 template story line per style that auto loads into the compose field when
you select a design style.'

slide-templates.js:
- Added 15 new mood templates (5 slide types x 3 styles) to complete each style's
  narrative: Statement, Quote, Product range, Three-up, and Image, in addition to
  the existing Cover/Story/Product Feature/Big stat/Closing. Visual language for
  each pulls from the same original hand-authored deck CSS as the first 5 (Alta
  Quota's restrained-editorial rules/list-rows, Casa Finco's rounded pull-cards/
  tiles, Vetta's ink-canvas ribbons/dividers + reused clip-path/gradient-text
  vocabulary from the design-vocabulary test).
- Tagged every mood template (30 total, old + new) with a mood: field, and the 10
  original generic templates with mood: \"classic\".
- Added MOOD_STYLES (4 styles: Classic, Alta Quota, Casa Finco, Vetta) and
  MOOD_STORYLINES (each style's canonical 10-slide order: cover, statement, story,
  product feature, three-up, quote, big stat, product range, image, closing) plus
  loadMoodStoryline() to build ready-to-drop deck entries from a style id.

slide-studio.jsx:
- Replaced the 30+-card template grid on the empty-deck screen with 4 style cards
  (one generic thumbnail each). Clicking a style auto-loads its full 10-slide
  storyline straight into the editor via the new loadStoryline() handler — same
  deck shape autoCompose()/addSlide() already produce, so nothing downstream
  (save, AI Polish, per-slide template switching) needed to change. Individual
  templates stay fully reachable once a deck exists, via the existing per-slide
  template dropdown and Add slide list — unchanged.

Build verified clean: 2057 modules transformed, no new errors. Verified
programmatically that all 4 storylines resolve to exactly 10 slides each with
no missing template ids.

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
