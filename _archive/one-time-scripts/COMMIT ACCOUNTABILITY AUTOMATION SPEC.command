#!/bin/bash
# Double-click this file to commit and push: the spec for the next phase — Stefano's role,
# progress-tracking automation, and draft-and-review campaign nudge emails. Docs only, no app code.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the Campaign Accountability Automation spec…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "docs/CAMPAIGN_ACCOUNTABILITY_AUTOMATION_SPEC_2026-09-21.md" \
  "COMMIT ACCOUNTABILITY AUTOMATION SPEC.command"

git commit -m "docs(campaigns): spec the next phase — Stefano role, progress tracking, nudge emails

Rick (2026-09-21): the first round of campaigns were process-development
exercises; now ready for automation that tracks progress, loops Stefano
into the process, and sends automated emails to keep commitments moving.
Asked 4 scoping questions before writing any code, per his own
plan-before-build preference — answers captured here:

- Stefano's role: upgrade client -> client-admin. He already has a real
  Identity login (invited + accepted 2026-08-17, docs/PROJECT_ROADMAP.md)
  but 'client' is read-only in _write-guard.js — he can't check off an
  approval item or comment until this changes. Not code: a Netlify
  Identity -> Users role click.
- Email triggers: all four — approval-needed, stalled-campaign,
  deadline-approaching, weekly-digest. All computable from data the app
  already has (checklist 'approval' items, state.updatedAt, def.end) —
  nothing new to instrument.
- Automation level: draft-and-review for v1, not fully automatic —
  mirrors the caution already exercised once on this exact question
  (cst-daily-accountability-system: daily-status-email kept
  Rick-prompted, not auto-sent).
- In-app panel: yes, a shared 'Commitments' view for Rick + client-admin
  (Stefano), same pattern as the Agency Console's ProjectStatusPanel.

Architecture fits the existing scheduled-task -> publish-script ->
Netlify-function -> Blobs -> panel pattern from
docs/DASHBOARD_AUTO_UPDATE_ARCHITECTURE.md (instance #5), plus one new
piece: a draft-email review queue between 'computed' and 'published'.

One open question flagged, not resolved here: the actual email-sending
mechanism (Netlify Emails extension vs. Gmail MCP browser-driven) —
recommended asking Rick directly before building either path, rather
than defaulting silently.

Phased build plan: (1) Stefano's role bump, (2) pure computation layer,
(3) the panel, (4) the draft-and-review email queue once the sending
mechanism is picked. Nothing past this spec is built yet.

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
