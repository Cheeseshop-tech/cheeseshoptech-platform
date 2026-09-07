#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/components/media/media-picker.jsx "COMMIT SPEED UP IMAGE PICKER LOADING.command"

git commit -m "$(cat <<'EOF'
Load image picker assets page-by-page instead of all at once

Follow-up to the stuck-loading fix. The picker was calling listAssets(),
which hits the Media List function's "full mode" -- sequential Cloudinary
Admin API round trips (up to 500 assets per folder) for the main folder,
then the same again for every legacy folder, all before the picker could
render a single thumbnail. With 342+ tagged assets across Monti's main +
legacy folder, that's several serial network round trips of dead air on
every open.

Switches to listAssetsPage() -- already built for the Media Hub's own
load-time fix, just never wired into this picker. The first page (60
assets) renders immediately so the grid and tag filter are usable right
away; remaining pages stream in quietly in the background so the full
library still ends up available, just without blocking first paint on
all of it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi
