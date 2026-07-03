#!/bin/bash
# Double-click to commit + push: Studio preview fit fix (tiny-slide bug).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/presentations/slide-studio.jsx" \
  "docs/BUILD_LOG.md" \
  "COMMIT STUDIO FIT FIX.command"

git commit -m "fix(studio): preview fit observer attaches when the editor pane exists

- useFitWidth ran once at Studio mount (template gallery, no pane -> ref null), so
  the ResizeObserver never connected and the main slide collapsed to minimum width
- now takes an 'active' flag (slide-deck + deck present): measures immediately on
  attach, re-observes on layout changes (nav collapse, Focus mode), ignores 0-size
  rects, min width raised 200->320; w-full fallback while unmeasured
- result: the main slide fills the workspace pane; collapsing the left nav or
  entering Focus mode auto-expands it further (Rick's screenshot, 2026-07-02)
- pager clearance: fit subtracts 44px so the slide + mini pager sit fully inside
  the pane (live-inspection finding: 15px top/bottom clip at 1920x1080)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: Content Studio → slide should FILL the center pane; collapse the nav to grow it."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
