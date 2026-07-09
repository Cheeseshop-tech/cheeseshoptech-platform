#!/bin/bash
# Double-click to commit + push: clean viewer-tier asset dialog (no edit chrome, no footer Close).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/media/media-hub.jsx" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md"

git commit -m "feat(media-hub): clean viewer-tier asset dialog

Rick: the salesman/broker-facing Media Hub dialog needs no edit affordances and no
footer Close — the X works fine.

- View mode: 'managed by the brand team' lock notice removed — viewers now get
  image / badges / PNG / Share / Copy / item info, nothing else.
- Footer Close button removed for everyone (X + Escape + backdrop still close).
- Unused Lock / DialogClose imports dropped.
- Admin Edit/Delete row, upload dialog, and edit-mode Cancel/Save unchanged.

Build clean (vite build)."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
