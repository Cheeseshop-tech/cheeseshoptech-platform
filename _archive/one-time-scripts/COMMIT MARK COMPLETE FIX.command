#!/bin/bash
# Double-click this file to commit and push: the "Mark complete" checklist-gate fix, plus the
# housekeeping archive of the already-run campaign comments/status commit script.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the Mark complete fix (and archiving the earlier commit script)…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "src/lib/campaigns.js" \
  "_archive/one-time-scripts/COMMIT CAMPAIGN COMMENTS STATUS AND ARCHIVE.command" \
  "COMMIT MARK COMPLETE FIX.command"

git commit -m "fix(campaigns): Complete is never blocked by the launch-readiness checklist

Rick (2026-09-21), right after the comments/status/archive build shipped:
'in all campaigns there is no complete button to retire a campaign.'

Cause: canAdvanceTo() gated every status at or past 'ready' — including
'complete' — behind every REQUIRED checklist item being done. That gate
makes sense for 'ready' and 'launched' (don't claim you're set to send
when you're not), but it also silently disabled the Complete pill on any
real campaign whose checklist was never 100% ticked — which, in
practice, was all of them. There was no way to retire/close a campaign
that was cancelled, superseded, or just never checklist-managed that
tightly, which defeated the Mark complete + Past Campaigns flow shipped
minutes earlier.

Fix: 'complete' is now exempt from the readiness gate — retiring a
campaign is a wrap-up action, not a launch-readiness claim, so it's
always allowed (write access permitting). 'ready' and 'launched' keep
the exact same gate as before; nothing else changed.

Also folds in the housekeeping move (already staged, unpushed) of the
earlier COMMIT CAMPAIGN COMMENTS STATUS AND ARCHIVE.command into
_archive/one-time-scripts/, since it already landed (verified HEAD ==
origin/phase-2-6-build @ 9699975 before archiving it).

Verified: eslint clean (0 errors, none in this file), vite build clean
(2060 modules transformed) — the only build failure is the sandbox's
pre-existing dist/.DS_Store permission quirk, unrelated to this change.

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
