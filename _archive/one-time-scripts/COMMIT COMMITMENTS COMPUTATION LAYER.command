#!/bin/bash
# Double-click this file to commit and push: Phase 2 of the accountability automation spec — the
# pure computation layer (approval-needed / stalled / deadline-approaching). No UI yet.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the campaign commitments computation layer…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "src/lib/commitments.js" \
  "docs/CAMPAIGN_ACCOUNTABILITY_AUTOMATION_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-21_campaign-commitments-computation.md" \
  "_archive/one-time-scripts/COMMIT ACCOUNTABILITY AUTOMATION SPEC.command" \
  "COMMIT COMMITMENTS COMPUTATION LAYER.command"

git commit -m "feat(campaigns): commitments computation layer (Phase 2, no UI yet)

Rick decided the email-sending mechanism (2026-09-21): Gmail via Chrome,
sales@montitrentini-usa.com — same browser-driven pattern already used
for the daily-status-email idea, and for the same reason: the Gmail MCP
connector already serves live sales@ work, so driving Chrome instead
avoids touching that connection. Recorded in
docs/CAMPAIGN_ACCOUNTABILITY_AUTOMATION_SPEC_2026-09-21.md. This also
means the eventual send step is a live Rick/Claude-session action
working a review queue, not an unattended cron send — fits the
draft-and-review decision already made.

New: src/lib/commitments.js — computeCommitments(campaigns, opts), pure
function over mergeCampaign() output. Three categories (approval-needed,
stalled, deadline-approaching) plus a deduped 'all' for the future
digest, reusing data the app already has (checklist 'approval' items,
stateUpdatedAt, def.end, readinessOf()) rather than adding new tracking.
Closed campaigns excluded from every category.

Verified: eslint clean (0 errors), vite build transform stage clean.
No test framework in this repo, so verification was a standalone
reimplementation of the same logic run against the real live
montitrentini data (confirms the one genuinely-open campaign correctly
surfaces, all 4 closed ones correctly excluded) plus a synthetic case
exercising the approval branch and the 'ready campaigns aren't falsely
flagged' branch. Full writeup:
docs/HANDOFF_2026-09-21_campaign-commitments-computation.md.

Not wired into any UI yet (Phase 3) — this file isn't imported anywhere
yet, so it doesn't affect the live app at all. Phase 1 (Stefano's role
bump) is still outstanding on Rick's side, a Netlify Identity dashboard
click.

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
  echo "✅ Committed and pushed."
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
