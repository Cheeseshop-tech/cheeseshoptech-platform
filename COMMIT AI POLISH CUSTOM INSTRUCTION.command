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
git commit -m "Content Engine: AI Polish takes an optional custom instruction

Rick: \"can we prompt the agent from Content Engine?\" Added one
deck-level free-text box in Slide Studio (e.g. \"lean into the trade
program\" or \"make slide 3 punchier\"), sent as \`instruction\` to
ai-compose.js, capped at 400 chars.

Guidance only, not an expanded surface: SYSTEM_PROMPT gained rule #9
telling the model the instruction may steer tone/emphasis/order but
never what it's allowed to invent or touch. mergeDeck()'s server-side
re-validation is unchanged — every returned field still has to pass
the same real-candidates-only / no-invented-facts / in-scope-only
checks regardless of what the instruction says.

Also: .gitignore now excludes _to_delete/ and _tmp_e2e_test*.mjs
(scratch/throwaway files device_bash can produce but can't rm on a
mounted folder).

Verified end-to-end with a dry-run test against the real module
(network call to Anthropic mocked, all other code paths real): text/
story edits apply, an image id outside a slot's own candidates list
is dropped, contact is never touched even when the mocked model tries
to set it, order only applies as a genuine full permutation, the
instruction reaches the outbound prompt correctly truncated at 400
chars, no temperature field goes out, and a bad passcode is rejected.
17/17 checks passed. node --check on ai-compose.js; esbuild
syntax-check on slide-studio.jsx."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
