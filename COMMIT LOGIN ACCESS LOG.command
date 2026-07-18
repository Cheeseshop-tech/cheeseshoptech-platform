#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add netlify/functions/_login-log.js netlify/functions/login-log.js netlify/functions/gate.js netlify/functions/_write-log.js src/components/home/agency-console.jsx docs/BUILD_LOG.md "COMMIT LOGIN ACCESS LOG.command"

echo "Committing..."
git commit -m "feat(auth): log every portal login attempt by IP, add House Console access-log view

gate.js recorded nothing about logins -- no IP, timestamp, or success/fail --
while writes have been logged since 2026-07-06. Added _login-log.js (same
Netlify Blobs audit pattern, its own store), wired into gate.js on every
real attempt (health-check pings excluded), a house-admin-only login-log.js
read endpoint, and an Access log panel in the Agency Console (last 25
attempts: IP, tenant, tier, result)."

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Login access log is on GitHub."
    echo "   Netlify will deploy it automatically."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
