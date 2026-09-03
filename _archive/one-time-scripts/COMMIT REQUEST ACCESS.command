#!/bin/bash
# Double-click to commit + push: "Request access" form on the portal gate (Netlify Forms).
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "index.html" \
  "src/components/auth/request-access.jsx" \
  "src/components/auth/passcode-gate.jsx" \
  "docs/BUILD_LOG.md"

git commit -m "feat(auth): Request access form for broker/sales-rep tier (Netlify Forms)

No live 'client' tier passcode was actually in use for brokers/reps. Added a lightweight request
form rather than a self-serve account system (the passcode model has no per-user concept) —
requests land for admin@cheeseshoptech.com to review and manually hand out the right passcode.

- index.html: hidden static <form name=\"access-request\" data-netlify=\"true\"> so Netlify's
  build-time crawler registers the schema (a React-rendered form is invisible to it).
- request-access.jsx (new): the real form, submits via fetch to the SPA-forms pattern.
- passcode-gate.jsx: \"Don't have a passcode? Request access\" link on the client-facing gate.

ACTION NEEDED IN NETLIFY DASHBOARD (not code): Site settings -> Forms -> Form notifications ->
Add notification -> Email notification -> hello@cheeseshoptech.com (Rick's real inbox — the
form's displayed copy still says admin@cheeseshoptech.com on purpose, addable as a real mailbox
later without touching code), watching form 'access-request'. Without this, submissions land in
the Forms dashboard but nothing emails anyone."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "⚠️  Don't forget: Netlify dashboard -> Site settings -> Forms -> Form notifications"
  echo "   -> add an email notification to hello@cheeseshoptech.com for the 'access-request' form."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
