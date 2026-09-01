#!/bin/bash
# PUSH MARKET NEWS AUTO-UPDATE — commits are ALREADY MADE locally (Claude Code, 2026-09-01).
#
# TWO commits will go up:
#
#   8fa1cb8  feat(intelligence): wire Market News for auto-updates (Slice 3 off mock)
#   1e13d26  Cheese Signs: digitize the Asiago consortium booklet, add shelf-talker POS format
#
# WHY BOTH: 1e13d26 sits on top of 8fa1cb8, so a branch push carries it. It is documentation,
# spec and HTML comps only — no renderer, template or component code — so it changes nothing
# in the live app. If you want Market News ALONE, close this and run instead:
#     git push origin 8fa1cb8:phase-2-6-build
#
# WHAT THIS DOES AND DOES NOT CHANGE
#
# This ships the missing half of Market News: both Netlify functions (market-news.js read,
# market-news-publish.js write) and both publish scripts. Until now they existed ONLY on this
# Mac — verified 2026-09-01, they are on no branch of origin and not deployed. The live site
# cannot 404 a missing function (the SPA catch-all in netlify.toml returns index.html with a
# 200), so probing the URL looked like it passed and did not.
#
# The card does NOT go live on this push. It stays "Sample" until BOTH are set in Netlify:
#     MARKETNEWS_PUBLISH_SECRET     (a secret you generate — see below)
#     VITE_MARKETNEWS_BACKEND=function   (build-time; needs a redeploy to take)
#
# NOT included: the working tree still holds HANDOFF.md and eight untracked files
# (five COMMIT/PUSH .command launchers, docs/LEARNING_LOG.md). Untouched by this — they are
# the housecleaning pass.
#
# Double-click to push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "==================================================="
echo " PUSH: Market News auto-update"
echo "==================================================="
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock .git/objects/maintenance.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch: $BRANCH"
echo

if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  echo "❌ No upstream set for '$BRANCH'. Nothing to push against."
  echo "   Fix: git push -u origin $BRANCH"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

PENDING=$(git log --oneline '@{u}..HEAD')
if [ -z "$PENDING" ]; then
  echo "✅ Nothing to push — everything on '$BRANCH' is already on the remote."
  echo "   (A double-clicked .command can fire twice; this is the harmless second run.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 0
fi

echo "These commits will be pushed to origin/$BRANCH:"
echo
echo "$PENDING" | sed 's/^/    /'
echo
echo "⚠️  This triggers a Netlify rebuild. The Market News CARD DOES NOT GO LIVE yet —"
echo "    it stays 'Sample' until the two env vars below are set."
echo
echo "Uncommitted working-tree changes stay put — this pushes commits only."
echo
read -n 1 -s -r -p "Press any key to push, or Ctrl-C to cancel..."
echo
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commits exist locally but did NOT reach GitHub."
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo
echo "✅ Pushed."
echo
echo "   NOW VERIFY THE DEPLOY (guardrail #7 — auto-publish has silently missed a push before):"
echo "     Open Netlify -> cheeseshoptech-platform -> Deploys and confirm a row exists for:"
git rev-parse --short HEAD | sed 's/^/       commit /'
echo "     If no row appears within ~2 minutes, trigger it manually (Trigger deploy -> Deploy project)."
echo
echo "   THEN, to take Market News off Sample (both are yours — guardrail #4):"
echo "     1. Generate a secret:   openssl rand -hex 32"
echo "     2. Netlify env var:     MARKETNEWS_PUBLISH_SECRET = <that string>"
echo "        Check BOTH the project-level AND team-level env pages (guardrail #8)."
echo "     3. Netlify env var:     VITE_MARKETNEWS_BACKEND = function   (then redeploy)"
echo "     4. Locally, create scripts/.market-news-publish.json (gitignored):"
echo '        { "url": "https://cheeseshoptech-platform.netlify.app/.netlify/functions/market-news-publish",'
echo '          "secret": "<the SAME string>" }'
echo
echo "   Then: python3 scripts/publish_market_news.py"
echo "   Card should read 'Updated today' instead of 'Sample'."
echo
read -n 1 -s -r -p "Press any key to close..."
