#!/bin/bash
cd "$(dirname "$0")" || exit 1

FILES=("src/data/montitrentini/images.json" ".gitignore" "REDIRECT ASIAGO VECCHIO SPEC SHEET.command")

# Check staged AND unstaged -- an earlier run may have already staged the manifest.
if [ -z "$(git status --porcelain -- "${FILES[@]}")" ]; then
  echo "Nothing to commit -- the redirect has not been applied yet."
  echo "Run REDIRECT ASIAGO VECCHIO SPEC SHEET.command first."
  echo; read -n 1 -s -r -p "Press any key to close..."; exit 0
fi

git add "${FILES[@]}" || { echo "git add failed"; read -n 1 -s -r -p "Press any key to close..."; exit 1; }

git commit -m "$(cat <<'MSG'
Point the Asiago Vecchio Scheda at 03003 in the image manifest

The live write landed via scripts/reassign-asset-code.mjs, so this is the
repo catching up. monti/03073-specsheet now carries item 03003: the whole
wheel card shows the spec sheet, and the 7 oz EW card shows none -- the
honest state until Monti sends 03073's own sheet.

Also logs the redirect button's output to _archive/logs/ (gitignored) so a
failed run is diagnosable instead of vanishing with the window.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01N8eQjXXZQwwzWpZdkCZMNk
MSG
)" || { echo "git commit failed -- see above"; read -n 1 -s -r -p "Press any key to close..."; exit 1; }

git push || { echo "git push failed -- see above"; read -n 1 -s -r -p "Press any key to close..."; exit 1; }

mkdir -p _archive/one-time-scripts
git mv "REDIRECT ASIAGO VECCHIO SPEC SHEET.command" "_archive/one-time-scripts/REDIRECT ASIAGO VECCHIO SPEC SHEET.command" 2>/dev/null
rm -f "COMMIT ASIAGO SPEC SHEET REDIRECT.command"
if [ -n "$(git diff --cached --name-only)" ]; then
  git commit -q -m "$(cat <<'MSG'
Archive the Asiago spec sheet redirect button

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01N8eQjXXZQwwzWpZdkCZMNk
MSG
)" && git push -q
fi

echo
echo "DONE -- pushed, and the spent buttons are out of the root."
echo
read -n 1 -s -r -p "Press any key to close..."
echo
