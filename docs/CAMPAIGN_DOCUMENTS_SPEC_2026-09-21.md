# Campaign Documents — spec

**Date:** 2026-09-21 · **Status:** SPEC'D, BUILT · **Owner:** Rick Posada

## Why

Rick, 2026-09-21: "lets update the campaign managment draft campaign to allow uploads of
documents so special offers or other docs relevent to campaign goals can be loaded and
accessable with in the campaign managment tool." Every campaign starts life in the literal
`draft` status (`LIFECYCLE` in `src/lib/campaigns.js`) — the request applies to campaigns
generally, not a special draft-only mode.

This ran directly into a standing rule Rick set 2026-08-03: "direct uploading in the content
library is a mistake... one front door, the Media Hub." Asked directly how to reconcile that:

## Decisions made (2026-09-21, asked directly)

1. **Where uploading happens** → **inside the campaign, filed through the Media Hub.** Not a
   second upload system: a "Documents" section in Campaign Management uploads through the exact
   same signed Cloudinary path the Media Hub uses (`media-upload-sign.js`, admin/client-admin
   gated), so it's one physical store, one set of files. The document also shows up under the
   Media Hub's Documents tab, tagged `campaign-document`. This keeps Rick's "one front door"
   intent (one store, no duplicate copies) while still making documents reachable from inside
   the campaign, which is what he actually asked for.
2. **Workflow** → **a simple list, no approval step.** Reference material (a special-offer
   sheet, a spec doc) doesn't need to go through the submitted → posted/returned pipeline the
   Content Library's social posts and call scripts use. It's a plain per-campaign list: file
   name, who added it, when — living alongside `comments`/`results` in the campaign state
   overlay the same way those already do.

## What shipped

```
CampaignDetail "Documents" section → Upload document button
   │  file picked (PDF/DOCX/XLSX/PPTX/PNG/JPEG)
   ▼
src/lib/cloudinary.js  uploadDocument({file, tenantFolder, campaignId, displayName, tenantId})
   │  SIGNED upload (same 2026-09-17 auth fix as every other upload in this app — NOT the older
   │  unsigned uploadFileAuto() path some other features still use)
   ▼
netlify/functions/media-upload-sign.js
   │  requireWriteAuth() — admin/client-admin only
   │  resourceType: "raw" (already supported — this is how the Monti spec-sheet PDFs are signed)
   │  tags: campaign-document + draft (new USAGE_IDS entry)
   │  context: campaignId=<id>  — same relationship `sku` already has to a product; an exact-
   │  match link, not a tag, because campaign ids aren't a small fixed allowlist
   ▼
Cloudinary (raw/upload) — the file itself. Also visible in the Media Hub's Documents tab,
since it's the same store with the same tags any other upload gets.
   │
   ▼
CampaignDetail addDocument() → onPatch({documents: [...]}) → the existing debounced autosave
   ▼
netlify/functions/campaign-state.js  (documents array added to the per-campaign state object,
   sanitized the same way comments/results already are — capped at 30, Cloudinary-URL-validated,
   never trusts a client-supplied field beyond name/format/bytes)
   ▼
Netlify Blobs, per-tenant "campaign-state" store — read back on every page load via
mergeCampaign(), same document buyer/email/notes/comments already live in.
```

Removing a document from the campaign's list does NOT delete the underlying Cloudinary asset —
it only drops the pointer from this campaign's `documents` array (button title says so). The
file stays in the Media Hub; deleting it for real is still a Media Hub action, on purpose — one
delete authority, matching the "one front door" spirit of the original rule.

## Not done / flagged for later

- No drag-and-drop — a click-to-browse button only, matching the Media Hub's own upload button
  (which also has no drag-and-drop today).
- The Media Hub itself still can't actually START a document upload from its own UI (its Upload
  button is hardcoded to images only, despite having a "Documents" tab) — this build gave
  campaign documents their own working upload path rather than fixing that pre-existing gap.
  Worth fixing separately if Rick wants document uploads to also work by starting from the Media
  Hub directly.
- No Media Hub-side "which campaign is this for" filter yet — the `campaignId` context field is
  captured and stored, but nothing in media-hub.jsx surfaces or filters by it today. Small
  follow-up if useful once there's real volume.
