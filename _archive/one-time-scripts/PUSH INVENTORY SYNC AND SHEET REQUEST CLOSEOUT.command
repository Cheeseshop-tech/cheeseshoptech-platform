#!/bin/bash
# PUSH INVENTORY SYNC + SHEET REQUEST CLOSEOUT — commits are ALREADY MADE locally.
# Rick approved pushing knowing this carries the Asiago design work along with it.
#
# FOUR commits will go up:
#
#   eeee035  docs: close out 8/21 availability-sheet misalignment request
#   097101c  inventory: auto-sync 2026-08-25
#   b9787d0  Origin map: zoom to the region, halo labels near the zone edge
#   6475c9d  Asiago provenance cards + DOP origin map from real boundary data
#
# WHAT THIS DOES AND DOES NOT CHANGE
#
# The inventory data is ALREADY LIVE. It was published 2026-08-25 through the
# inventory-publish Netlify function into Netlify Blobs — the rebuild-free path. The app
# serves it on next page load. This push does NOT make inventory live; that already happened.
# The commit is the audit trail only.
#
# What this push DOES do: it triggers a Netlify rebuild, and that rebuild ships the two
# Asiago commits — provenance cards + DOP origin map — to the live site. Rick chose this
# knowingly on 2026-08-25. If that was not the intent, close this window now.
#
# NOT included: ten modified files still sit uncommitted in the working tree —
# agency-console.jsx, market-news.jsx/.js, market-news.json, signs.json, BUILD_LOG.md,
# CHEESE_SIGNS_SPEC.md, PROJECT_ROADMAP.md, .env.example, .gitignore. Untouched by this.
#
# Double-click to push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "==================================================="
echo " PUSH: inventory sync + sheet request closeout"
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
echo "⚠️  This triggers a Netlify rebuild, which ships the Asiago provenance"
echo "    cards + origin map live. Inventory is ALREADY live and unaffected."
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
echo "     If no row appears within ~2 minutes, trigger the deploy manually."
echo "     Do NOT treat a changed bundle filename hash alone as proof."
echo
read -n 1 -s -r -p "Press any key to close..."
