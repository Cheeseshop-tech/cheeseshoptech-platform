# Handoff — Campaign Documents (2026-09-21)

**Spec:** `docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md`

## What shipped

1. **`netlify/functions/media-upload-sign.js`** — new `campaign-document` usage tag; accepts an
   optional `campaignId`, validated and written into Cloudinary's `context` (mirrors how `sku`
   is already handled — an exact link, not a tag).
2. **`src/lib/cloudinary.js`** — new `uploadDocument()`, a signed upload (same auth model as
   `uploadAsset()`, deliberately NOT `uploadFileAuto()`'s older unsigned-preset path) targeting
   Cloudinary's `raw` resource type for non-image files.
3. **`netlify/functions/campaign-state.js`** — new `documents` array in the per-campaign state
   shape, sanitized the same way `comments` is: capped at 30, every field length-bounded, `url`
   validated as an actual `res.cloudinary.com` link before it's ever trusted.
4. **`src/lib/campaigns.js`** — `mergeCampaign()` now includes `documents: state.documents || []`
   on the merged campaign object.
5. **`src/components/campaigns/campaign-detail.jsx`** — new "Documents" section (between
   "Content & approvals" and "Target prospects"), `DocumentsPanel` component: upload button,
   list of attached documents (name/link, format, size, who/when, remove), `addDocument`/
   `removeDocument` handlers wired through the existing `onPatch` autosave.

Verified: `eslint` on all five touched/new files — 0 errors (same 4 pre-existing warnings
elsewhere in campaign-detail.jsx, unrelated). `vite build` — transform stage succeeded (2061
modules, 0 errors); build then hit the same pre-existing sandbox `.DS_Store` unlink permission
quirk documented in `CLAUDE.md`, not a code issue. No test framework in this repo, so no
runtime/live-data verification pass was possible for the upload itself the way earlier
sessions verified pure-logic changes — worth Rick trying one real upload after this deploys to
confirm the signed-upload round trip works end to end in production.

## Reconciling with the 2026-08-03 "one front door" rule

Flagged this directly with Rick before building rather than guessing: his own standing rule
said direct uploading outside the Media Hub was a mistake. Asked, and he chose to upload
directly from inside the campaign anyway — but wired through the exact same signed Cloudinary
path and tagging system the Media Hub itself uses, so there's still one physical store and the
file shows up in the Media Hub's Documents tab too. Not a second upload system living next to
the first.

## Not done — flagged for later

- The Media Hub's own Upload button still can't start a document upload (hardcoded to images
  only) despite already having a Documents tab. This build didn't touch that — campaign
  documents got their own working path instead.
- No campaign filter in the Media Hub's Documents view, even though `campaignId` is now being
  captured and stored on every campaign document upload.
- Removing a document from a campaign never deletes the Cloudinary asset — intentional (keeps
  one delete authority, in the Media Hub), but worth Rick knowing so an "Upload document" click
  by mistake doesn't get treated as free storage cleanup later.
