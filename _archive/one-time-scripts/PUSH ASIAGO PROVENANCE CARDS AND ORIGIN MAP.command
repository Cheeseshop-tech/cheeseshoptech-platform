#!/bin/bash
# PUSH ASIAGO PROVENANCE CARDS AND ORIGIN MAP — the two commits are ALREADY MADE locally
# (Rick asked for them during the session, so this script pushes rather than commits):
#
#   6475c9d  Asiago provenance cards + DOP origin map from real boundary data
#   b9787d0  Origin map: zoom to the region, halo labels near the zone edge
#
# Four cards on authenticity/provenance/origin for the Asiago set, on the same 2.5x3.5in
# shelf-talker canvas as the G/H/I round, plus a 16:9 origin slide. The map is drawn from
# official ISTAT province boundaries, not by hand and not by an image model — a generative
# map is wrong in detail, and a wrong border is fatal to a piece whose whole argument is
# legal certification of origin. Method captured as a project skill.
#
# HEADS UP: a third, older commit is also unpushed and WILL go up with these —
#   a4b85b8  inventory: auto-sync 2026-08-24 (drive modifiedTime 2026-08-20)
# That is the inventory routine's own automated commit, not part of this work. It is listed
# below before you confirm. Nothing in the live app changes from any of the three.
#
# NOT included: the Market News work (docs/BUILD_LOG.md's 2026-08-21 entry, the two netlify
# functions, the publish scripts) is still uncommitted in the working tree, untouched — that
# ships via COMMIT MARKET NEWS AUTO UPDATE.command.
#
# Double-click to push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " PUSH: Asiago provenance cards + origin map"
echo "=============================================="
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
echo "Files touched by the two Asiago commits:"
git diff --stat 6475c9d~1 b9787d0 2>/dev/null | sed 's/^/    /'
echo

echo "Anything uncommitted in your working tree stays put — this pushes commits only."
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
echo "✅ Pushed. Nothing in the live app changes — this is design comps and docs only."
echo
echo "   Still open before any of this can print:"
echo "     1. Asiago Vecchio ships at 9 months; the consortium defines Vecchio as over 10."
echo "        The card's DOP-floor cell reads 'see note' until Stefano answers."
echo "     2. The zone boundary is hatched for Padova/Treviso. It is defined at COMUNE level —"
echo "        with the disciplinare's comune list the map becomes exact instead of approximate."
echo "     3. Rick still picks a theme (sensory cue vs. provenance) and a layout before"
echo "        talkerTemplate() gets built."
echo
read -n 1 -s -r -p "Press any key to close..."
