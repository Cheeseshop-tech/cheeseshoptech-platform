#!/bin/bash
# Double-click to commit + push: sales-rep role-gating fix + REAL mobile nav drawer +
# presentations RoleGate. SUPERSEDES "COMMIT SALES REP MOBILE FIX.command" (never run —
# same files, one working-tree state; this button deletes it after a successful push).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "config/clients/client.schema.json" \
  "config/clients/montitrentini.json" \
  "src/App.jsx" \
  "src/components/home/home-hub.jsx" \
  "src/components/layout/app-shell.jsx" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md"

git commit -m "fix(mobile+roles): role-gate dashboard tool cards; real mobile nav drawer; gate presentations route

Two same-day passes (2026-07-06 cont. 6 + 7), one working tree:

Role-gating (found testing the sales-rep tier on an iPhone):
- home-hub.jsx: dashboard tool cards had NO role filtering at all — now filter by
  each tool's 'allowed' (config/clients/<tenant>.json), same convention as nav.
- App.jsx: featuredNav reads each tool's own 'allowed' instead of hardcoding
  admin+client (this let Storefront leak onto the sales-rep top nav).
- client.schema.json: new optional 'allowed' array per tool entry.
- montitrentini.json: Campaigns + Storefront allowed:[admin]; trade-portal renamed
  presentation-library / 'Presentation Library' (placeholder — real plan is
  personalized per-buyer decks with individual email-gated access, not built).

Mobile nav (the real fix — replaces the same-day stopgap back button):
- app-shell.jsx: md:hidden hamburger opens MobileNavDrawer — backdrop + left panel,
  brand header (+ Agency Console eyebrow for house), the SAME role-filtered nav array
  as the sidebar, taller touch targets, Escape/backdrop/X close, closes on navigate.

Security:
- App.jsx: presentations route wrapped in RoleGate roles=[admin,client] with the
  standard AccessNotice fallback — closes the pre-existing ?page=presentations
  direct-URL gap. Buyer deep links behind the tenant passcode still work.

Build clean (vite build), npm run validate:clients clean."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  if [ -f "COMMIT SALES REP MOBILE FIX.command" ]; then
    rm -f "COMMIT SALES REP MOBILE FIX.command"
    echo "🧹 Removed superseded COMMIT SALES REP MOBILE FIX.command"
  fi
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
