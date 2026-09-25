#!/bin/bash
# PUSH DATA INTEGRITY FIXES — 2026-09-25/26
#
# Pushes 13 commits. Netlify will rebuild (~40s). Nothing in here changes what the app looks
# like except the CRM account drawer (new Call log row) and the email-activity panel (now says
# why it's empty instead of hiding).
#
# After this runs, archive this file into _archive/one-time-scripts/.

cd "$(dirname "$0")" || exit 1

echo ""
echo "======================================================================"
echo "  PUSHING DATA INTEGRITY FIXES"
echo "======================================================================"
echo ""

# The Cowork sandbox strands git locks on this mount; clear them before doing anything.
mkdir -p _to_delete/git-stale
for f in .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock; do
  if [ -e "$f" ]; then
    mv "$f" "_to_delete/git-stale/$(basename "$f").$(date +%s)" 2>/dev/null
    echo "  cleared stale lock: $f"
  fi
done

echo ""
echo "About to push these commits:"
echo "----------------------------------------------------------------------"
git log --oneline origin/phase-2-6-build..HEAD
echo "----------------------------------------------------------------------"
echo ""

# Run the tests before shipping. Both are fast and both guard silent-failure classes.
echo "Running tests..."
npm run test --silent
if [ $? -ne 0 ]; then
  echo ""
  echo "  ✗ TESTS FAILED — not pushing. Fix the failures first."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "  ✓ tests pass"
echo ""

git push origin phase-2-6-build

if [ $? -eq 0 ]; then
  echo ""
  echo "======================================================================"
  echo "  ✓ PUSHED. Netlify is building — give it ~40 seconds."
  echo "======================================================================"
  echo ""
  echo "  Then check, in this order:"
  echo ""
  echo "   1. CRM tab -> click any account -> the drawer now has a CALL LOG row."
  echo "      Try 67 Gourmet, Di Palo, or Barnyard Cheese - they have call notes."
  echo ""
  echo "   2. Same drawer: 'Email activity is off - HubSpot app missing the"
  echo "      crm.objects.emails.read scope.' That message is CORRECT and expected."
  echo "      It replaces a blank space that told you nothing."
  echo ""
  echo "   3. Campaigns -> an Enrichment campaign -> the grey note under the"
  echo "      prospect list should now point at the Push button, not a CSV export."
  echo ""
  echo "  Tomorrow 07:10 the inventory task runs on its own and emails you if"
  echo "  it is blocked. That email is the thing that was missing all week."
  echo ""
else
  echo ""
  echo "  ✗ PUSH FAILED."
  echo "    If it mentions a lock file, run: FIX GIT LOCK AND PUSH.command"
  echo "    If it mentions rejected/non-fast-forward, another machine pushed first —"
  echo "    run 'git pull --rebase origin phase-2-6-build' then try again."
  echo ""
fi

read -n 1 -s -r -p "Press any key to close..."
echo ""
