#!/bin/bash
# COMMIT QUOTE VALIDITY SNAPSHOT — wholesale Phase 1 (quote validity + price snapshot)
# Double-click to commit and push. Closes wiring-audit P0 #5 (proposal price-drift).

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Quote validity + price snapshot"
echo " (wholesale Phase 1 · audit P0 #5)"
echo "=============================================="
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "src/lib/proposals.js" \
  "src/components/proposals/proposal-builder.jsx" \
  "src/components/proposals/proposal-view.jsx" \
  "src/components/tools/pricing-tool.jsx" \
  "docs/WIRING_AUDIT_2026-07-15.md" \
  "docs/WHOLESALE_ORDERING_WORKFLOW_SPEC.md" \
  "docs/BUILD_LOG.md" \
  "COMMIT QUOTE VALIDITY SNAPSHOT.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "Quote validity + price snapshot (wholesale Phase 1, audit P0 #5)

- Proposal record gains validUntil (rep-specified, NO default window) and
  priceSnapshot (per-SKU prices + basis/tier frozen at share time)
- Buyer view renders snapshot while valid ('Valid until <date>'); after the
  date shows 'quote expired — request updated pricing'; legacy links unchanged
- Proforma print requires a valid-until date, shows it in the meta block and
  footer (replaces hardcoded 'Quote valid 30 days')
- Never a silent reprice"
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo "   If it says 'nothing to commit', this work may already be committed."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   Check your connection, then double-click 'FIX GIT LOCK AND PUSH.command'"
  echo "   (or re-run this file) to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Quote validity + price snapshot is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
