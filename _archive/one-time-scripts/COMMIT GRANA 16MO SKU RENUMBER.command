#!/bin/bash
# COMMIT GRANA 16MO SKU RENUMBER — catalog.json 05018 -> 05417
# Monti Trentini renumbered "Grana Padano Riserva, 1/8 wheel, 16 months" from
# 05018 (dead since 2024, sheet marks it "not interesting for the stock") to
# 05417, which is the code the availability sheet has actually been using
# since at least mid-June. catalog.json still had the old dead code, so the
# Pricing app could never show this item's real stock (currently 19 cases,
# lot 1316563, exp 2027-03-12) no matter how fresh the inventory sync ran.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Grana 16mo SKU renumber (05018 -> 05417)"
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
  "src/data/montitrentini/catalog.json" \
  "COMMIT GRANA 16MO SKU RENUMBER.command"
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
git commit -m "catalog: renumber Grana Padano Riserva 1/8 wheel 16mo, 05018 -> 05417

Rick spotted that Monti Trentini's availability sheet has been reporting
this item under 05417 since at least 2026-06-18, while catalog.json (the
Pricing app's pricing source of truth) still only had the old code 05018.
The sheet itself flags 05018 as dead (\"not interesting for the stock
2024\"), so the app was always going to show 0/unavailable for this
product regardless of how current the inventory sync was — it was
looking up a code Monti stopped using.

Same physical product (1/8 wheel, vacuum packed, min. 16 months ageing,
confirmed by Rick) — code changed only, pack/cost/image untouched. Image
key stays 05018 since that's the Cloudinary asset name, decoupled from
the pricing SKU code.

Diagnosed same session as a related but distinct finding: the daily
monti-inventory-watch scheduled task isn't currently registered as an
active recurring task, and there's no automated cross-check today
between inventory codes and catalog.json codes — both still open,
tracked in project memory (monti-inventory-pricing-app-gap.md)."
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
echo "✅ Pushed. Grana 16mo SKU fix is committed and on GitHub."
echo "   Netlify will deploy it automatically."
echo
read -n 1 -s -r -p "Press any key to close..."
