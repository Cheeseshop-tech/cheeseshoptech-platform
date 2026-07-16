#!/bin/bash
# Double-click to fix the stuck git lock and push to deploy.
# 1) Removes stale .git lock files (index.lock, HEAD.lock, packed-refs.lock) that block commits
#    — HEAD.lock added 2026-07-16 after it blocked a commit the same way index.lock did on 7/15.
# 2) Pushes committed work to GitHub (triggers the Netlify build)
cd "$(dirname "$0")" || exit 1

if pgrep -x git >/dev/null 2>&1; then
  echo "⚠️  A git process is actually running right now — not touching lock files."
  echo "    Close it (or wait), then run this again."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

cleaned=0
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    # Only safe because no git process is running; the lock is a leftover from a crashed one.
    rm -f "$lock" && { echo "✅ Removed stale $lock"; cleaned=1; } || echo "⚠️  Could not remove $lock — run: sudo rm $lock"
  fi
done
[ $cleaned -eq 0 ] && echo "No lock files present — already clean."

echo
echo "Pushing committed changes to GitHub (this triggers a Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
else
  echo "⚠️  Push failed (status $status). If it asks for GitHub login, sign in and run again."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
