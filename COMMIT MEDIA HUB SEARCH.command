#!/bin/bash
# Double-click to commit + push: Media Hub asset-grid search bar.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/media/media-hub.jsx" \
  "docs/BUILD_LOG.md"

git commit -m "feat(media-hub): search bar on the asset grid (title/SKU/alt/description)

- Product Catalog + Items tab already had search (built 2026-07-04); the gap was the Media
  Hub's main asset grid (All/Recent/usage tabs) — only had left-rail tag filters.
- media-hub.jsx: search box above the grid on every tab except Items (which keeps its own),
  filters client-side, resets pagination, distinct empty-state copy for no-matches vs.
  nothing-tagged-yet.
- BUILD_LOG: also logs this session's photo->item matching resolution (Vezzena/Piave/Lagorai/
  Provolone/Asiago) done via item-reference cross-check + live Cloudinary image inspection —
  writes not yet applied, pending go-ahead."

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
