#!/bin/bash
# Double-click to commit + push: Cloudinary-rewrite endpoints now require CST/client-admin auth.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/_write-guard.js" \
  "netlify/functions/media-update.js" \
  "netlify/functions/media-delete.js" \
  "netlify/functions/items-save.js" \
  "src/lib/auth-context.jsx" \
  "src/components/auth/passcode-gate.jsx" \
  "src/lib/media.js" \
  "src/lib/items.js" \
  "docs/BUILD_LOG.md"

git commit -m "fix(security): Cloudinary-rewrite endpoints require CST/client-admin auth

media-update, media-delete, and items-save called the Cloudinary Admin API safely server-side
but had NO check on the caller — client-side role gates only hid UI buttons; the raw function
URLs rewrote/deleted assets with zero auth (found while fixing the image manifest this session).

- _write-guard.js (new, helper only): requireWriteAuth(event) — same shared-passcode model as
  gate.js, replays the x-portal-passcode header (mirrors the existing x-publish-secret pattern).
  Accepts house or admin passcode only, NOT the base client passcode.
- media-update.js / media-delete.js / items-save.js: call the guard first, 401 if missing/wrong.
- auth-context.jsx: unlock(role, code) stashes the raw passcode so writes can replay it;
  writeAuthHeader() exported for call sites; passcode-gate.jsx passes the code through.
- media.js / items.js: write calls attach writeAuthHeader(); canManageMedia/canManageItems
  tightened to admin-or-client-admin (matches what the server now actually allows).

Known gap: only covers passcode auth mode (the live mode) — identity mode has no equivalent
check yet. Noted in BUILD_LOG for whenever that switch might happen."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "⚠️  Test in Media Hub afterward: edit/link/delete an asset with your normal passcode."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
