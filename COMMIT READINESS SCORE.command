#!/bin/bash
# Double-click this file to commit and push the readiness-score feature (roadmap item 7, Step A/B).
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the readiness-score feature (this is what makes Netlify deploy it)…"
echo

# Self-heal any stranded lock first (harmless if none exist).
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add "netlify/functions/crm-outreach.js" "src/components/tools/booth-tool.jsx" "src/lib/readiness.js" "src/lib/opportunities.js" "src/components/home/command-center.jsx" "COMMIT READINESS SCORE.command"
commit_status=$?

git commit -m "feat(opportunities): wire booth readiness into the Opportunity Engine (roadmap item 7, Step A/B)

Closes the gap the 2026-09-19 account-to-campaign architecture note flagged
(stage 3 of the Clay ABM-loop mapping): rankOpportunities() used a crude
accountValue proxy (segment/activity/order-value guess) that made the same
signal win for every account in a segment every time.

Step A0 (netlify/functions/crm-outreach.js): booth.js already computes a
temperature (hot/warm/cold) and commitment weight (confirmed time / agreed
window / request sent) per capture, but they lived only in the capturing
device's localStorage — invisible to any other session. Extends the
per-tenant outreach overlay (same document booth's 'rep' field already
rides) to carry both, validated server-side against the same value sets
booth.js exports.

booth-tool.jsx: saveSheet() now mirrors a saved capture's temperature/
nextStepMode into that overlay via the same debounced write scheduleRep()
already used, keyed by companyId. Skipped for captures with no companyId
(a new prospect not yet in the CRM) — nothing to attach a score to yet.

src/lib/readiness.js (new): pure, deterministic readinessScore() — no AI,
no new data source. Recency-weighted temperature + commitment weight +
outreach-stage position (crm.js's OUTREACH_STAGES), 0..1. Lost/Not-a-fit
accounts score 0 outright regardless of how hot the last booth conversation
was before the loss — verified with a standalone script before shipping
(a stale 'hot, confirmed time' reading from a since-lost account was
initially scoring 0.8; fixed to gate on dead-stage first).

opportunities.js: rankOpportunities() takes an optional readiness map
{companyId: score}; when present for an account it replaces the legacy
accountValue proxy outright. Accounts with no booth/outreach history yet
(most of the CRM, still) fall through to the old proxy unchanged.

command-center.jsx: fetches getOutreach() alongside the existing CRM/
signals/campaign calls, builds the readiness map, passes it through. A
failed outreach read degrades to {} (existing null-safe pattern), never
throws.

Verified: eslint clean, vite build clean, readinessScore() spot-checked
against 7 hand-built cases via a standalone script before wiring it in."
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
