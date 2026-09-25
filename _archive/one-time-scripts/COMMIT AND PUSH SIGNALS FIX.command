#!/bin/bash
# Double-click this file to commit and push a small caching fix for the Opportunities card.
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the signals cache fix (this is what makes Netlify deploy it)…"
echo

# Self-heal any stranded lock first (harmless if none exist).
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add src/lib/signals.js
git commit -m "signals: force cache: no-store on the live signals-list fetch

Belt-and-suspenders fix found while live-testing the Opportunities card:
the Netlify function already sends Cache-Control: no-store, but the
app's own fetch() didn't request it explicitly, which left a
theoretical window for a stale cached response to linger in the
browser after a fresh publish. No behavior change when the cache is
already cold."

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
