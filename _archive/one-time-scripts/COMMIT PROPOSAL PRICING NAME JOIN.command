#!/bin/bash
# Double-click to commit + push the Proposals / Pricing Tool name-source fix
# (wiring-audit P1 #6: items.js-preferred name join, catalog.json fallback).

cd "$(dirname "$0")" || { echo "FAILED: could not cd to repo"; read -n 1 -s -r -p "Press any key to close..."; exit 1; }

echo "Repo: $(pwd)"
echo

git add \
  "src/lib/use-items-doc.js" \
  "src/lib/proposals.js" \
  "src/components/proposals/proposal-builder.jsx" \
  "src/components/proposals/proposal-view.jsx" \
  "src/components/tools/pricing-tool.jsx" \
  "docs/WIRING_AUDIT_2026-07-15.md" \
  "docs/BUILD_LOG.md"

git commit -m "Fix name-source drift in Proposals + Pricing Tool (audit P1 #6)

Join items.js (Media Hub item identity/copy) for product names, with
catalog.json name as the fallback for SKUs not yet in the items doc —
same pattern as studio-director.js (b386bf9). New use-items-doc.js hook;
skuDisplayName in proposals.js; all four pricing-tool tabs joined.
Pricing/pack-spec consumption of catalog.json untouched. Buyer-facing
proposal-view degrades to catalog names if the items fetch fails."

if [ $? -ne 0 ]; then
  echo
  echo "✗ COMMIT FAILED (nothing staged, or git error above). Nothing was pushed."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo
echo "Commit OK — pushing..."
git push

if [ $? -ne 0 ]; then
  echo
  echo "✗ PUSH FAILED — the commit exists locally but is NOT on GitHub."
  echo "  Fix the connection/auth and run this again (or use FIX GIT LOCK AND PUSH.command)."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo
echo "✓ SUCCESS — committed and pushed. Netlify will pick it up from GitHub."
read -n 1 -s -r -p "Press any key to close..."
