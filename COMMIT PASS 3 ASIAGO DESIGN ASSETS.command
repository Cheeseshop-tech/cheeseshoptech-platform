#!/bin/bash
# Pass 3 of 3 — Asiago wheel design assets. After this: git push (sends all passes).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock
git reset -q

echo "Staging..."
git add \
  .gitignore \
  design/asiago-wheel/asiago_wheel.blend \
  design/asiago-wheel/asiago_wheel.blend1 \
  design/asiago-wheel/cheeseshop_navwheel_chalk.html \
  "design/asiago-wheel/chalk_hero_render/chalk_wheel_hero.mp4" \
  design/asiago-wheel/chalk_test \
  design/asiago-wheel/conditioning \
  design/asiago-wheel/conditioning_v2

echo "Committing..."
git commit -m "design(asiago): chalk wheel hero render + nav-wheel prototype

Blender source updates (asiago_wheel.blend/.blend1), the finished chalk wheel
hero render (mp4, 0.7MB), chalk/conditioning test frames, and the
cheeseshop_navwheel_chalk.html interactive prototype.

.gitignore: exclude chalk_hero_render/frame_*.png — 112 intermediate render
frames (~103MB) reproducible from the .blend; the mp4 is the deliverable and
is kept. Keeps the repo (and this push) light.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017hEScbCoKJY28Po86fWj7h"

if [ $? -eq 0 ]; then
  echo "✅ Pass 3 committed."
  echo ""
  echo "All passes done — now run:  git push"
  echo "(or double-click any of your existing pushing COMMIT scripts' push step)"
  echo "Push sends 4 commits: the unpushed 07-23 auto-sync + passes 1-3."
  echo "Netlify redeploys automatically on push."
else
  echo "❌ Commit failed — see error above."
fi
echo ""
echo "Press any key to close..."
read -n 1
