#!/bin/bash
# Double-click this file to commit and push the "Greet to Meet" rename.
# You don't need to type anything — this window will do it and tell you when it's done.
cd "$(dirname "$0")" || exit 1

echo "Committing and pushing the Greet to Meet rename (this is what makes Netlify deploy it)…"
echo

# Self-heal any stranded lock first (harmless if none exist).
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add "config/clients/montitrentini.json" "src/components/tools/booth-tool.jsx" "src/components/crm/crm-page.jsx" "src/components/home/agency-console.jsx" "COMMIT GREET TO MEET RENAME.command"
commit_status=$?

git commit -m "rename: Booth to Meeting -> Greet to Meet (user-facing only)

Rick's naming brief: it turns a greeting into a meeting — a chance
encounter during the business day, or a planned industry show / cocktail
hour. Renamed every place a user actually sees the name:
  - the nav tile label + description (config/clients/montitrentini.json)
  - the in-tool page header (booth-tool.jsx)
  - the CRM tab's cross-link button (crm-page.jsx)
  - the Agency Console's Booth->HubSpot activity panel title (agency-console.jsx)

Left everything internal untouched on purpose: file names (booth.js,
booth-tool.jsx), the BoothTool component name, localStorage keys
(cst.booth.<tenant>...), the Netlify function (booth-history.js), and
code comments. Renaming those is a mechanical, higher-risk refactor with
zero user-visible benefit, and the localStorage keys are versioned —
touching them risks orphaning already-captured offline data on reps'
devices. Display name and internal module name diverging is the existing
pattern elsewhere in the app (Priority card is attention.js under the
hood, CRM tile is HubSpot underneath).

Verified: eslint clean (only pre-existing warnings), vite build clean,
JSON validated."
commit_result=$?

echo
if [ $commit_result -ne 0 ]; then
  echo "⚠️  Commit failed (exit code $commit_result) — nothing was pushed. Take a screenshot of this window and send it back."
  echo
  read -n 1 -s -r -p "Press any key to close this window…"
  echo
  exit 1
fi

git push origin phase-2-6-build
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Committed and pushed. Netlify is building now — live in ~1–2 minutes."
  echo "   Check: https://app.netlify.com/sites/cheeseshoptech-platform/deploys"
else
  echo "⚠️  Push failed (exit code $status). Take a screenshot of this window and send it back."
fi
echo
read -n 1 -s -r -p "Press any key to close this window…"
echo
