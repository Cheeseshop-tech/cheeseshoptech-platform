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
git commit -m "Fix: AI Polish wasn't wired to Media Hub for hand-built slides

Rick: \"its claiming to have processed a function like adding a photo
and nothing happens... not wired to media hub.\" Confirmed real: brand
voice was fine, but slots.__candidates (the only image ids ai-compose.js
is allowed to pick from) was ONLY EVER populated by Stage 0
Auto-compose. Any slide added via \"pick a template\" instead, or any
slot whose photo was hand-swapped afterward via MediaPicker, had a
singleton or missing candidate list — Claude had zero real
alternatives, so mergeDeck() correctly dropped every image edit it
proposed, while its own notes could still claim success.

New netlify/functions/_media-candidates.js: lightweight, best-effort
live Cloudinary lookup (mirrors studio-director.js's pickAsset()
scoring minus the SKU bonus) that backfills a real candidate pool for
any thin/missing image slot before the brief goes to Claude. Fully
additive/fail-soft — any failure silently falls back to prior
behavior. slide-studio.jsx now also sends cloudinaryFolder /
cloudinaryLegacyFolders so the function knows which library to query.

Verified with two dry-run suites against the real modules (network
mocked, all other code paths real), 23/23 checks: the existing
guardrail regression suite is unchanged, and a new suite reproducing
Rick's exact scenario (manually-added slide, zero __candidates)
confirms the image edit is now genuinely applied, and that decks with
rich Stage-0 candidates skip the extra Cloudinary call entirely.

node --check on both .js files; esbuild syntax-check on
slide-studio.jsx."
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
echo ""
echo "Done. Press Enter to close."
read -r
