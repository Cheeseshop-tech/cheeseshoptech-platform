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
git commit -m "Content Engine Part C: Stage 2 AI pass (ai-compose.js) + AI Polish button

- studio-director.js: pickAsset() now also exposes up to 5 scored image
  candidates per slot (slots.__candidates), additive, no change to Stage
  0/1's actual picks.
- netlify/functions/ai-compose.js (new): holds ANTHROPIC_API_KEY server-
  side, forced-tool-call to the Claude Messages API for structured JSON,
  rewrites copy in brand voice + optional slide order + optional image
  re-pick. Every field is re-validated server-side against the original
  deck before merging (image picks must be in that slot's own candidate
  list; contact/__/\$-prefixed keys are never shown to the model) so the
  hard rules hold even if the model ignores the prompt.
- slide-studio.jsx: new 'AI Polish' toolbar button next to Auto-compose.

Verified: node --check on both new/changed .js files; npx vite build
clean (1688 modules, no errors). Docs + BUILD_LOG.md + project memory
updated same pass."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
