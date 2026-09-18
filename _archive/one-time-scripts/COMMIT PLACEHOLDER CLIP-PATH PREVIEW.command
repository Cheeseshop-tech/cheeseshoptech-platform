#!/bin/bash
set -e
cd "$(dirname "$0")"

# Self-heal a stale git lock if a previous run got interrupted
[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/components/presentations/slide-renderer.jsx "COMMIT PLACEHOLDER CLIP-PATH PREVIEW.command"

git commit -m "$(cat <<'EOF'
Preview clip-path shape on empty image placeholders

Photo slots that carry a clipPath (Vetta diagonal cuts, etc.) now show
that shape on the "+ Photo" placeholder box too, before an image is
picked -- previously the placeholder was always a plain rectangle
regardless of the slot's clip shape, so the deck's real geometry only
showed up once a photo was added.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi
