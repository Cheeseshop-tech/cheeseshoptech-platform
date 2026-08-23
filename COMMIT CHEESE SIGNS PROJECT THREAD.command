#!/bin/bash
# COMMIT CHEESE SIGNS PROJECT THREAD — register Cheese Signs as a tracked project in the
# accountability system: a full section in docs/PROJECT_ROADMAP.md plus its mirror entry in
# src/lib/project-status.js, so it shows up in the Agency Console's Project status panel.
# Also surfaces the platform-wide brand-type finding on the radar list. Double-click to
# commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Cheese Signs — tracked project thread"
echo "=============================================="
echo
read -n 1 -s -r -p "Press any key to continue, or Ctrl-C to cancel..."
echo
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock .git/objects/maintenance.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "docs/PROJECT_ROADMAP.md" \
  "src/lib/project-status.js" \
  "design/cheese-signs/cheese-signs-composition-studio.html" \
  "design/cheese-signs/studio.py" \
  "design/cheese-signs/brand/cow_logo.png" \
  "COMMIT CHEESE SIGNS PROJECT THREAD.command"
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
git commit -m "Cheese Signs: register as a tracked project thread + composition round

Rick, 2026-08-23: 'create a new project for Cheese Signs.' Per the accountability
system built on 8/17, that means a thread in docs/PROJECT_ROADMAP.md with a real
Next concrete action -- not a folder -- plus its hand-maintained mirror in
src/lib/project-status.js so the Agency Console's Project status panel shows it.

Roadmap section covers: what the signs are and why they are the Content Engine's
first retail-facing physical output; the locked decisions (one sign per CHEESE not
per SKU, two sizes x two modes, no price zone in v1); what is built and verified;
the QR weak link; and what is blocked on Stefano.

Mirror entry: cheese-signs, in-progress, 45%. Next action is picking a composition,
then sending Stefano the two questions that gate printing.

Also carries the composition round: six layouts of the same cheese (A Band, B Green
cap, C Photo hero, D Oval medallion, E Left rail, F Type first), each repeated on
two other cheeses, with a knob-by-knob table of every adjustable parameter.

Three Brand Kit corrections came out of building it, and they are platform-wide,
not sign-specific -- the first is now on the PROJECT_RADAR list so it does not get
buried inside a signs thread:

1. The whole app renders in FALLBACK type. brand-kit.json names Cora + Futura PT
   but no Adobe Fonts kit is loaded anywhere in the repo, so everything falls back
   to Fraunces/Inter. Kit sac6xdz now exists covering both; one <link> in
   index.html fixes it, pending a domain-authorisation check on the live domain.
2. Wrong ground color -- the kit's primary page background is Heritage Cream
   #FFFBDC; Casa Paper #FAF9F5 is the secondary card canvas.
3. The official logo already contains the black-and-white spotted cow. The sign's
   milk icon is now that cow, extracted from the logo artwork rather than drawn
   fresh (design/cheese-signs/brand/cow_logo.png).

Build verified clean (2052 modules, no errors) after the project-status.js edit." \
  -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo "   NOTE: a double-clicked .command can fire twice; verify with 'git log' before"
  echo "   believing this message."
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
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Once Netlify rebuilds, sign in as admin and check the Agency Console:"
echo "   the Project status panel should now list FIVE threads, with 'Cheese Signs —"
echo "   printed retail signage' at 45%, and a new radar line about brand type running"
echo "   on fallbacks."
echo
read -n 1 -s -r -p "Press any key to close..."
