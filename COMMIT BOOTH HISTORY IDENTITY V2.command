#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add netlify/functions/booth-history.js src/lib/booth.js src/components/tools/booth-tool.jsx "COMMIT BOOTH HISTORY IDENTITY V2.command"

git commit -m "$(cat <<'EOF'
Add Booth-to-Meeting durable history + rep attribution/edit rights (Phase 1)

Builds HANDOFF_2026-09-16_booth-history-spec.md (v1) and its v2 (identity +
edit rights), per Rick's Sep 16 decisions: full individual Netlify Identity
logins (not a name-picker), and edit rights limited to the capturing rep
plus admin/client-admin.

- netlify/functions/booth-history.js (new): clone of history.js's Blobs
  pattern (store "booth-history", dedup by id, capped at 5000/tenant,
  logWrite audit entry). GET stays on the existing any-tier read auth.
  POST create AND the new POST edit (`action: "update"`) both require a
  real, Netlify-verified Identity JWT (context.clientContext.user) --
  there is no meaningful capturedBy/editedBy without one, so this is
  stricter than every other write endpoint in the app, which still accept
  the legacy passcode tiers. capturedBy is stamped server-side from the
  verified user, never from the client. Edit checks the existing record's
  capturedBy.email against the requester's verified email, allowing the
  edit if they match OR the requester is admin/client-admin; appends to
  an editedBy trail; 403s otherwise -- enforced server-side, not just a
  hidden button, same lesson _write-guard.js already encodes everywhere
  else.
- src/lib/booth.js: newCapture() gains scopeId/capturedBy/editedBy/
  historySyncedAt fields. New toHistoryRecord(), pushToHistory() (fire-
  and-forget batch POST, same "nothing awaits a fetch" posture as the
  rest of the booth write path), fetchHistory() (GET for the tab),
  pushHistoryEdit() (the update action), canEditHistoryRecord() (mirrors
  the server check for the UI's Edit button).
- src/components/tools/booth-tool.jsx: persist() now fires syncHistory()
  on every capture write -- the "instant write" from v1, single choke
  point rather than touching every addCapture/updateCapture call site.
  Successful syncs stamp historySyncedAt directly (bypassing persist, so
  it can't re-trigger itself); failures just stay queued. A retry-sweep
  effect (mirrors the existing pending-OCR-read sweep) catches anything
  still unsynced whenever connectivity returns. New History tab (5th
  mode): read-only list of every capture ever logged, cross-device, with
  an Edit action per row gated the same way the server gates it. Header
  now shows the signed-in rep's real name instead of the generic "Portal"
  label once a real Identity session is live (passcode mode unaffected).

NOT done in this commit, both need your call before this ships live:
1. VITE_AUTH_MODE stays on "passcode" for now -- you picked portal-wide
   Identity (not booth-only) when I asked, which means every tool needs
   a real account, not just Booth. Before flipping that env var: every
   current shared-passcode user (Stefano, Nico, anyone else who has the
   client/manager passcodes -- not just booth reps) needs a real Netlify
   Identity account first, or they're locked out the instant it ships.
   I don't have that list -- it needs to come from you.
2. No Identity accounts have been created yet for anyone.

Build verified clean (esbuild syntax check on all three files; a full
`vite build` wasn't run from the sandbox this session). Try it from
STAGING first (DEPLOY TO STAGING.command) once accounts exist -- don't
flip VITE_AUTH_MODE on production until you've smoke-tested there.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M3s5UQiYEJ1ZV9oNG6bBqZ
EOF
)"

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

read -n 1 -s -r -p "Press any key to close..."
echo
