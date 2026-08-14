#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add \
  docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md \
  "COMMIT APP HEALTH REVIEW.command"

echo "Committing..."
git commit -m "docs: app health & roadmap review — errors, additions, perf, completion (2026-08-14)

Read-only technical audit, not a code change. Covers: no error tracking/monitoring exists
(every incident to date caught by Rick manually, per the 2026-07-25 incident report's own
close-out note); today's house-passcode leak to a client GM (per-user auth is already built,
dormant behind VITE_AUTH_MODE=passcode); a 30-day feature log (Booth + Quote Builder shipped
as new surfaces); a real vite build run (1,698 modules clean, 1.055MB main bundle / no route
code-splitting); and a by-area completion table against 'market ready' (auth flip + basic
observability recommended as the next batch, ahead of new features, given today's incident).
Flags docs/PROJECT_STATUS.md and DEVELOPMENT_PLAN.md as ~2 months / ~200 commits stale.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Netlify will redeploy automatically."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
