#!/bin/bash
# COMMIT ACCESS LOG NAMES — the Access log (House Command Center) now shows WHO signed in
# (name + email from real Netlify Identity), not just IP/tier. Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Access log shows names"
echo "=============================================="
echo
read -n 1 -s -r -p "Press any key to continue, or Ctrl-C to cancel..."
echo
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock .git/objects/maintenance.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "netlify/functions/record-login.js" \
  "netlify/functions/_login-log.js" \
  "src/lib/auth-context.jsx" \
  "src/components/home/agency-console.jsx" \
  "docs/BUILD_LOG.md" \
  "COMMIT ACCESS LOG NAMES.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "Access log: show WHO logged in (name + email), not just IP/tier

The Access log (House Command Center) has only ever recorded rows from gate.js,
the legacy shared-passcode gate -- a shared secret has no individual identity
behind it, so those rows were always role/tenant/IP, never a name. Real
per-user Netlify Identity has been the live login path since 2026-08-17, but
nothing ever logged THAT -- so since the passcode-to-Identity switch, the
Access log has quietly been recording nothing real at all.

New netlify/functions/record-login.js: called fire-and-forget right after a
real sign-in succeeds (src/lib/auth-context.jsx). Name/email/roles/tenant come
from Netlify's own verified Identity JWT (context.clientContext.user) --
never from anything the client sends -- so a signed-in user cannot claim to be
someone else in this log. UI: the Access log table gets a new Who column
(name + email), falling back to 'shared passcode' for old passcode-era rows.

Scope: this logs successful Identity sign-ins only. A failed real-Identity
attempt has no verifiable who (GoTrue rejects it before any JWT exists), so
there's nothing trustworthy to attribute a failure to -- tracking failed real
logins would be separate follow-up work, not this change.

Build verified clean (2051 modules)."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Netlify will rebuild. Once it's live: sign out, sign back in,"
echo "   and check the Access log panel shows your name."
echo
read -n 1 -s -r -p "Press any key to close..."
