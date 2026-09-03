#!/bin/bash
# Double-click to commit + push: write-action audit log for the write-guard endpoints.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/_write-log.js" \
  "netlify/functions/write-log.js" \
  "netlify/functions/media-update.js" \
  "netlify/functions/media-delete.js" \
  "netlify/functions/items-save.js" \
  "docs/BUILD_LOG.md" \
  "docs/TRUST_BY_DESIGN_REVIEW_2026-07-07.md"

git commit -m "feat(security): write-action audit log for the write-guard endpoints

_write-guard.js (2026-07-06) stops an unauthorized write but records nothing about who did an
authorized one, or who tried and failed — no visibility, per the trust-by-design review
(docs/TRUST_BY_DESIGN_REVIEW_2026-07-07.md, measured against Superhuman's AI-trust framework).

- _write-log.js (new, helper): logWrite(event, entry) appends {ts, ip, fn, ok, role, status,
  action, tenant?} to a capped array (last 500) in Netlify Blobs (store 'write-log') — same
  pattern as inventory.js/inventory-publish.js, no new infra or secret. Never throws — logging
  can't block or fail the write it describes. tenantFromPath() best-effort guesses the tenant
  from a clients/<tenant>/... publicId or folder.
- write-log.js (new): GET endpoint to read the log, newest first. House-admin passcode only
  (role === 'admin') via the existing requireWriteAuth — CST's cross-tenant trail, not a
  client-facing feature.
- media-update.js / media-delete.js / items-save.js: log on auth failure (fn, ok:false, status)
  and on success (fn, ok:true, role, action, tenant).

BUILD_LOG.md: added a STANDING RULE block (pinned, next to the CANONICAL FACT) — every new
write/mutating Netlify function must call logWrite(), no exceptions for 'small' endpoints.

Known gaps, acceptable at one tenant: no UI for write-log.js yet (curl/Postman only); single
Blobs key (no concurrency protection, fine at this volume); client-admin can't read their own
tenant's log yet (house-only by design). Passcode auth itself is still the documented pilot
stopgap — Clerk migration should land before client #2."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "⚠️  Test after deploy: trigger a Media Hub edit, then GET /.netlify/functions/write-log"
  echo "    with your house passcode in x-portal-passcode — you should see the entry."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
