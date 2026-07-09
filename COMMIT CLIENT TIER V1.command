#!/bin/bash
# Double-click to commit + push: "client" (sales-rep/broker) tier v1 scoped.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/App.jsx" \
  "docs/BUILD_LOG.md"

git commit -m "feat(auth): scope the client (sales-rep/broker) tier v1

First real definition of the base 'client' passcode tier: Dashboard, CRM, Price List,
Product Catalog, Content Library. NOT Campaigns, Orders, or the full Content Engine hub
(which would also surface Media Hub) — admin-only for now, widen deliberately later.

- campaigns/orders NAV entries: allowed narrowed to admin-only.
- tools (Content Engine hub): narrowed to admin-only.
- new direct NAV entry 'presentations' -> Content Library, allowed admin+client, so reps get
  it on its own tab instead of the whole hub.
- Price List / Product Catalog needed no change (already featured tools, already client-visible).

No live user affected — no client-tier passcode has ever actually been distributed yet."

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
