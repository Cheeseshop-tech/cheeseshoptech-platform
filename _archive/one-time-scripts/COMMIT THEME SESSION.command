#!/bin/bash
# COMMIT THEME SESSION — double-click to commit the five-theme design session.
# (The sandbox couldn't finalize this commit; a leftover .git/index.lock blocks it.)
# After this finishes, double-click "DEPLOY TO STAGING.command" as usual.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit five-theme session ────────────"

# Clear the stale lock the sandbox left behind (safe: no other git process running).
rm -f .git/index.lock

git add -A \
  src/lib/themes.js \
  src/components/proposals/proposal-view.jsx \
  src/components/proposals/proposal-builder.jsx \
  docs/BUILD_LOG.md \
  HANDOFF.md

git commit -m "feat(themes): five-theme design session — full register set + renderer

Expand THEMES from 2 to 5 registers mapped to Monti's channels + flagship:
Heritage Editorial, Fresh Market, Chef's Table (foodservice), Trade Brief
(distributors), Alpine Gallery (chains/premium). All registers of the one
brand kit, not new brands.

themes.js: richer token vocab (lead incl. ink/cream, density, typeRegister
incl. grand, cover incl. minimal, product incl. grid-three-up/list-compact);
themeColors() resolves a legible onCanvas color for light-led themes;
new themeSpec() maps density+type to concrete classes.

proposal-view.jsx: now EXPRESSES density (rhythm/cover height/measure) and
type register (heading voice/cover title), adds the minimal cover and the
grid-three-up + list-compact product layouts. Existing two themes unchanged."

echo ""
echo "Committed. Recent history:"
git log --oneline -3
echo ""
echo "Next: double-click 'DEPLOY TO STAGING.command' to push it live."
echo ""
read -r -p "Press Return to close…"
