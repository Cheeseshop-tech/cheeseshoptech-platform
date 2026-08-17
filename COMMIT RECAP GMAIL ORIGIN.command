#!/bin/bash
# COMMIT RECAP GMAIL ORIGIN — 2026-08-17
# Double-click to commit and push.
#
# CODE CHANGE — run `npm run build` in Claude Code (NOT the Cowork sandbox, where node_modules
# is Linux-only and dist/ can't even be deleted here) before trusting this in production.
# Then verify on Netlify's own build log after push, same as the last two patches.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Recap now composes as Sales@montitrentini-Usa.com"
echo "=============================================="
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "src/lib/booth.js" \
  "src/components/tools/booth-tool.jsx" \
  "COMMIT RECAP GMAIL ORIGIN.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "feat(booth): Recap opens Gmail forced onto the tenant sales identity, not mailto:

Rick's ask: buyer recap emails need to originate from Sales@montitrentini-Usa.com every
time, not whatever personal account happens to be the default mail handler on a rep's own
device at a trade show. A plain mailto: link cannot do this -- no mail client honours a
From address in a mailto: URI, by design, so a rep picker could only ever be a reminder,
never a guarantee.

Reuses the identical trick already shipped for the Calendar button: googleCalendarUrl's
authuser= param, and the comment on it -- 'the rep is already signed into the sales@
account on the tablet.' Gmail's own web compose URL supports the same authuser= param, so
recapComposeUrl() (booth.js) forces Gmail to compose as calendar.address -- already
configured in config/clients/montitrentini.json as Sales@montitrentini-Usa.com -- when
calendar.provider is 'google'. No new credentials, no new infrastructure, no per-rep
identity system: reuses config that already existed for exactly this purpose.

Any tenant without that calendar identity configured keeps today's plain mailto:
(recapMailto, unchanged) as a safe fallback.

Side benefit: this also fixes the original 'Recap does nothing when clicked' report --
Gmail compose is a real https:// URL opened in a new tab (same window.open() the Calendar
button already uses), not a native-app handoff that silently no-ops when a device has no
default mail app configured.

Contact ownership ('assign contact after,' Rick's words): unchanged. crm-push.js already
does not set hubspot_owner_id on push -- Stefano/Rick claim contacts in HubSpot afterward,
same as today.

Depends on the booth device already being signed into Sales@montitrentini-Usa.com in
Google -- same assumption the Calendar button has relied on since it shipped. If that
session isn't there, Gmail shows its own account picker instead of composing silently
wrong, which is a visible failure mode rather than today's silent one."
if [ $? -ne 0 ]; then
  echo; echo "❌ COMMIT FAILED (or nothing to commit)."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo; echo "❌ PUSH FAILED — commit exists locally but did NOT reach GitHub."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo
echo "✅ Pushed. Remember: this needs a Netlify build to reach production (git push alone"
echo "   triggers one automatically on this repo — confirm on the Deploys page)."
echo
read -n 1 -s -r -p "Press any key to close..."
