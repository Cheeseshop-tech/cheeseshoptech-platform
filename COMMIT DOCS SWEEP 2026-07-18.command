#!/bin/bash
# COMMIT DOCS SWEEP 2026-07-18 — SKU match review + cost/image/marketing docs + autosync backup
# Double-click to commit and push. No code changes — docs and working files only.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Docs sweep 2026-07-18"
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
  "Monti_Trentini_SKU_Match_Review.xlsx" \
  "docs/CST_App_Cost_Audit_2026-07-17.xlsx" \
  "docs/CST_Cost_Report_2026-07-17.docx" \
  "docs/Image_Health_Report_2026-07-09.docx" \
  "docs/Marketing_Image_Request_2026-07-13.docx" \
  "src/archive/backup_2026-07-17_inventory_autosync/" \
  "COMMIT DOCS SWEEP 2026-07-18.command"
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
git commit -m "docs: sweep 2026-07-18 — SKU match review, app cost audit, image health + marketing image request, autosync backup

- Monti_Trentini_SKU_Match_Review.xlsx — Rick's manual item-number tagging pass
- CST_App_Cost_Audit_2026-07-17.xlsx / CST_Cost_Report_2026-07-17.docx — app cost audit deliverables
- Image_Health_Report_2026-07-09.docx — packshot inventory/quality report
- Marketing_Image_Request_2026-07-13.docx — missing/replacement image request
- src/archive/backup_2026-07-17_inventory_autosync/ — autosync backup, no code changes"
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
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
  echo "   Check your connection, then re-run this file to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Docs sweep is committed and on GitHub."
echo
read -n 1 -s -r -p "Press any key to close..."
