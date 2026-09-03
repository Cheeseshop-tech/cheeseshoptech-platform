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
git commit -m "Fix ai-compose.js: remove temperature param, claude-sonnet-5 rejects it

Second live AI Polish click (after the earlier model-id 404 fix)
failed with 400 invalid_request_error: \"temperature is deprecated
for this model.\" Removed the hardcoded temperature: 0.5 field — the
call now runs at the model's own default.

Same root cause as the earlier 404: a request parameter carried over
from training-era API knowledge without checking it against the live
model. Logged in BUILD_LOG.md and LEARNING_LOG.md as a pattern to stop
repeating — don't hardcode any optional Anthropic API parameter
without confirming it's supported by the exact model in use.

Verified: node --check on the edited file."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
