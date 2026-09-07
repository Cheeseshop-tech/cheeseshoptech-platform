#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/components/media/media-picker.jsx "COMMIT FIX MEDIA PICKER STUCK LOADING.command"

git commit -m "$(cat <<'EOF'
Fix image picker dropdown getting stuck on "Loading Media Hub..."

Root cause: the picker's asset-fetch effect tracked an "alive" flag that
reset to false every time the dropdown CLOSED, not just on unmount. If you
closed the picker before its fetch resolved -- easy to do, a cold Netlify
Function call can take a couple seconds -- the flag flipped false right as
the promise settled, so the finally() block silently skipped resetting
`loading` back to false. Every later open of that same picker then bailed
out immediately on its own guard without ever fetching again, showing
"Loading Media Hub..." / "All tags (0)" forever, with no error and no way
out short of a full page reload.

Fixed by tracking real component unmount (a ref cleared only when the
picker itself unmounts) instead of dropdown open/close state -- closing
early no longer poisons the loading flag, so the next open completes
normally.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi
