#!/bin/bash
# Double-click to commit + push the wholesale ordering workflow spec.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  [ -f "$lock" ] && rm -f "$lock" && echo "Cleared stale $lock"
done

git add "docs/WHOLESALE_ORDERING_WORKFLOW_SPEC.md" "COMMIT WHOLESALE WORKFLOW SPEC.command"

git commit -m "docs: wholesale ordering workflow spec — portal catalog, not ecomm

Direction set by Rick 2026-07-16: per-customer price levels + PO submission
evolve inside the portal catalog; Storefront/ecomm reserved for future D2C.
Key record: customer pricing profile (tier, margin override, freight) in the
pricing domain, joined by customer name. Phases: 1 proforma valid-before +
snapshot, 2 buyer email gate, 3 pricing profiles + catalog price levels,
4 PO submission -> pipeline stages."
if [ $? -ne 0 ]; then
  echo "⚠️  Commit failed — nothing pushed."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

git push
if [ $? -eq 0 ]; then
  echo "✅ Committed and pushed."
else
  echo "⚠️  Push failed — try 'FIX GIT LOCK AND PUSH.command'."
fi
read -n 1 -s -r -p "Press any key to close…"
