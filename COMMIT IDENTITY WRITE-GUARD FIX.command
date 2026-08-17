#!/bin/bash
# COMMIT IDENTITY WRITE-GUARD FIX — 2026-08-17
# Double-click to commit and push.
#
# REAL CODE CHANGE — touches Netlify Functions + client fetch calls. Netlify will auto-build
# and redeploy on push, same as any other push. Do NOT treat this as a doc-only change.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: wire real Identity auth into write/read functions"
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
  "docs/BUILD_LOG.md" \
  "docs/HANDOFF_2026-08-17_identity-write-guard-fix.md" \
  "netlify/functions/_write-guard.js" \
  "netlify/functions/ai-compose.js" \
  "netlify/functions/campaign-content.js" \
  "netlify/functions/campaign-enrichment.js" \
  "netlify/functions/campaign-state.js" \
  "netlify/functions/content-library.js" \
  "netlify/functions/crm-hubspot.js" \
  "netlify/functions/crm-outreach.js" \
  "netlify/functions/crm-push.js" \
  "netlify/functions/crm-summary.js" \
  "netlify/functions/history.js" \
  "netlify/functions/inventory.js" \
  "netlify/functions/items-get.js" \
  "netlify/functions/items-save.js" \
  "netlify/functions/login-log.js" \
  "netlify/functions/media-delete.js" \
  "netlify/functions/media-list.js" \
  "netlify/functions/media-update.js" \
  "netlify/functions/quotes.js" \
  "netlify/functions/write-log.js" \
  "src/components/home/agency-console.jsx" \
  "src/components/presentations/slide-studio.jsx" \
  "src/lib/auth-context.jsx" \
  "src/lib/booth.js" \
  "src/lib/campaigns.js" \
  "src/lib/crm.js" \
  "src/lib/history.js" \
  "src/lib/items.js" \
  "src/lib/media.js" \
  "src/lib/presentations-store.js" \
  "src/lib/pricing.js" \
  "src/lib/quotes-log.js" \
  "COMMIT IDENTITY WRITE-GUARD FIX.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "fix(auth): wire real Netlify Identity into every write/read function's guard

Fixing the passcode-gate/team-level-env-var issue earlier today (see docs/BUILD_LOG.md,
docs/HANDOFF_2026-08-17_identity-write-guard-fix.md) exposed a second, bigger problem:
every Netlify Function that reads or writes real data -- Media Hub, Items, CRM snapshot,
Login log, Inventory, History, Campaigns, Quotes, Presentations -- only ever trusted the
old shared passcode header (_write-guard.js). The portal has signed users in with real
Netlify Identity for a while, but writeAuthHeader() never sent anything outside passcode
mode, so a logged-in Identity session sent no credential these functions recognized. Now
that the passcode env vars are deleted, every one of those ~19 functions was 401ing for
everyone, confirmed live via the Agency Console's own Integration Health panel showing
\"HubSpot CRM: re-enter passcode\" -- with no passcode left to re-enter.

Fix follows the exact precedent already proven in card-ocr.js/card-scan.js (2026-08-07):
_write-guard.js's requireWriteAuth/requireReadAuth now check context.clientContext.user
FIRST (the Identity JWT Netlify itself verifies), deriving admin/client-admin/client from
the user's real role + tenant, before falling back to the legacy passcode check (now a
harmless no-op). All 19 calling functions updated to pass context through. Client side:
new authHeaders() helper in auth-context.jsx sends both credentials this session might
hold (identity token + legacy passcode); every writeAuthHeader()-only call site across
12 files switched to it.

Verified: full clean 'npm run build' (2050 modules) with zero errors, node --check clean
on every touched function file. NOT yet live-verified against a real login -- Rick's own
Identity account had never had a password confirmed (passcode mode was the only thing
actually used for two months); a reset was requested separately. Live test (Agency
Console Integration Health -> HubSpot CRM test button, an actual Media Hub/Items save)
still needs to happen post-deploy. Full resume detail if this needs picking back up:
docs/HANDOFF_2026-08-17_identity-write-guard-fix.md."
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
echo "✅ Pushed. Netlify will auto-build and redeploy from this push -- give it a couple"
echo "minutes, then log in for real and we'll live-test Media Hub / CRM snapshot together."
echo
read -n 1 -s -r -p "Press any key to close..."
