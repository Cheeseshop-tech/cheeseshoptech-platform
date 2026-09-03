#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add \
  netlify/functions/items-get.js \
  netlify/functions/media-list.js \
  netlify/functions/items-save.js \
  netlify/functions/media-update.js \
  netlify/functions/media-delete.js \
  src/lib/items.js \
  src/lib/media.js \
  src/components/catalog/buyer-catalog.jsx \
  src/lib/use-items-doc.js \
  src/components/media/media-picker.jsx \
  src/lib/studio-director.js \
  src/components/media/items-panel.jsx \
  src/components/media/media-hub.jsx \
  netlify/functions/_login-log.js \
  src/components/home/agency-console.jsx \
  docs/BUILD_LOG.md \
  "COMMIT LOGIN ACCESS LOG.command" \
  "COMMIT CATALOG AUTH FIX.command"

echo "Committing..."
git commit -m "fix(auth): per-tenant manager passcode couldn't read/write Media Hub or Catalog data

Root cause (found live-testing the new Monti Trentini manager passcode): items-get.js and
media-list.js derived the tenant via tenantFromPath(folder), which only matches a
'clients/<slug>' path -- but folder is always a bare Cloudinary name like 'monti-trentini', so it
never matched and the per-tenant admin passcode could never authorize the read. items-save.js,
media-update.js, and media-delete.js were worse -- they checked auth with NO tenant argument at
all, so a per-tenant passcode could never save an item, edit a photo, or delete an asset either.

Fix: explicit tenant param (config id/subdomain, e.g. 'montitrentini' -- distinct from the
Cloudinary folder) sent by the frontend and read server-side, matching the pattern already used
by crm-summary.js/crm-hubspot.js/inventory.js/history.js. Every call site updated to pass
resolved.id through. Verified with node --check on all five functions and a clean vite build.

Also finishes an already-coded, previously uncommitted feature: city/state IP lookup (ipwho.is)
on the login-access log Rick asked for earlier today, plus its Agency Console Location column.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Netlify will redeploy automatically."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
