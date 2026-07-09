#!/bin/bash
# Double-click to commit + push: Brand Systems Engine session docs (2026-07-01 late) + coming-soon proxy commit.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT BRAND SYSTEMS ENGINE.command"

git commit -m "docs: Brand Systems Engine + Queso Couture session (2026-07-01 late)

- BUILD_LOG (cont. 3): BSE v1 live at /tools/brand-systems-engine/, QC room at /series/queso-couture/,
  brand-domain proxy via coming-soon site _redirects, canonical MT kit v1.1, two-engine architecture
- HANDOFF: LIVE TONIGHT section + sync state
- also pushes 6b58f1f (coming-soon proxy files) which was ahead of origin"

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
