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
git commit -m "Fix ai-compose.js: default model 404'd, switch to claude-sonnet-5

First live AI Polish click failed — claude-3-5-sonnet-20241022 (the
original pinned default) is not available on this account, returned
404 not_found_error. Switched the default to claude-sonnet-5. The
ANTHROPIC_MODEL Netlify env var override (already built) still works
without a redeploy if this needs to change again.

Verified: node --check on the edited file."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
