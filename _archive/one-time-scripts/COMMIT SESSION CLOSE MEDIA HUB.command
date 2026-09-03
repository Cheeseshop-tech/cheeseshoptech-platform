#!/bin/bash
# Double-click to commit + push: session-close docs (BUILD_LOG + HANDOFF, Media Hub items session).
# Safe to run AFTER the three feature buttons; also fine standalone — it only adds docs.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "docs/MEDIA_HUB_ITEMS.md" \
  "COMMIT SESSION CLOSE MEDIA HUB.command"

git commit -m "docs: session close 2026-07-03/04 — Media Hub = item truth

- BUILD_LOG: 2026-07-04 entry (item records + Cloudinary items.json, spec line
  + PNG/share, 71-SKU seed, tag-driven fields + production tag, env verified,
  commit-button standing rule, open items)
- HANDOFF: updated header + MEDIA HUB = ITEM TRUTH section with pending commit
  buttons and next wiring steps (descriptionFor consumers)"

echo
echo "Pushing…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Docs pushed."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
