#!/bin/bash
# PUSH MARKET NEWS HANDOFF — commits and pushes the Market News paper trail.
#
# The Market News CODE is already committed and pushed (8fa1cb8) and deployed. This is the
# documentation half only. THREE files go up:
#
#   HANDOFF.md                          Cowork's 2026-09-01 entry + the RESOLVED block added
#                                       by Claude Code the same day (what actually shipped,
#                                       the false-positive 200 trap, what is still open)
#   MARKET NEWS GO LIVE.command         one double-click: set the secret, redeploy, publish
#   PUSH MARKET NEWS AUTO UPDATE.command   the push launcher for 8fa1cb8 (now spent)
#
# NOT included, deliberately — these are the housecleaning pass, not Market News:
#   the five older COMMIT/PUSH .command launchers, docs/LEARNING_LOG.md
#
# NO app behaviour changes. This is docs and scripts only; the Netlify rebuild it triggers
# ships nothing user-visible.
#
# Double-click to run.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "==================================================="
echo " COMMIT + PUSH: Market News handoff"
echo "==================================================="
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock .git/objects/maintenance.lock; do
  [ -f "$lock" ] && rm -f "$lock" && echo "Cleared stale $lock"
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch: $BRANCH"
echo

if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  echo "❌ No upstream set for '$BRANCH'."
  echo "   Fix: git push -u origin $BRANCH"
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi

echo "Staging..."
git add \
  "HANDOFF.md" \
  "MARKET NEWS GO LIVE.command" \
  "PUSH MARKET NEWS AUTO UPDATE.command" \
  "PUSH MARKET NEWS HANDOFF.command" || {
    echo "❌ git add failed — nothing committed."
    read -n 1 -s -r -p "Press any key to close..."; exit 1; }

if git diff --cached --quiet; then
  echo "✅ Nothing staged — already committed. (A double-clicked .command can fire twice.)"
  echo
  PENDING=$(git log --oneline '@{u}..HEAD')
  if [ -z "$PENDING" ]; then
    echo "   And nothing to push either. All done."
    read -n 1 -s -r -p "Press any key to close..."; exit 0
  fi
else
  echo "Staged:"
  git diff --cached --name-only | sed 's/^/    /'
  echo
  git commit -q -F - <<'MSG'
docs: close out the 2026-09-01 Market News handoff

Cowork's handoff entry said the Market News auto-update feature was committed but
not pushed and not live. That was correct. This records how it resolved, and adds
the two launchers built along the way.

The finding worth keeping: the live probe that made the functions LOOK deployed was
a false positive. netlify.toml ends with an SPA catch-all (/* -> /index.html, 200),
so a MISSING Netlify function returns 200 with the HTML shell rather than a 404 — a
nonsense function name returns the same 200. Status codes prove nothing on this site;
read the body. Deployed = real JSON, missing = <!doctype html>. Both functions were in
fact on no branch of origin at all.

Shipped in 8fa1cb8 and deploy-verified by finding the literal string "Updated yesterday"
(from the new freshnessLabel()) in the live bundle — not by trusting the filename hash,
per guardrail #7.

Still open and written into the entry: MARKETNEWS_PUBLISH_SECRET exists in Netlify with
the correct key and scopes but an EMPTY value (created while the form was on "different
value for each deploy context"), so the function returns 503 from a variable that looks
present in the UI. MARKET NEWS GO LIVE.command fixes that end to end in one double-click.

Also logged, not acted on: four Netlify vars holding real credentials are stored with
is_secret false and are readable in plaintext.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
  echo "✅ Commit created."
  echo
fi

echo "These commits will be pushed to origin/$BRANCH:"
git log --oneline '@{u}..HEAD' | sed 's/^/    /'
echo
read -n 1 -s -r -p "Press any key to push, or Ctrl-C to cancel..."
echo; echo

echo "Pushing..."
if ! git push; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   ('fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi

echo
echo "✅ Pushed."
echo
echo "   Confirm the deploy (guardrail #7 — auto-publish has silently missed a push before):"
echo "     Netlify -> cheeseshoptech-platform -> Deploys, look for a row for commit"
git rev-parse --short HEAD | sed 's/^/       /'
echo "     Nothing user-visible changes in this one — docs and scripts only."
echo
read -n 1 -s -r -p "Press any key to close..."
