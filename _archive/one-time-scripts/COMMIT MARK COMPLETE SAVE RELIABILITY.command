#!/bin/bash
# Double-click this file to commit and push: Mark complete now forces an immediate save and
# reports failure instead of silently trusting the passive autosave debounce.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the Mark complete save-reliability fix…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "src/components/campaigns/campaign-detail.jsx" \
  "COMMIT MARK COMPLETE SAVE RELIABILITY.command"

git commit -m "fix(campaigns): Mark complete forces an immediate save, surfaces failure

Rick (2026-09-21): a campaign he'd marked complete was still showing as
in flight on the Home dashboard's 'Campaigns in flight' card. That card
(command-center.jsx) reads live status correctly on every load, so the
real problem is upstream: Mark complete only ever queued its write into
the page's normal ~900ms autosave debounce, same as any other edit. That
debounce is fine for incidental typing, but Mark complete is a one-time,
decisive action — if the write never actually reached Netlify Blobs
(tab closed a beat too soon, a flaky connection, a denied/expired
passcode), the dialog still closed as if it worked, and the campaign
silently never actually retired server-side. Nothing told Rick it
failed.

Fix, in campaign-detail.jsx only:
- confirmComplete() now awaits onSaveNow() (the same explicit flush the
  page's own 'Save now' button uses) right after patching status, and
  only closes the dialog once that write is confirmed.
- CompleteDialog shows 'Marking complete…' while it's in flight and, on
  failure, keeps the wrap-up note in place, shows why it might have
  failed, and swaps the button to 'Retry' instead of just closing.

Nothing else about the save model changed — every other edit on this
page (checklist ticks, other status moves, plain comments) still uses
the normal debounce, unchanged.

Verified: eslint clean (0 errors, none in this file), vite build clean
(2060 modules transformed).

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
