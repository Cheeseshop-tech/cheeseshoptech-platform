#!/bin/bash
# COMMIT DEPLOY VERIFICATION GUARDRAIL — 2026-08-17
# Double-click to commit and push.
#
# DOC-ONLY CHANGE — no code touched, no rebuild/redeploy needed for this one.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Document the 'confirm deploy after push' guardrail"
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
  "CLAUDE_CODE_BRIEF.md" \
  "COMMIT DEPLOY VERIFICATION GUARDRAIL.command"
if [ $? -ne 0 ]; then
  echo; echo "❌ git add FAILED — nothing committed."; echo
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: add guardrail #7 -- confirm Netlify deploy fired after every push

Rick's question: 'do I hit deploy every time, if so write it in the process.'

Answer: normally NO. Auto-publish is on for this repo and correctly built+published
4-5 straight commits earlier today without any manual step. But it is not
guaranteed -- the GitHub -> Netlify webhook silently failed to fire for commit
74864cc (the Recap/Gmail-origin fix): git confirmed the push reached GitHub fine
(HEAD == origin/phase-2-6-build), yet Netlify's Deploys page showed no deploy row
for that commit at all, only the prior one. Manually triggering it (Netlify UI ->
Deploys -> Trigger deploy -> Deploy project) was required to actually ship the code.

Added as guardrail #7 in CLAUDE_CODE_BRIEF.md section 2: after every push, check
Netlify's Deploys page for a row matching the new commit hash within ~2 minutes;
trigger manually if it's missing. Also folds in the existing bundle-hash
false-positive trap (changed filename hash isn't proof of a new build -- confirm a
literal string from the actual code change is present in the live bundle) as a
cross-reference to docs/HANDOFF_2026-08-16_crm-hubspot-close-out.md section 3."
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
echo "✅ Pushed. Doc-only change -- no rebuild needed, but per the new guardrail,"
echo "   still worth a glance at Netlify's Deploys page to confirm a row shows up."
echo
read -n 1 -s -r -p "Press any key to close..."
