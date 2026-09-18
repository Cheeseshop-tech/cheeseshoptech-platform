#!/bin/bash
# Double-click to commit + push: add Pennsylvania (5 largest cities) to the ACE Fall Show —
# Sales Rep & Prospect Alignment campaign, reflected automatically in the Booth app's scope.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/campaigns.js" \
  "src/components/tools/booth-tool.jsx" \
  "COMMIT ACE FALL SHOW ADD PENNSYLVANIA.command"

git commit -m "feat(campaigns): add PA (5 largest cities) to ACE Fall Show footprint

Rick, 2026-09-03: \"add pennsylvania the 5 largest towns including Philly\" to the
ACE Fall Show - Sales Rep & Prospect Alignment campaign, and make sure it shows up
in the booth-to-meeting app too.

PA is added as a 6th state on the campaign, but unlike NY/NJ/RI/MA/CT (each
included in full), it's scoped down to just its 5 largest cities by population -
Philadelphia, Pittsburgh, Allentown, Reading, Erie (apartmentlist.com /
areavibes.com, 2026-09-03) - since PA is wide and mostly rural outside those
metros. segmentOf() gets a new cityAllowlist layer for this: most states in
filter.states still match in full, exactly as before; a state is narrowed to
specific cities only when it has its own entry in cityAllowlist. This is a real
audience filter, not a display-only grouping like the existing Long Island / NYC
boroughs sub-regions (those don't narrow who gets called - PA's allowlist does).

2026-09-03 HubSpot count: 23 PA accounts in Philadelphia/Pittsburgh/Reading (of 33
total PA accounts in the CRM - 10 excluded for sitting outside the 5 target
cities). Campaign audience size updated 229 -> 252. Flagged directly in the code
comment and worth Rick's attention: the excluded 10 include real large accounts -
Weis Markets (Sunbury), The Giant Company (Carlisle), Acme Markets (Malvern) - all
big regional grocery chains that fall outside the 5-city filter purely because of
where they're listed, not because they're small. If those should be in scope too,
this needs a different approach (e.g. by chain/size, not city) - flagged rather
than silently included or excluded.

Booth app: no code change needed there. booth-tool.jsx's territory Scope picker
already calls the same segmentOf()/scopeOf() this campaign feeds
(deliberately shared vocabulary, see the file's own top-of-file comment), so PA
shows up in the booth Scope picker and territory drill-down automatically once
this ships - verified by reading the call site, not just asserting it. Only
touched one stale code comment there (\"5-state ACE list\" -> \"ACE list\").

Build-verified (2057 modules, vite build clean)." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01Sq1wRxnhf47JQvPZExUG6Z"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "   PA (Philadelphia/Pittsburgh/Allentown/Reading/Erie) now shows up on the ACE Fall"
  echo "   Show campaign's Target Prospects list AND in the Booth app's territory Scope"
  echo "   picker. Worth a look: some real chains (Weis Markets, Giant, Acme) got excluded"
  echo "   just because their HubSpot city isn't one of the 5 biggest — see commit message."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
