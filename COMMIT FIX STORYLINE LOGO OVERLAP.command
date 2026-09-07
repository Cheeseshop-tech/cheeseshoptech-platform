#!/bin/bash
cd "$(dirname "$0")"
[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/lib/slide-templates.js "COMMIT FIX STORYLINE LOGO OVERLAP.command"

git commit -m "Fix logo overlapping title text in 3 Casa Finco storyline templates

Caught during visual review of the new style storylines: Three-up, Product range,
and Image (all Casa Finco) used the top-center logo (LOGO_TC) directly behind
centered title text — on Product range the title was fully hidden behind the
logo artwork, on Three-up it peeked out on both sides unreadably, and on Image
the logo sat squarely on top of the photo instead of a corner watermark.

Fix: switched all three to the top-right logo (LOGO_TR), matching the corner-
watermark convention the existing image/v1 and image/v2 templates already use.
Verified programmatically that no other new template has a comparable overlap.

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
