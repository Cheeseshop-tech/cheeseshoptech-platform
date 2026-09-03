#!/bin/bash
cd "$(dirname "$0")"

# Clear any stale git lock (safe if none exists)
rm -f .git/index.lock

echo "Staging..."
git add \
  src/components/catalog/buyer-catalog.jsx \
  docs/BUILD_LOG.md \
  "COMMIT CATALOG ALPHABETICAL SORT.command"

echo "Committing..."
git commit -m "feat(catalog): Product Catalog now loads alphabetically by product name

Rows previously inherited listItems()'s own order (by item number/SKU), which mirrors the
price sheet -- needed for the Media Hub's Items tab, but not what buyers browsing the Catalog
want. Sort now happens locally in buyer-catalog.jsx by product name instead, so the Items tab
is untouched. Category counts, search, and pagination all read from the sorted rows.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo "✅ Commit created."
  echo ""
  echo "Pushing to remote..."
  git push
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pushed. Netlify will redeploy automatically."
  else
    echo "❌ Push failed — see error above."
  fi
else
  echo "❌ Commit failed — see error above."
fi

echo ""
echo "Press any key to close..."
read -n 1
