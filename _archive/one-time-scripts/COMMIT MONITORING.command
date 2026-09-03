#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add \
  .env.example \
  docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md \
  docs/BACKLOG.md \
  docs/BUILD_LOG.md \
  docs/ENV_VARS.md \
  package.json \
  package-lock.json \
  src/main.jsx \
  src/lib/monitoring.js \
  src/components/error-boundary.jsx \
  netlify/functions/_sentry.js \
  netlify/functions/ai-compose.js \
  netlify/functions/campaign-content.js \
  netlify/functions/campaign-enrichment.js \
  netlify/functions/campaign-state.js \
  netlify/functions/campaigns.js \
  netlify/functions/card-ocr.js \
  netlify/functions/content-library.js \
  netlify/functions/crm-hubspot.js \
  netlify/functions/crm-outreach.js \
  netlify/functions/crm-push.js \
  netlify/functions/crm-summary.js \
  netlify/functions/gate.js \
  netlify/functions/history.js \
  netlify/functions/inventory-publish.js \
  netlify/functions/inventory.js \
  netlify/functions/items-get.js \
  netlify/functions/items-save.js \
  netlify/functions/login-log.js \
  netlify/functions/media-delete.js \
  netlify/functions/media-list.js \
  netlify/functions/media-update.js \
  netlify/functions/quotes.js \
  netlify/functions/store-orders.js \
  netlify/functions/store.js \
  netlify/functions/write-log.js \
  "COMMIT MONITORING.command" \
  "COMMIT APP HEALTH REVIEW.command"

echo "Committing..."
git commit -m "feat(monitoring): error tracking + performance monitoring (Sentry), env-gated

Closes the biggest gap from docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md: the platform had zero
error/perf visibility. Every incident to date (2026-07-24 blank images, 2026-07-25 PNG 400s,
2026-08-13 silently-404ing logo) was caught by Rick manually, never by the app.

Browser: src/lib/monitoring.js (dynamic-imports @sentry/react, zero bundle cost when
VITE_SENTRY_DSN is unset — verified: build produces one main chunk with no DSN, and cleanly
splits a separate ~494KB lazy chunk once a DSN is set) + src/components/error-boundary.jsx
(React error boundary wraps <App> in main.jsx — a render crash now shows a branded reload
screen and reports it, instead of a blank white page).

Functions: netlify/functions/_sentry.js + withMonitoring() applied to all 25 handlers. Catches
uncaught exceptions AND any function that returns a 5xx it handled gracefully (previously
invisible), plus a >3s slow-response flag. Every capture is explicitly flushed before the
handler returns, since Netlify Functions can freeze the process the instant a response goes out.

Env-gated exactly like the CRM/Shopify/Campaigns backends already in this repo: SENTRY_DSN /
VITE_SENTRY_DSN are both unset today, so this ships inert — zero behavior change until Rick
creates the free Sentry account and sets both in Netlify (steps in
docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md §6 and docs/ENV_VARS.md).

Verified: node --check on all 29 function files, and a real vite build (2050 modules, clean).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Netlify will redeploy automatically."
    echo ""
    echo "Reminder: this deploy is INERT until you set VITE_SENTRY_DSN + SENTRY_DSN in Netlify"
    echo "(Site configuration -> Environment variables) and redeploy. Steps in"
    echo "docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
