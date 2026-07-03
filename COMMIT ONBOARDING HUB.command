#!/bin/bash
# Double-click to commit + push: house Onboarding Hub (template apps + kit downloads on cheeseshoptech.com).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/home/onboarding-hub.jsx" \
  "src/components/home/home-hub.jsx" \
  "public/onboarding-kit" \
  "onboarding-kit" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT ONBOARDING HUB.command"

git commit -m "feat(house): Onboarding Hub on the Command Center

- new src/components/home/onboarding-hub.jsx: cheeseshoptech.com house dashboard =
  the new-client onboarding hub. Template app cards sourced from _template.json
  (THE CLONE) — each opens the content-free demo tenant (?client=demo&page=<route>)
  so a prospect/new client sees exactly what they get, empty; 'Open the template
  portal' launcher; intake-kit download tiles (7 files, owners labeled)
- onboarding kit published at public/onboarding-kit/ (blank templates, safe public;
  the hub page itself sits behind the house gate)
- home-hub.jsx: hub visible to admin OR client-admin sessions at the house door;
  Agency Console stays admin-only
- kit README contact -> hello@cheeseshoptech.com (live Google Workspace address)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: cheeseshoptech.com/?app=1 → 'Template apps' section + kit downloads."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
