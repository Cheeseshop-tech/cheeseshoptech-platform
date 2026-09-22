#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/media/media-document-picker.jsx" "src/components/campaigns/campaign-detail.jsx" "COMMIT MEDIA HUB DOCUMENT PICKER.command"
git commit -m "Add a Media Hub picker to campaign Documents, for attaching existing assets

Rick: \"the campaign template needs a media hub image selector for documents.\"

Documents could previously only grow by uploading a brand-new file each
time, even for a spec sheet or sell sheet that already lives in the Media
Hub. New \"Add from Media Hub\" button opens a multi-select browser (photos
AND documents both shown, filterable by the same content tabs and approval
badges the Media Hub itself uses -- confirmed with Rick: not documents-only,
and multiple at once, not one at a time) and attaches picked assets straight
to the campaign -- no re-upload, no duplicate Cloudinary copy.

New component (media-document-picker.jsx) rather than reusing <MediaPicker>:
that one is a single-image \"slot\" that deliberately EXCLUDES kind:\"document\"
assets (see its own comment: a photo slot, never a document slot). This one
needed the opposite on both counts -- documents included, several pickable
at once -- so it's its own component, not a retrofit of one built for a
different job.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
