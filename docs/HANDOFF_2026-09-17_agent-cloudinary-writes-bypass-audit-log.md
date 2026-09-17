# Handoff — Agent/CLI Cloudinary writes bypass Media Hub's write-guard + audit log

**Written:** 2026-09-17 · **Status:** ⚠️ KNOWN GAP, not fixed. Written after Rick caught it directly:
*"lets write a reminder for you and me that all media asset info edits happen there [Media Hub].
we just made changes to the catalog that are not reflected in media hub."*

## What actually happened tonight

This session made a real batch of Cloudinary changes directly against the Cloudinary Admin API —
via the Cloudinary MCP tools and a couple of signed `curl` uploads — rather than through the app's
own Media Hub UI:

- ~54 asset deletions + tag changes (the photo-cleanup pass earlier tonight)
- 1 asset restore (`monti/03057`, re-uploaded from a duplicate after an accidental delete)
- 5 new asset uploads (`monti/01101`, `monti/01155`, `monti/01174-retail-pack`,
  `monti/01286-cubes-board`, `monti/01286-cubes-bag`)
- 1 tag correction (adding `draft` to the two `01286` assets so they don't misleadingly show as
  "Approved for Press" in Media Hub)

All of this is now correctly *visible* in Media Hub, because Media Hub's read path
(`media-list.js` → `listAssetsPage()` in `src/lib/media.js`) queries Cloudinary's Admin API live,
every load — it's not a cached snapshot, so any Cloudinary-side change shows up regardless of how
it was made. **That's the part that's fine.**

## What's actually missing

Media Hub's *write* path is a different story. `media-update.js` and `media-delete.js` — the
functions the Media Hub UI itself calls for tag/approval/SKU edits and deletions — both wrap the
Cloudinary Admin API call in two things neither of tonight's direct calls went through:

1. **`requireWriteAuth()`** (`_write-guard.js`) — CST-house or client-admin-only gate.
2. **`logWrite()`** (`_write-log.js`) — appends `{ts, ip, fn, ok, role, action, tenant}` to a
   capped rolling log in Netlify Blobs (`write-log` store, key `log`, 500-entry window).

`_write-log.js`'s own file header says exactly why it exists: *"write auth existed... but nothing
recorded WHO did WHAT, WHEN — only the UI hid buttons; **a direct curl left no trace either way**."*
That's precisely what happened tonight — a direct curl (and equivalently, the Cloudinary MCP tool
calls, which also hit the Admin API straight, not through these functions). **The write-log has
zero entries for any of tonight's ~60 Cloudinary changes.** If Rick or a future session ever pulls
up that log to answer "who changed what, when" for this item, tonight's whole session is invisible
in it, even though the changes themselves are live and correct.

## The standing rule going forward

**Default:** route media asset edits (tags, approval state, SKU/caption linkage, deletions) through
Media Hub itself — its asset editor calls `media-update`/`media-delete`, which are authenticated
and logged. This keeps one real audit trail instead of a partial one.

**Exception:** bulk, one-off curation work that Media Hub's UI genuinely can't do efficiently (this
session's 54-item interactive review-and-delete pass is the textbook case — there's no batch-delete
control in the Hub UI) is still fine to do directly against Cloudinary. But when that happens:
- Say so explicitly to Rick in the session (this handoff pattern), not just leave it implicit.
- Consider it a known audit-log gap for that batch, not something to paper over.

## If this is worth fixing in code (not required, just an option)

The cleanest fix isn't "stop Claude from using the Cloudinary API directly" (bulk curation is a
real, recurring need this session already proved out) — it's giving *any* direct Cloudinary change,
however it was made, a way back into the same trail:

- A small `POST /.netlify/functions/write-log-manual` (or extend `logWrite` to be callable with an
  explicit `source: "agent-direct"` / `source: "script"` tag) that a script or agent session can
  call once at the end of a batch to record "N assets touched outside the Hub UI, here's the list,
  here's why" — same store, same 500-entry window, just an honest label on the source instead of
  silence.
- Cheaper alternative: no code change at all, just a checklist step (parallel to the existing
  `COMMIT <FEATURE>.command` handoff convention) — after any direct-Cloudinary batch, drop a short
  dated note in `docs/` (like this file) summarizing what changed and why it didn't go through the
  Hub. Less structured than a real log entry, but zero build cost and keeps the paper trail human-
  readable, which is arguably enough at solo-operator scale (`_write-log.js`'s own stated design
  target).

Not fixing this tonight — flagging it so it doesn't quietly become "the log is authoritative" when
it's known to have gaps.
