#!/bin/bash
# Double-click this file to commit and push: document uploads (special offers, spec sheets,
# etc.) attached directly to a campaign in Campaign Management, filed through the Media Hub.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing campaign documents…"
echo

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add \
  "netlify/functions/media-upload-sign.js" \
  "netlify/functions/campaign-state.js" \
  "src/lib/cloudinary.js" \
  "src/lib/campaigns.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-21_campaign-documents.md" \
  "COMMIT CAMPAIGN DOCUMENTS.command"

git commit -m "feat(campaigns): document uploads in Campaign Management

Rick, 2026-09-21: \"lets update the campaign managment draft campaign
to allow uploads of documents so special offers or other docs relevent
to campaign goals can be loaded and accessable with in the campaign
managment tool.\"

This ran into Rick's own 2026-08-03 rule (\"direct uploading in the
content library is a mistake... one front door, the Media Hub\").
Asked directly how to reconcile it: upload from inside the campaign,
but filed through the exact same signed Cloudinary path/store the
Media Hub uses — one physical store, no duplicate upload system. No
approval workflow (his call) — reference material, not content
pending review, a plain per-campaign list next to comments/results.

New: campaign-state.js documents array (sanitized like comments —
capped at 30, URL-validated against res.cloudinary.com). New:
cloudinary.js uploadDocument() — a SIGNED upload (2026-09-17 auth
model, not the older unsigned uploadFileAuto() path) targeting
Cloudinary's raw resource type. media-upload-sign.js gets a new
campaign-document usage tag and an optional campaignId context field
(same relationship sku already has to a product). campaigns.js's
mergeCampaign() surfaces the new documents array. campaign-detail.jsx
gets a new Documents section + DocumentsPanel (upload button, list,
remove-from-campaign — does not delete the underlying file, keeps one
delete authority in the Media Hub).

Flagged, not fixed here: the Media Hub's own Upload button still can't
start a document upload (hardcoded to images only) despite already
having a Documents tab; no campaign filter in the Media Hub's
Documents view yet even though campaignId is now captured on upload.

Verified: eslint clean (0 errors, same 4 pre-existing unrelated
warnings). vite build transform stage clean (2061 modules, 0 errors) —
hit the same pre-existing sandbox .DS_Store unlink quirk documented in
CLAUDE.md, not a code issue. No test framework in this repo, so no
live-data verification pass was possible for the upload round trip
itself — worth trying one real upload after this deploys.

Full writeup: docs/HANDOFF_2026-09-21_campaign-documents.md
Spec: docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md

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
