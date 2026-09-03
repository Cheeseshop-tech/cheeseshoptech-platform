#!/bin/bash
# COMMIT PROJECT ROADMAP AND ACCOUNTABILITY SYSTEM — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no app code touched, no rebuild/redeploy needed.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Project roadmap + progress-tab spec (accountability system)"
echo "=============================================="
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "docs/PROJECT_ROADMAP.md" \
  "docs/PROGRESS_TAB_SPEC_2026-08-17.md" \
  "COMMIT PROJECT ROADMAP AND ACCOUNTABILITY SYSTEM.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: add project roadmap + progress-tab spec (daily accountability system)

Rick's ask: he constantly proposes new projects with little continuity, and wants a daily
update + priority list to fix that -- one place every open thread lives, kept current,
that a recurring email reads from instead of relying on memory across sessions.

docs/PROJECT_ROADMAP.md is that place: a single Complete/In-progress/Spec'd/Idea map across
the four threads now on the table -- Security & Auth upgrade (flagged priority #1 per Rick's
2026-08-17 call), scale-to-10-clients infra, the D2C+wholesale ecommerce build (the
'jewel'), and ongoing Monti Trentini (client #1) operations -- each with a concrete next
action, not a vague goal. Synced against BUILD_LOG.md, CLAUDE_CODE_BRIEF.md, and every
relevant project-memory file as of this commit. Also flags that CLAUDE_CODE_BRIEF.md
section 3 ('CURRENT REAL STATE') is itself stale by about 2.5 months of shipped work --
this new doc is more current until that section gets refreshed in its own pass.

docs/PROGRESS_TAB_SPEC_2026-08-17.md specs (does not build) the in-app 'progress tab' Rick
asked for -- a real route in the CST platform, not a report, showing this same roadmap data
visually. Two views off one data source: an Agency Console (admin) view with every thread,
and a client-scoped view reused as the literal onboarding checklist for client #2 and
beyond. Sequenced to land after the Security & Auth upgrade, since it will eventually be
client-visible and should sit behind real per-user auth, not the shared passcode."
if [ $? -ne 0 ]; then
  echo; echo "❌ COMMIT FAILED (or nothing to commit)."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo; echo "❌ PUSH FAILED — commit exists locally but did NOT reach GitHub."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo
echo "✅ Pushed. Doc-only change -- no rebuild needed."
echo
read -n 1 -s -r -p "Press any key to close..."
