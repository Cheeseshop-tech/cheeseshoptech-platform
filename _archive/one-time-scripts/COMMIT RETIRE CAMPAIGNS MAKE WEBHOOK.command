#!/bin/bash
# Double-click this file to commit and push the Campaigns/Make webhook retirement.
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the Campaigns/Make webhook retirement (this is what makes Netlify deploy it)…"
echo

# Self-heal any stranded lock first (harmless if none exist).
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  ".env.example" \
  "CLAUDE.md" \
  "docs/CRM_CONNECTOR.md" \
  "docs/ENV_VARS.md" \
  "docs/INTEGRATIONS_PLAN.md" \
  "docs/INTEGRATION_WIRING_BRIEF.md" \
  "docs/LAUNCH_AND_MAINTENANCE.md" \
  "netlify.toml" \
  "netlify/functions/campaigns.js" \
  "src/components/home/agency-console.jsx" \
  "src/lib/campaigns.js" \
  "COMMIT RETIRE CAMPAIGNS MAKE WEBHOOK.command"

git commit -m "chore(campaigns): retire the never-built Make webhook seam

Rick asked where MAKE_CAMPAIGNS_WEBHOOK_URL stood (was seeing 'not
configured' from campaigns.js). Architecture review before building it
turned up two things that changed the answer:

1. Rick's Make.com account has zero scenarios, zero connections, zero
   webhooks — confirmed live via the Make MCP connector. There is also no
   external data source identified anywhere in the docs for a scenario to
   pull from. Building it now meant inventing a scenario with nothing real
   behind it.
2. netlify/functions/campaigns.js predates campaign-defs.js. It was
   designed to fetch campaign DEFINITIONS from an external source because
   there was no in-app write path yet. That gap closed 2026-08-21 when the
   native '+ New campaign' form shipped, writing straight to Netlify Blobs
   via campaign-defs.js. Since then, Make would only ever be a second,
   redundant source for data the app can already create directly — the
   same split-source-of-truth trap the CRM seam deliberately avoided by
   going direct-HubSpot instead of Make middleware.

Rick confirmed: retire it rather than build it.

Removed:
- netlify/functions/campaigns.js (the Make proxy function) — deleted.
- src/lib/campaigns.js — USE_MOCK/VITE_CAMPAIGNS_BACKEND flag and the
  webhook branch of getSourcedCampaigns(); campaignsAreSample is now
  simply true (campaign definitions are always seeded + native writes).
- src/components/home/agency-console.jsx — the 'campaigns' row from the
  Integration Health SEAMS table and its SEAM_PINGS probe (same rationale
  the file already documents for excluding CRM: a build-flag-only badge
  for a seam with no real backend left just adds noise).
- MAKE_CAMPAIGNS_WEBHOOK_URL and VITE_CAMPAIGNS_BACKEND from .env.example.

Updated for accuracy: docs/ENV_VARS.md, docs/INTEGRATION_WIRING_BRIEF.md,
docs/LAUNCH_AND_MAINTENANCE.md, docs/CRM_CONNECTOR.md,
docs/INTEGRATIONS_PLAN.md, netlify.toml comment, and CLAUDE.md (new
2026-09-20 Remember entry). There is no Make.com integration left
anywhere in this app.

Verified: eslint clean (0 errors, pre-existing warnings only, none in
touched files), vite build clean (2060 modules).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hpo6A1iuV4bWPRB9LuZxvK"
commit_result=$?

echo
if [ $commit_result -ne 0 ]; then
  echo "⚠️  Commit failed (exit code $commit_result) — nothing was pushed. Take a screenshot of this window and send it back."
  echo
  read -n 1 -s -r -p "Press any key to close this window…"
  echo
  exit 1
fi

git push origin phase-2-6-build
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Committed and pushed. Netlify is building now — live in ~1–2 minutes."
  echo "   Check: https://app.netlify.com/sites/cheeseshoptech-platform/deploys"
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
