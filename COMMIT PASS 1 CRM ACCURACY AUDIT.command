#!/bin/bash
# Pass 1 of 3 — CRM accuracy audit (2026-07-24). Run passes in order, then push once.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

# Clear any stale git lock (safe if none exists — a sandbox session leaves one behind)
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock

# Isolate this pass: unstage everything, then stage ONLY this pass's files.
git reset -q

echo "Staging..."
git add \
  src/lib/crm.js \
  src/components/crm/crm-page.jsx \
  "COMMIT PASS 1 CRM ACCURACY AUDIT.command" \
  "COMMIT PASS 2 INVENTORY AUTOSYNC V2.command" \
  "COMMIT PASS 3 ASIAGO DESIGN ASSETS.command"

echo "Committing..."
git commit -m "fix(crm): region normalization, full-US regions, 13-channel audience map, 25-row pages

Accuracy audit of the outreach console (2026-07-24), three defects fixed:

1. regionOf() only recognized 2-letter state abbreviations. HubSpot's state
   field holds BOTH formats ('NJ' and 'New Jersey'), so spelled-out states
   fell through and displayed verbatim as their own fake regions — the same
   state split into two region buckets (5 'New Jersey' + 28 'NY Metro').
   Added STATE_ABBREV full-name normalization before the lookup; a state can
   never split again. Also expanded STATE_REGION past the East Coast now that
   the book is nationwide: Midwest, South Central, Mountain West, California,
   Pacific NW; non-US provinces (Trentino-Alto Adige, Piemonte) -> International.

2. CHANNEL_TO_AUDIENCE knew only the original 5 Channel values. The 2026-07-24
   HubSpot enrichment wrote 8 more (183 accounts are Cheese shop / Boutique
   grocery) and every unknown value returned null -> silently dropped from
   Opportunity Engine targeting. Map now covers all 13 live enum values.

3. Replaced the 300-row render cap with real pagination: PAGE_SIZE=25,
   Prev/Next pager, auto-reset to page 1 on search/filter/sort change.
   KPIs + funnel still compute over the full account book.

Verified: esbuild JSX compile + 43 unit checks on regionOf()/audienceOf()
(both state formats x all regions, all 13 channels, null/edge cases).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017hEScbCoKJY28Po86fWj7h"

if [ $? -eq 0 ]; then
  echo "✅ Pass 1 committed. Run PASS 2 next."
else
  echo "❌ Commit failed — see error above."
fi
echo ""
echo "Press any key to close..."
read -n 1
