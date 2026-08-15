#!/bin/bash
# COMMIT PHOTO SERIES MIGRATION PLAN — expand/contract plan for typed, ordered SKU photo series
# Double-click to commit and push. Docs only — no code changes.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Photo series migration plan"
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
  "docs/IMAGE_PIPELINE_SPEC.md" \
  "docs/BACKLOG.md" \
  "CLAUDE.md" \
  "COMMIT PHOTO SERIES MIGRATION PLAN.command"
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
git commit -m "docs: plan the one-image-per-code -> typed, ordered photo series migration

Plans the move CLAUDE.md commits to (pack shot / beauty / styled series per SKU)
as expand -> adapter -> contract, so imageForCode's four consumers (Catalog,
Proposals, Pricing, Studio Director) migrate one deploy at a time instead of
breaking together. No code changes.

- IMAGE_PIPELINE_SPEC.md — new 'Migration plan' section: sync-images.mjs adds
  optional type/order fields (untyped records get no type key, so untagged stays
  distinct from confirmed packshot); add imagesForCode() alongside; reduce
  imageForCode() to imagesForCode(...)[0] so codeImageUrl() and
  isPlaceholderImage() need no edit; migrate consumers individually; drop the
  adapter in its own commit. Adds acceptance criteria, including a deliberate
  winner for the four double-packshot SKUs in IMAGE_HEALTH_2026-07-09.md.
- BACKLOG.md — [high/med] item under Next.
- CLAUDE.md — TRIGGER block under the 2026-07-13 photo taxonomy entry, so a
  future session sees the warning before editing src/lib/images.js.

Rick's Cloudinary type-tagging pass is step 1 and can start now, ahead of any
code change — untyped records resolve exactly as they do today."
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
echo "✅ Pushed. Photo series migration plan is committed and on GitHub."
echo
read -n 1 -s -r -p "Press any key to close..."
