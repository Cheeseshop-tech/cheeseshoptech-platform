#!/bin/bash
# Double-click to commit + push: clear 401 guidance on saves + kill the media-list browser cache.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/media.js" \
  "src/lib/items.js" \
  "netlify/functions/media-list.js" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md"

git commit -m "fix(media): actionable 401 message on saves; media-list no-store

'Edits not sticking' diagnosis: the 2026-07-06 write-guard replays the passcode
stashed at unlock time — browsers unlocked BEFORE the guard shipped have nothing
to replay, so every media/items save 401'd. The failed save keeps the asset dialog
in edit mode (by design), which read as 'stuck / no close button'. Operator fix is
sign out -> re-enter passcode; the code now says so:

- media.js: exported RELOGIN_MSG; updateAsset/deleteAsset map 401 to it instead of
  a bare status code.
- items.js: saveItems, same mapping.
- media-list.js: cache-control no-store (was private, max-age=60) — the 60s browser
  cache served the PRE-edit list on a quick reload after a successful save, which
  also read as 'edit didn't stick'. The hub fetches once per mount; the cache
  bought nothing.

Build clean (vite build), node --check clean."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "Reminder: on any browser that was unlocked before today, sign out and re-enter"
  echo "the passcode once — that's what fixes the failing saves."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
