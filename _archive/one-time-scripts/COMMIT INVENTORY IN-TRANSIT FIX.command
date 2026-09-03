#!/bin/bash
# Commits the in-transit parsing fix + guards. Double-click to run.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

# This mount can create but not delete git lock files — move them aside first.
mkdir -p _to_delete/git-stale
for f in .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock; do
  [ -e "$f" ] && mv "$f" "_to_delete/git-stale/$(basename "$f").$(date +%s)"
done

git add scripts/sync-inventory.mjs src/data/montitrentini/inventory.json docs/DATA_UPDATES.md
git commit -m "inventory: fix in-transit cases silently parsing as 0 ('#60' prefix)

The availability sheet began writing in-transit case counts as '#60' in the
2026-08-15 drop. Number('#60') is NaN, so intOr0 turned every in-transit lot
into 0 cases. Effect: 4,252 cases across 21 SKUs were invisible to the app for
~13 days. Sellable-now and quoting were NOT affected (allocate() excludes
in-transit by design); 'cases on the water', the arriving-SKU count and
forecast supply all read zero.

- num(): strip a leading # before parsing.
- validate(): hard-fail if in-transit lots exist but total in-transit cases
  is 0 — this class of bug must never publish silently again.
- diffVsCanon(): treat an in-transit change as a real change, so a new
  container promotes and publishes even when sellable-now is unchanged."

echo
echo "--- last 3 commits ---"
git log --oneline -3

# Clear any locks this run created, so the next one starts clean.
for f in .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock; do
  [ -e "$f" ] && mv "$f" "_to_delete/git-stale/$(basename "$f").$(date +%s)"
done

echo
echo "Committed locally. NOT pushed — pushing triggers a rebuild we don't need,"
echo "since inventory publishes to the live store directly."
echo
read -p "Press Return to close."
