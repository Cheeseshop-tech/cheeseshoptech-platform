#!/bin/bash
# Double-click this file to commit and push: campaign comments, open/closed status, a
# "Mark complete" wrap-up flow, and the Past Campaigns review record.
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing Campaign Management: comments, open/closed, mark complete, past campaigns…"
echo

# Self-heal any stranded lock first (harmless if none exist).
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "netlify/functions/campaign-state.js" \
  "src/lib/campaigns.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "src/components/campaigns/campaigns-page.jsx" \
  "COMMIT CAMPAIGN COMMENTS STATUS AND ARCHIVE.command"

git commit -m "feat(campaigns): comments, open/closed status, mark-complete wrap-up, past campaigns archive

Rick (2026-09-21): with campaigns in flight, wanted a comment log, an
open/closed status, an update-and-complete action, and a record of past
campaigns to review for future campaign ideas. This is item 4 on the
2026-09-03 priority roadmap ('Campaign Manager — accurately organizing
campaigns... and project tracking').

Built on the existing 5-stage lifecycle (draft/building/ready/launched/
complete) rather than adding a second status field — 'closed' is simply
status === 'complete'; everything else is 'open' / in flight.

netlify/functions/campaign-state.js:
- New per-campaign 'comments' array in the state document — a shared,
  timestamped update log, separate from the existing per-checklist-item
  notes. Sanitized like every other field here (bounded count/length,
  known keys only, ID_RE-validated ids).
- New 'closedAt' field, set once a campaign first reaches 'complete' —
  a stable sort key for the archive, distinct from 'updatedAt' (which
  keeps moving on any later edit).

src/lib/campaigns.js:
- isClosed(c) helper (status === 'complete') and mergeCampaign() now
  carries comments/closedAt through to the UI.

src/components/campaigns/campaign-detail.jsx:
- New 'Updates' section: post a dated comment, see the running log,
  newest first. Anyone with write access can post; author is read off
  the signed-in session the same way the rest of the app attributes
  writes.
- 'Mark complete' is no longer a bare status click: reaching Complete
  now always opens a small dialog asking for a short wrap-up note (what
  worked, what to change next time) before it closes the campaign. The
  note is optional but the prompt isn't skippable — it's the fix for
  wrap-up thinking that otherwise never gets written down. Every other
  status move is untouched (still the plain pill row, ungated below
  Ready, gated at Ready exactly as before).
- Closed campaigns show their close date in the header.

src/components/campaigns/campaigns-page.jsx:
- The Email/Social/Enrichment pills now only list OPEN campaigns —
  'campaigns in flight', as Rick put it. A new 'Past campaigns' pill
  (next to New campaign) lists every closed campaign, all types
  together, newest-closed first — the review record: each card leads
  with its wrap-up note, plus final results and comment count, and
  opens into the same full detail view as any other campaign.

Verified: eslint clean (0 errors — pre-existing warnings only, none in
touched files), vite build clean (2060 modules transformed).

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
