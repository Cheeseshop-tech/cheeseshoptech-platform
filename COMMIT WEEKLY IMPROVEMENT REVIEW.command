#!/bin/bash
# Double-click to commit + push: weekly improvement review now publishes to the house Command Center.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  ".gitignore" \
  "CLAUDE.md" \
  "docs/BACKLOG.md" \
  "docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md" \
  "docs/DASHBOARD_AUTO_UPDATE_ARCHITECTURE.md" \
  "src/components/home/agency-console.jsx" \
  "src/data/cst/improvement-review.json" \
  "netlify/functions/improvement-review.js" \
  "scripts/publish-improvement-review.mjs" \
  "COMMIT WEEKLY IMPROVEMENT REVIEW.command"

git commit -m "feat(command-center): weekly improvement review publishes live, no rebuild

- netlify/functions/improvement-review.js: house-admin-only GET/POST, Netlify Blobs
  (latest + capped 26-entry history), reuses AGENT_GATE_PASSCODE via _write-guard.js —
  no new per-feature secret
- scripts/publish-improvement-review.mjs: reads src/data/cst/improvement-review.json,
  POSTs to the function (mirrors publish-inventory.mjs / publish-market-news.mjs)
- Agency Console: new 'Weekly improvement review' panel (shelf-life tiles, recommended
  next batch, blocked items, history dialog) — same tier/style as the login/write logs
- weekly-improvement-review scheduled task: Part 2 added — composes the structured
  review and runs the publish script after its usual chat report; never lets a publish
  failure cost Rick the weekly read
- docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md: full pipeline + one-time setup
- docs/DASHBOARD_AUTO_UPDATE_ARCHITECTURE.md: formalizes the pattern behind this + inventory/
  market-news/campaign-state, flags the legacy-secret and shared-helper follow-ups
- BACKLOG.md / CLAUDE.md: logged the change and the one remaining manual step

One-time setup still needed before this goes live (see the doc): create
scripts/.improvement-review-publish.json (gitignored) with the AGENT_GATE_PASSCODE value."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "NOTE: the Command Center panel will show 'No review published yet' until you create"
  echo "      scripts/.improvement-review-publish.json — see docs/WEEKLY_IMPROVEMENT_REVIEW_AUTOMATION.md."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
