#!/bin/bash
# Double-click to commit + push: Studio Director Stage 0+1 (deterministic Auto-compose).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/studio-director.js" \
  "src/components/presentations/slide-studio.jsx" \
  "src/components/proposals/content-studio.jsx" \
  "src/components/layout/app-shell.jsx" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT STUDIO DIRECTOR.command"

git commit -m "feat(studio): Studio Director Stage 0+1 — deterministic Auto-compose

- new lib/studio-director.js: directDraft({resolved, user, opportunity}) resolves a
  full deck (cover -> statement -> story -> image beat -> product range -> closing)
  with zero AI: kit voice -> text slots (statements take the shortest line, story
  slides the long blocks), Media Hub -> image slots (tag crosswalk to the 12-tag
  taxonomy, approved-first, SKU-linked preferred, no image reused twice), catalog ->
  product slots (opportunity SKUs first, then featured); Monti sample contact
  explicitly blanked so it never leaks into another tenant's deck
- SlideStudio: Auto-compose button (empty-state hero card + toolbar), composing
  state, optional opportunity prop
- ContentStudio: passes the last Opportunity Compose draft (headline/storyKeys/
  skuCodes) as the Director's seed — wire 5 (market intelligence) now feeds the
  Studio end-to-end
- spec: CONTENT_ENGINE_WIRING_SPEC §3 Stage 0+1; Stage 2 (AI pass) plugs in behind
  the same call once billing prereqs are set
- one-viewport workspace (Rick): vertical filmstrip rail + height-fitted preview
  (ResizeObserver, 16:9 fit) + internally-scrolling inspector, deck title inline in
  the toolbar, per-slide template switcher — zero page scroll while editing; less
  scrolling = faster design + continuity
- workspace view options (Rick): collapsible left nav (lever in the topbar, icon
  rail when closed, persisted per browser — app-shell.jsx); Studio Focus mode
  (auto-expand the slide, hide rail + inspector); fullscreen current slide (Expand);
  fullscreen slide show (Play, keyboard + click advance, position hands back to the
  editor on close)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: Content Engine → Content Studio → 'Auto-compose' composes a full Monti deck."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
