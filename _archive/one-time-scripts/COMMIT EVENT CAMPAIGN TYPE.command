#!/bin/bash
# Double-click this file to commit and push: adds "Trade Shows & Events" as a full campaign type,
# built from the Campaign Template .docx Rick uploaded (ACE Fall Show 2026 post-mortem template).
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the Trade Shows & Events campaign type…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "src/lib/campaigns.js" \
  "netlify/functions/campaign-defs.js" \
  "src/components/campaigns/campaigns-page.jsx" \
  "src/components/campaigns/new-campaign-form.jsx" \
  "src/components/campaigns/campaign-detail.jsx" \
  "_archive/one-time-scripts/COMMIT MARK COMPLETE SAVE RELIABILITY.command" \
  "COMMIT EVENT CAMPAIGN TYPE.command"

git commit -m "feat(campaigns): add Trade Shows & Events campaign type + Standing Lessons

Built from the 'Campaign Template .docx' Rick uploaded (2026-09-21) — an
Industry Show / Campaign Planning template written from the ACE Fall Show
2026 post-mortem. Rick's call: (1) add it as a new campaign type, (2) wire
its 'Standing lessons' into the Mark-complete wrap-up flow, (3) fold its
checklist into the existing checklist templates too.

src/lib/campaigns.js:
- New 'event' entry in CAMPAIGN_TYPES ('Trade Shows & Events').
- New 'event' checklist template in CHECKLIST_TEMPLATES, translating the
  doc's structure: a required 'Workstreams' group (the 6 rows from the
  Planned workstreams table), a required 'Pre-event checklist' group
  (arrival time, promo sign-off, capture-tool tested, recap tested — the
  4 checklist items that don't already overlap with the shared Discipline
  block below), and a non-required 'Day-of & wrap-up' group (day-of log,
  results, gap analysis captured).
- New shared DISCIPLINE_ITEMS block (one tracking system, owner +
  checkpoint, fallback for must-make connections, tested end-to-end),
  distilled from the doc's 5 Standing Lessons and appended to ALL FOUR
  checklist templates (email/social/enrichment/event), not just event.
  Left non-required by Rick's call: required would have retroactively
  flagged every already-launched campaign as 'not ready' the moment this
  shipped, which is a false alarm on live campaigns, not a real gap — so
  these are visible, checkable reminders rather than a launch-gate
  blocker.
- New STANDING_LESSONS export — the doc's 5 lessons, near-verbatim.

netlify/functions/campaign-defs.js: added 'event' to the server-side
TYPES allowlist so a Trade Shows & Events campaign can actually be
created through the New Campaign form (was previously a silent 400).

campaigns-page.jsx / new-campaign-form.jsx: added a Tent icon mapping
for the new type's pill + New Campaign form.

campaign-detail.jsx: CompleteDialog (Mark complete) now shows the 5
Standing Lessons in a collapsible reference above the wrap-up note, so
they're reviewed at close-out time on any campaign, not just events —
per Rick's 2nd selected option.

Also archives COMMIT MARK COMPLETE SAVE RELIABILITY.command — confirmed
landed at e57f2e1 (verified HEAD == origin/phase-2-6-build before this
change); today's re-run correctly found nothing new to commit.

Verified: eslint clean (0 errors, 5 pre-existing unrelated warnings),
vite build clean (2060 modules transformed).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
commit_result=$?

echo
if [ $commit_result -ne 0 ]; then
  echo "⚠️  Commit failed (exit code $commit_result) — nothing was pushed. Take a screenshot of this window and send it back."
  echo
  read -n 1 -s -r -p "Press any key to close this window…"
  echo
  exit 1
fi

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
