#!/bin/bash
# Pass 4 — state filter + live result counters in the outreach console. Push after committing.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock
git reset -q

echo "Staging..."
git add \
  src/lib/crm.js \
  src/components/crm/crm-page.jsx \
  "COMMIT PASS 4 REGION STATE COUNTERS.command"

echo "Committing..."
git commit -m "feat(crm): state filter + account counters on every query

- New State dropdown next to Region, using stateOf() (new export from
  crm.js) so 'NJ' and 'New Jersey' count as one state.
- Region and State dropdown options each show their account total inline
  ('NY Metro (152)', 'NJ (37)') — the counter exists before the query runs.
- Always-visible result counter line under the controls: 'N accounts match
  this query · M total', echoing the active region/state.
- Search/filter/sort changes still reset pagination to page 1.

Verified: esbuild JSX compile + stateOf()/regionOf() unit checks.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017hEScbCoKJY28Po86fWj7h"

if [ $? -eq 0 ]; then
  echo "✅ Pass 4 committed. Run PUSH ALL PASSES (or git push) to deploy."
else
  echo "❌ Commit failed — see error above."
fi
echo ""
echo "Press any key to close..."
read -n 1
