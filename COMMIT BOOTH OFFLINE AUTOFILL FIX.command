#!/bin/bash
# COMMIT BOOTH OFFLINE AUTOFILL FIX — background retry sweep now updates the open sheet
# Rick: "card reader not filling in detail in form on Booth to meeting."

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Booth offline-retry sheet sync fix"
echo "=============================================="
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "src/components/tools/booth-tool.jsx" \
  "COMMIT BOOTH OFFLINE AUTOFILL FIX.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "Booth: sync the background offline-retry sweep back into the open sheet

Rick: \"card reader not filling in detail in form on Booth to meeting.\"

THE BUG. bad89f7 fixed autofill for the two scans that happen while a rep
is looking at the sheet (the initial capture, and a manual rescan) — both
go through applyScanResult(), which calls setSheet() on the result. But
there's a THIRD path: the background sweep (useEffect around 'online')
that catches anything left in scanState 'pending' — most commonly a card
shot with no signal, which is the exact condition Booth is designed to
survive. That sweep only ever called persist(updateCapture(...)) to write
the result to storage. It never touched 'sheet', the separate piece of
component state the open CaptureSheet actually renders. So if a rep shot
a card with weak booth wifi, kept the sheet open, and connectivity came
back a few seconds later, the read completed correctly in storage — but
the visible form never heard about it. Same failure shape as the original
bug (a prop the sheet needed never arrived), one level further back.

Fixed by mirroring every persisted patch from the sweep into 'sheet' via
a functional update guarded by capture id, so the sheet — if it's showing
this same capture — updates the instant the sweep does. Covers all three
outcomes the sweep can reach: read (fields fill in), illegible, and
failed (no photo). CaptureSheet's existing prop-adoption effect (still
merging only empty fields, never overwriting a human) does the rest with
no changes needed there.

Verified: esbuild parses the file clean; diff is scoped to the one
useEffect, no other logic touched."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo "   If it says 'nothing to commit', this work may already be committed."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   Check your connection, then double-click 'FIX GIT LOCK AND PUSH.command'"
  echo "   (or re-run this file) to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Booth offline-autofill fix is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
