#!/bin/bash
# Double-click to commit + push: Opportunity Engine Slice 3 (Market News card + promote-to-signal bridge).
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/data/montitrentini/market-news.json" \
  "src/lib/market-news.js" \
  "src/lib/signals.js" \
  "src/components/home/market-news.jsx" \
  "src/components/home/command-center.jsx" \
  "src/components/home/agency-console.jsx" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "FIX GIT LOCK AND PUSH.command" \
  "PUSH TO DEPLOY.command"

git commit -m "feat(intelligence): Market News card + promote-to-signal bridge (Slice 3, on mock)

- market-news.json (6 sample trade/consumer items) + lib/market-news.js seam (VITE_MARKETNEWS_BACKEND)
- MarketNewsCard on Command Center: Trade/Consumer tabs, morning-read rows, Sample chip
- House-only '-> Signal' promote: deterministic distill into a Tier 2 signal (localStorage overlay
  in signals.js, merged in getSignals) - promoted signals immediately re-rank Opportunities
- market-news row in agency-console SEAMS panel
- deploy scripts: FIX GIT LOCK AND PUSH.command + PUSH TO DEPLOY.command tracked"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
