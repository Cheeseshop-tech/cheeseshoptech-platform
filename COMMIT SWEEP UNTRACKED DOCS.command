#!/bin/bash
# Double-click to commit + push: post-close sweep of untracked docs (2026-07-15 22:40).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

# Self-heal any stranded sandbox lock first (sandbox can create but not delete them).
for f in .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock; do
  [ -f "$f" ] && rm -f "$f" && echo "Cleared stale $f"
done

git add "CLAUDE.md" \
        "docs/MARKETING_IMAGE_REQUEST_2026-07-13.md" \
        "docs/MARKETING_IMAGE_REQUEST_2026-07-13.csv" \
        "COMMIT LOGIN DIAGNOSIS.command" \
        "COMMIT SWEEP UNTRACKED DOCS.command" \
        ".gitignore" \
        "HANDOFF.md" \
        "docs/BUILD_LOG.md" \
        src/archive/backup_2026-07-09_inventory_autosync \
        src/archive/backup_2026-07-10_inventory_autosync \
        src/archive/backup_2026-07-14_inventory_autosync

git commit -m "docs: post-close sweep — commit CLAUDE.md + marketing image request + stragglers

- CLAUDE.md: project working memory, read-first every session, was never in git
- docs/MARKETING_IMAGE_REQUEST_2026-07-13.md/.csv: referenced from CLAUDE.md key-docs index
- COMMIT LOGIN DIAGNOSIS.command: never run; payload landed via later HANDOFF commits, kept for record
- 3 inventory-autosync backups (07-09/-10/-14) to match earlier committed backups
- .gitignore: exclude ~\$* Office temp-lock files
- HANDOFF.md + BUILD_LOG.md: correct 'nothing uncommitted' claim; close check now includes
  git status --porcelain, not just HEAD==origin"

# Hardened per 2026-07-15 git-lock incident: verify the COMMIT itself, not just the push.
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED — check for a stale .git/*.lock file (see HANDOFF git-lock incident)."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/phase-2-6-build)" ]; then
  echo "✅ Committed AND pushed — HEAD matches origin/phase-2-6-build."
else
  echo "❌ Push failed or HEAD != origin. Run: git push"
fi
read -n 1 -s -r -p "Press any key to close…"
