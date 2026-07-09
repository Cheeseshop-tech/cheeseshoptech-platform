#!/bin/bash
# Double-click to commit + push: route access-request notifications to hello@, not admin@.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "docs/BUILD_LOG.md" \
  "COMMIT REQUEST ACCESS.command"

git commit -m "docs: route access-request notifications to hello@, keep admin@ as displayed copy

Rick's call: no paid admin@cheeseshoptech.com mailbox yet while managing expenses pre-client-#1.
Netlify Form notification for 'access-request' should point to hello@cheeseshoptech.com (his
real inbox). The form's own text still tells the requester it goes to admin@cheeseshoptech.com
— cosmetic only, swap the Netlify notification target later if/when admin@ becomes real. No
app code changed; this is docs + the commit-button instructions only."

echo
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed."
  echo "Netlify dashboard reminder: Site settings -> Forms -> Form notifications -> add"
  echo "an email notification to hello@cheeseshoptech.com for the 'access-request' form."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
