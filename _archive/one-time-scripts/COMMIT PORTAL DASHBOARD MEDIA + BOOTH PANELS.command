#!/bin/bash
# Double-click to commit + push: priority-1 dashboard work — Media Hub tagging completeness
# (Integration health + Data pipelines) and a new Booth -> HubSpot activity panel.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/home/agency-console.jsx"

git commit -m "feat(dashboard): media tagging completeness + booth->hubspot activity panel

Priority item 1 of Rick's 2026-09-03 roadmap (\"portal dashboard reflecting the
live feed for every app\" - AskUserQuestion answer: health + live data snapshot,
combined). Agency Console already had most of this shape built (IntegrationPanel's
SEAM_PINGS probes + PipelinePanel's per-tenant table), so this closes the two real
gaps rather than building a parallel dashboard:

- Media Hub (priority item 3, \"tagged and described\") had no completeness signal
  anywhere - IntegrationPanel's media probe just said \"reachable\", and
  PipelinePanel's \"Catalog images\" column counts buyer-catalog picks, not the raw
  asset library. Both now report tagged-and-described counts: the Integration
  health Test button's detail string now reads \"N assets - M tagged & described\"
  (was a bare reachability check, paged=1&max_results=1 -> full mode so the count
  is real), and Data pipelines gets a new \"Media tagged\" column per tenant
  (complete/total, badge flags anything short of fully tagged). Both hit
  media-list.js directly, same pattern as the existing SEAM_PINGS probes - no new
  backend, no role filtering (this console is house-only already, same posture as
  every other panel here).

- Booth -> HubSpot (priority item 6) had no visibility at all. New Booth activity
  panel reads write-log.js (the house-admin audit trail crm-push.js already writes
  to on every real sync) and rolls it up per tenant: syncs and contacts pushed in
  the last 7 days, last sync time. Documented plainly in the panel description and
  the commit here: booth captures themselves live in localStorage on the rep's own
  device until they tap Sync (booth.js), so this can only ever show what already
  reached HubSpot - there's no server-side store of what's sitting unsynced on a
  phone at a show. That's a real gap, not something this panel papers over; it's
  flagged in cst-priority-roadmap-2026-09.md so a later session doesn't mistake
  \"activity panel exists\" for \"item 6 done.\"

Remaining priority-1 gaps after this (Product Catalog SKU-accuracy panel, Campaign
Manager accuracy/contact-tracking panel) are next, per cst-priority-roadmap-2026-09.md.
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
  echo "   New: 'Media tagged' column on Data pipelines, live asset count on the"
  echo "   Media integration-health row, and a new Booth → HubSpot activity panel"
  echo "   at the bottom of the Agency Console. Worth a quick look there."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
