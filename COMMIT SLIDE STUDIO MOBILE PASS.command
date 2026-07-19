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
git commit -m "Mobile pass: Slide Studio toolbar split into two rows

Rick, from his phone: \"can we get that button to be mobile.\" The
toolbar above the slide editor was one dense flex-wrap row of 10
controls (template select, Add slide, Auto-compose, AI Polish, title
field, Focus, Expand, Play, Clear slide, Delete) — on a phone-width
screen it wrapped unpredictably and pushed the actual slide preview
down the page before you could see it.

Split into two purposeful rows: content/editing actions (template,
Add slide, Auto-compose, AI Polish) always keep their labels since
they're what you came here to do; the title field now forces its own
full-width line below the 'sm' breakpoint instead of wrapping wherever
it happens to land. View/utility actions (Focus, Expand, Play, Clear,
Delete) moved to a second row and go icon-only below 'sm' for the two
that already have an icon (Focus, Delete) — same tap target, same
title tooltip, just less visual weight on a small screen.

Pure Tailwind class changes — every handler and prop is identical to
before, no logic touched. esbuild --jsx=automatic syntax-checked
clean."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
