#!/bin/bash
# Double-click to commit + push: Market News auto-update wiring (live publish/read pair).
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/market-news.js" \
  "netlify/functions/market-news-publish.js" \
  "scripts/publish-market-news.mjs" \
  "scripts/publish_market_news.py" \
  "src/lib/market-news.js" \
  "src/data/montitrentini/market-news.json" \
  "src/components/home/market-news.jsx" \
  "src/components/home/agency-console.jsx" \
  "docs/MARKET_NEWS_AUTO_UPDATE.md" \
  "docs/BUILD_LOG.md" \
  ".env.example" \
  ".gitignore"

git commit -m "feat(intelligence): wire Market News for auto-updates (Slice 3 off mock)

The VITE_MARKETNEWS_BACKEND seam had nothing behind it - flipping it to 'function'
would have fetched a 404. Built the missing half, mirroring the inventory live-sync:

- market-news.js (read): Blobs -> {news, updatedAt}, read guard, falls back to the
  bundled sample so the card never empties
- market-news-publish.js (write): x-publish-secret, per-item validation, REFUSES an
  empty array so a failed overnight run can't blank a good brief; strips non-http(s)
  URLs and unknown keys (rows are machine-written and render as target=_blank links)
- publish-market-news.mjs + publish_market_news.py (python twin: no Node in the runner)
- getMarketNews() returns {items, isSample, updatedAt} - sample-ness is now a RUNTIME
  fact, not a build flag, so the chip can't show a false 'live' over sample rows
- card chip: 'Sample' vs 'Updated today'; agency console gains a real health probe
  where 'reachable, empty' means the nightly routine stopped running

Not live until MARKETNEWS_PUBLISH_SECRET + VITE_MARKETNEWS_BACKEND=function are set in
Netlify and the overnight routine calls the publish step - see docs/MARKET_NEWS_AUTO_UPDATE.md.
Build clean (2054 modules); publish->read round trip 15/15 against stubbed Blobs."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "   Remember: the card stays 'Sample' until the env vars + routine are set."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
