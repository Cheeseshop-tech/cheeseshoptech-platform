#!/bin/bash
# Double-click to deploy: pushes committed changes to GitHub, which triggers a Netlify build.
cd "$(dirname "$0")" || exit 1
echo "Pushing committed changes to GitHub (this triggers a Netlify deploy)…"
echo
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is now building — watch the Deploys tab; it goes live in ~1–2 min."
else
  echo "⚠️  Push failed (status $status). If it asks for GitHub login, sign in and run again."
fi
echo
echo "You can close this window."
read -n 1 -s -r -p "Press any key to close…"
