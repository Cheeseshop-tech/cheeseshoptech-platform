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
git commit -m "Fix: Monti MediaPicker showed zero images + warn when mock mode is on

src/lib/media.js's MOCK dataset (the fallback used when
VITE_MEDIA_BACKEND isn't set, e.g. a plain \`npm run dev\` with no local
.env) was keyed \"clients/montitrentini\" - the old tenant-folder
convention. Monti's real config moved to the flat \"monti-trentini\"
folder name without updating this key, so listAssets() silently
returned an empty array for Monti specifically: no error, just an
empty variable-slot image dropdown in Content Studio.

Live Cloudinary data was never affected (confirmed via the Cloudinary
connector: monti-trentini has 222 tagged assets, legacy monti has 70)
and production env vars/functions were confirmed correctly configured.
This only broke local dev running without the live backend wired up.

Follow-up in the same commit: mock mode gave zero indication it was
active, which is why this looked like a real outage. Exported
IS_MOCK_MODE + MOCK_MODE_MSG from media.js and added a visible amber
warning banner to both MediaPicker and the main Media Hub page so mock
mode can never silently masquerade as a broken/empty library again.

Verified: node --check on media.js; esbuild syntax-check on both
edited .jsx files."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
